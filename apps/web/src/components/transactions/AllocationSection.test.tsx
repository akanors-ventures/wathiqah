import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AllocationSection } from "./AllocationSection";

vi.mock("@tanstack/react-router", () => ({
  Link: ({ children, to }: { children: React.ReactNode; to: string }) => (
    <a href={to}>{children}</a>
  ),
}));

describe("AllocationSection", () => {
  it("renders nothing when there are no allocations", () => {
    const { container } = render(
      <AllocationSection
        title="Applied To"
        allocations={[]}
        counterpartOf="target"
        fallbackCurrency="NGN"
        reversingId={null}
        onReverse={vi.fn()}
      />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("reads the counterpart from targetTransaction when counterpartOf is target", () => {
    render(
      <AllocationSection
        title="Applied To"
        allocations={[
          {
            id: "alloc-1",
            amount: 5000,
            currency: "NGN",
            date: "2026-01-05",
            note: null,
            status: "ACTIVE",
            targetTransaction: {
              id: "tx-2",
              type: "LOAN_GIVEN",
              contact: { id: "c-1", name: "Musa" },
            },
            sourceTransaction: {
              id: "wrong",
              type: "ESCROWED",
              contact: { id: "c-2", name: "Ade" },
            },
          },
        ]}
        counterpartOf="target"
        fallbackCurrency="NGN"
        reversingId={null}
        onReverse={vi.fn()}
      />,
    );
    expect(screen.getByText("Applied To")).toBeInTheDocument();
    expect(screen.getByText(/Musa/)).toBeInTheDocument();
    expect(screen.queryByText(/Ade/)).not.toBeInTheDocument();
  });

  it("reads the counterpart from sourceTransaction when counterpartOf is source", () => {
    render(
      <AllocationSection
        title="Settled From"
        allocations={[
          {
            id: "alloc-2",
            amount: 7000,
            currency: "NGN",
            date: "2026-02-01",
            note: null,
            status: "ACTIVE",
            targetTransaction: {
              id: "wrong",
              type: "LOAN_GIVEN",
              contact: { id: "c-1", name: "Musa" },
            },
            sourceTransaction: {
              id: "tx-3",
              type: "ESCROWED",
              contact: { id: "c-2", name: "Ade" },
            },
          },
        ]}
        counterpartOf="source"
        fallbackCurrency="NGN"
        reversingId={null}
        onReverse={vi.fn()}
      />,
    );
    expect(screen.getByText(/Ade/)).toBeInTheDocument();
    expect(screen.queryByText(/Musa/)).not.toBeInTheDocument();
  });

  it("shows Reverse for an active allocation and wires onReverse to its id", () => {
    const onReverse = vi.fn();
    render(
      <AllocationSection
        title="Applied To"
        allocations={[
          {
            id: "alloc-1",
            amount: 5000,
            currency: "NGN",
            date: "2026-01-05",
            note: null,
            status: "ACTIVE",
            targetTransaction: { id: "tx-2", type: "LOAN_GIVEN", contact: null },
          },
        ]}
        counterpartOf="target"
        fallbackCurrency="NGN"
        reversingId={null}
        onReverse={onReverse}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Reverse" }));
    expect(onReverse).toHaveBeenCalledWith("alloc-1");
  });

  it("shows a Reversed badge, not a button, for a reversed allocation", () => {
    render(
      <AllocationSection
        title="Applied To"
        allocations={[
          {
            id: "alloc-1",
            amount: 5000,
            currency: "NGN",
            date: "2026-01-05",
            note: null,
            status: "REVERSED",
            targetTransaction: { id: "tx-2", type: "LOAN_GIVEN", contact: null },
          },
        ]}
        counterpartOf="target"
        fallbackCurrency="NGN"
        reversingId={null}
        onReverse={vi.fn()}
      />,
    );
    expect(screen.getByText("Reversed")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Reverse" })).not.toBeInTheDocument();
  });
});
