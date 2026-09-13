import { fireEvent, render, screen } from "@testing-library/react";
import type * as React from "react";
import { useEffect } from "react";
import type { UseFormReturn } from "react-hook-form";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TransactionFormValues } from "@/components/transactions/TransactionFormFields";
import { AssetCategory, TransactionType } from "@/types/__generated__/graphql";

const mockNavigate = vi.fn();
const mockCreateTransaction = vi.fn();

vi.mock("@tanstack/react-router", () => ({
  createFileRoute: () => (options: unknown) => options,
  useNavigate: () => mockNavigate,
  useSearch: () => ({ contactId: "c-1" }),
  Link: ({ children, to }: { children: React.ReactNode; to: string }) => (
    <a href={to}>{children}</a>
  ),
}));

vi.mock("@/hooks/useTransactions", () => ({
  useTransactions: () => ({
    createTransaction: mockCreateTransaction,
    creating: false,
  }),
}));

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

vi.mock("@/components/transactions/TransactionFormFields", async () => {
  const actual = await vi.importActual<
    typeof import("@/components/transactions/TransactionFormFields")
  >("@/components/transactions/TransactionFormFields");
  return {
    ...actual,
    // Stands in for the real fields: sets a valid amount so the form's
    // "amount must be positive for funds" refine passes, without needing to
    // drive every real input in this route's own regression test.
    TransactionFormFields: ({ form }: { form: UseFormReturn<TransactionFormValues> }) => {
      useEffect(() => {
        form.setValue("amount", 50000);
      }, [form]);
      return <div data-testid="form-fields" />;
    },
  };
});

vi.mock("@/components/transactions/AllocationDialog", () => ({
  AllocationDialog: ({ open, mode }: { open: boolean; mode: string }) =>
    open ? <div data-testid="allocation-dialog">AllocationDialog mode={mode}</div> : null,
}));

import { toast } from "sonner";
import { NewTransactionPage } from "./new";

function renderPage() {
  return render(<NewTransactionPage />);
}

function submit() {
  fireEvent.click(screen.getByRole("button", { name: /create transaction/i }));
}

describe("NewTransactionPage — allocate-on-create prompt", () => {
  beforeEach(() => {
    mockNavigate.mockClear();
    mockCreateTransaction.mockReset();
    vi.mocked(toast.error).mockClear();
    vi.mocked(toast.success).mockClear();
  });

  it("prompts to allocate after creating an ESCROWED transaction, and 'Allocate now' opens the picker instead of navigating away", async () => {
    mockCreateTransaction.mockResolvedValue({
      data: {
        createTransaction: {
          id: "tx-1",
          type: TransactionType.Escrowed,
          category: AssetCategory.Funds,
          currency: "NGN",
          amount: 50000,
          remainingAmount: 50000,
          contact: { id: "c-1", name: "Ade" },
        },
      },
    });

    renderPage();
    submit();

    expect(await screen.findByText("Allocate this now?")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /allocate now/i }));

    // Regression: AlertDialogAction renders Radix's DialogPrimitive.Close, which
    // also closes the surrounding AlertDialog on click — without preventDefault()
    // that close fired the "not now" dismissal path (navigate away, clear
    // pendingAllocation) before AllocationDialog ever got to open.
    expect(await screen.findByTestId("allocation-dialog")).toBeInTheDocument();
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it("'Not now' navigates to the list without opening the allocation dialog", async () => {
    mockCreateTransaction.mockResolvedValue({
      data: {
        createTransaction: {
          id: "tx-1",
          type: TransactionType.Escrowed,
          category: AssetCategory.Funds,
          currency: "NGN",
          amount: 50000,
          remainingAmount: 50000,
          contact: { id: "c-1", name: "Ade" },
        },
      },
    });

    renderPage();
    submit();

    fireEvent.click(await screen.findByRole("button", { name: /not now/i }));

    expect(mockNavigate).toHaveBeenCalledWith({
      to: "/transactions",
      search: { tab: "funds" },
    });
    expect(screen.queryByTestId("allocation-dialog")).not.toBeInTheDocument();
  });

  it("navigates straight to the list for a type with no allocation eligibility (e.g. a gift)", async () => {
    mockCreateTransaction.mockResolvedValue({
      data: {
        createTransaction: {
          id: "tx-2",
          type: TransactionType.GiftGiven,
          category: AssetCategory.Funds,
          currency: "NGN",
          amount: 5000,
          remainingAmount: 0,
          contact: { id: "c-1", name: "Ade" },
        },
      },
    });

    renderPage();
    submit();

    await vi.waitFor(() => expect(mockNavigate).toHaveBeenCalled());
    expect(screen.queryByText("Allocate this now?")).not.toBeInTheDocument();
  });

  it("shows a user-facing error and does not navigate when transaction creation fails", async () => {
    mockCreateTransaction.mockRejectedValue(new Error("Something went wrong. Please try again."));

    renderPage();
    submit();

    await vi.waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith("Something went wrong. Please try again."),
    );
    expect(mockNavigate).not.toHaveBeenCalled();
  });
});
