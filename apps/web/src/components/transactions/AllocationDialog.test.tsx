import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AllocationDialog } from "@/components/transactions/AllocationDialog";
import { useAllocations } from "@/hooks/useAllocations";
import {
  GET_ALLOCATABLE_OBLIGATIONS,
  GET_AVAILABLE_CREDITS,
} from "@/lib/apollo/queries/transactions";

vi.mock("@/hooks/useAllocations", () => ({ useAllocations: vi.fn() }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

// The picker is the only Apollo consumer in this component; which document it
// asks for is exactly what distinguishes the two modes, so key the stub off
// the document identity rather than guessing at operation names.
const queryResults = new Map<unknown, { data: unknown; loading: boolean }>();
vi.mock("@apollo/client/react", () => ({
  useQuery: (document: unknown, options: { skip?: boolean }) => {
    if (options?.skip) return { data: undefined, loading: false };
    return queryResults.get(document) ?? { data: undefined, loading: false };
  },
}));

const OBLIGATIONS = [
  {
    id: "loan-1",
    type: "LOAN_GIVEN",
    currency: "NGN",
    date: "2026-01-10T00:00:00.000Z",
    remainingAmount: 200000,
    contact: { id: "c-musa", name: "Musa" },
  },
  {
    id: "loan-2",
    type: "LOAN_GIVEN",
    currency: "NGN",
    date: "2026-03-10T00:00:00.000Z",
    remainingAmount: 150000,
    contact: { id: "c-musa", name: "Musa" },
  },
  {
    id: "loan-3",
    type: "LOAN_GIVEN",
    currency: "NGN",
    date: "2026-06-10T00:00:00.000Z",
    remainingAmount: 150000,
    contact: { id: "c-musa", name: "Musa" },
  },
];

const CREDITS = [
  {
    id: "esc-1",
    type: "ESCROWED",
    currency: "NGN",
    date: "2026-09-01T00:00:00.000Z",
    remainingAmount: 500000,
    contact: { id: "c-musa", name: "Musa" },
  },
  {
    id: "esc-ade",
    type: "ESCROWED",
    currency: "NGN",
    date: "2026-09-02T00:00:00.000Z",
    remainingAmount: 100000,
    contact: { id: "c-ade", name: "Ade" },
  },
];

const allocateTransactions = vi.fn();

const ESCROW = { id: "esc-1", currency: "NGN", remainingAmount: 500000 };
const LOAN = { id: "loan-1", currency: "NGN", remainingAmount: 200000 };

const renderApply = (open = true) =>
  render(
    <AllocationDialog open={open} onOpenChange={vi.fn()} mode="applyCredit" transaction={ESCROW} />,
  );

/** The amount box only exists once a row is ticked. */
const tick = (label: RegExp) => fireEvent.click(screen.getByRole("checkbox", { name: label }));
const amountBox = (id: string) => screen.getByLabelText(`Amount to apply to ${id}`);
const applyButton = () => screen.getByRole("button", { name: "Apply" });

beforeEach(() => {
  vi.clearAllMocks();
  allocateTransactions.mockResolvedValue({});
  vi.mocked(useAllocations).mockReturnValue({
    allocateTransactions,
    allocating: false,
    reverseAllocation: vi.fn(),
    reversing: false,
  } as unknown as ReturnType<typeof useAllocations>);

  queryResults.clear();
  queryResults.set(GET_ALLOCATABLE_OBLIGATIONS, {
    data: { allocatableObligations: OBLIGATIONS },
    loading: false,
  });
  queryResults.set(GET_AVAILABLE_CREDITS, {
    data: { availableCredits: CREDITS },
    loading: false,
  });
});

describe("AllocationDialog — applyCredit mode", () => {
  it("lists obligations with their outstanding balance and the pool available", () => {
    renderApply();

    expect(screen.getByText("Apply to obligations")).toBeInTheDocument();
    expect(screen.getByText("₦500,000")).toBeInTheDocument();
    expect(screen.getByText("Outstanding ₦200,000")).toBeInTheDocument();
    expect(screen.getAllByText("Outstanding ₦150,000")).toHaveLength(2);
  });

  it("prefills a ticked row at min(pool, row outstanding)", () => {
    renderApply();
    tick(/loan given of ₦200,000/i);

    expect(amountBox("loan-1")).toHaveValue("₦200,000");
    expect(screen.getByText("Allocating ₦200,000")).toBeInTheDocument();
    expect(screen.getByText("Unallocated ₦300,000")).toBeInTheDocument();
    expect(applyButton()).toBeEnabled();
  });

  it("blocks submit when one row exceeds its own cap", () => {
    renderApply();
    tick(/loan given of ₦200,000/i);
    fireEvent.change(amountBox("loan-1"), { target: { value: "250000" } });

    expect(screen.getByText("Cannot exceed ₦200,000")).toBeInTheDocument();
    expect(applyButton()).toBeDisabled();
  });

  it("blocks submit when the ticked rows together exceed the pool", () => {
    // Pool of 100k against 200k + 150k of obligations: each row is individually
    // capped at 100k, so only the running total can catch this.
    render(
      <AllocationDialog
        open
        onOpenChange={vi.fn()}
        mode="applyCredit"
        transaction={{ id: "esc-small", currency: "NGN", remainingAmount: 100000 }}
      />,
    );

    tick(/loan given of ₦200,000/i);
    // Two rows share the ₦150,000 label; either will do here.
    fireEvent.click(screen.getAllByRole("checkbox", { name: /loan given of ₦150,000/i })[0]);

    expect(screen.getByText("Unallocated -₦100,000")).toBeInTheDocument();
    expect(applyButton()).toBeDisabled();
  });

  it("auto-fills oldest first until the pool runs out", () => {
    renderApply();
    fireEvent.click(screen.getByRole("button", { name: "Auto-fill oldest first" }));

    // 500k across 200k (Jan) + 150k (Mar) + 150k (Jun) lands exactly.
    expect(amountBox("loan-1")).toHaveValue("₦200,000");
    expect(amountBox("loan-2")).toHaveValue("₦150,000");
    expect(amountBox("loan-3")).toHaveValue("₦150,000");
    expect(screen.getByText("Unallocated ₦0")).toBeInTheDocument();
  });

  it("stops auto-fill at the pool and leaves later rows untouched", () => {
    render(
      <AllocationDialog
        open
        onOpenChange={vi.fn()}
        mode="applyCredit"
        transaction={{ id: "esc-part", currency: "NGN", remainingAmount: 250000 }}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Auto-fill oldest first" }));

    expect(amountBox("loan-1")).toHaveValue("₦200,000");
    expect(amountBox("loan-2")).toHaveValue("₦50,000");
    expect(screen.queryByLabelText("Amount to apply to loan-3")).not.toBeInTheDocument();
  });

  it("submits one mutation carrying every ticked target", async () => {
    const onOpenChange = vi.fn();
    const onSuccess = vi.fn();
    render(
      <AllocationDialog
        open
        onOpenChange={onOpenChange}
        mode="applyCredit"
        transaction={ESCROW}
        onSuccess={onSuccess}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Auto-fill oldest first" }));
    fireEvent.change(screen.getByPlaceholderText("What this settlement covers"), {
      target: { value: "Sep lump sum" },
    });
    fireEvent.click(applyButton());
    await vi.waitFor(() => expect(allocateTransactions).toHaveBeenCalled());

    const input = allocateTransactions.mock.calls[0][0];
    expect(input.sourceTransactionId).toBe("esc-1");
    expect(input.allocations).toEqual([
      { targetTransactionId: "loan-1", amount: 200000 },
      { targetTransactionId: "loan-2", amount: 150000 },
      { targetTransactionId: "loan-3", amount: 150000 },
    ]);
    expect(input.note).toBe("Sep lump sum");
    expect(onSuccess).toHaveBeenCalled();
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("clears ticks, amounts and the note on close→reopen", () => {
    const { rerender } = renderApply();
    tick(/loan given of ₦200,000/i);
    fireEvent.change(screen.getByPlaceholderText("What this settlement covers"), {
      target: { value: "stale" },
    });
    expect(screen.getByText("Allocating ₦200,000")).toBeInTheDocument();

    rerender(
      <AllocationDialog
        open={false}
        onOpenChange={vi.fn()}
        mode="applyCredit"
        transaction={ESCROW}
      />,
    );
    rerender(
      <AllocationDialog open onOpenChange={vi.fn()} mode="applyCredit" transaction={ESCROW} />,
    );

    expect(screen.queryByText(/^Allocating/)).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Amount to apply to loan-1")).not.toBeInTheDocument();
    expect(screen.getByPlaceholderText("What this settlement covers")).toHaveValue("");
  });
});

describe("AllocationDialog — settleFromCredit mode", () => {
  const renderSettle = () =>
    render(
      <AllocationDialog open onOpenChange={vi.fn()} mode="settleFromCredit" transaction={LOAN} />,
    );

  it("renders the credit picker, not the obligation picker", () => {
    renderSettle();

    expect(screen.getByText("Settle from a credit")).toBeInTheDocument();
    expect(screen.getByText("Outstanding ₦500,000")).toBeInTheDocument();
    expect(screen.getByText("Outstanding ₦100,000")).toBeInTheDocument();
    expect(screen.queryByText("Outstanding ₦200,000")).not.toBeInTheDocument();
    // Auto-fill is meaningless when only one source may be chosen.
    expect(
      screen.queryByRole("button", { name: "Auto-fill oldest first" }),
    ).not.toBeInTheDocument();
  });

  it("names the paying contact, so cross-contact credit is visible", () => {
    renderSettle();
    expect(screen.getByText("· Ade")).toBeInTheDocument();
  });

  it("refuses more than one credit at a time", () => {
    renderSettle();
    tick(/escrowed of ₦500,000/i);
    tick(/escrowed of ₦100,000/i);

    expect(
      screen.getByText("Choose one credit at a time so the whole entry applies together."),
    ).toBeInTheDocument();
    expect(applyButton()).toBeDisabled();
  });

  it("submits with the credit as source and this record as the single target", async () => {
    renderSettle();
    tick(/escrowed of ₦100,000/i);
    fireEvent.click(applyButton());
    await vi.waitFor(() => expect(allocateTransactions).toHaveBeenCalled());

    const input = allocateTransactions.mock.calls[0][0];
    expect(input.sourceTransactionId).toBe("esc-ade");
    expect(input.allocations).toEqual([{ targetTransactionId: "loan-1", amount: 100000 }]);
  });

  it("caps a credit larger than the obligation at the obligation", () => {
    renderSettle();
    tick(/escrowed of ₦500,000/i);

    // Pool here is the loan's ₦200,000, not the escrow's ₦500,000.
    expect(amountBox("esc-1")).toHaveValue("₦200,000");
  });
});

describe("AllocationDialog — empty states", () => {
  it("says so when nothing is allocatable", () => {
    queryResults.set(GET_ALLOCATABLE_OBLIGATIONS, {
      data: { allocatableObligations: [] },
      loading: false,
    });
    renderApply();

    expect(screen.getByText("Nothing outstanding that this money can settle.")).toBeInTheDocument();
    expect(applyButton()).toBeDisabled();
  });

  it("says so when no credit has an unapplied balance", () => {
    queryResults.set(GET_AVAILABLE_CREDITS, { data: { availableCredits: [] }, loading: false });
    render(
      <AllocationDialog open onOpenChange={vi.fn()} mode="settleFromCredit" transaction={LOAN} />,
    );

    expect(
      screen.getByText("No credit with an unapplied balance in this currency."),
    ).toBeInTheDocument();
  });
});
