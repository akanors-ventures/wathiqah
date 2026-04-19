// apps/web/src/components/contacts/ContactSummaryCards.test.tsx
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { TransactionsSummary } from "@/types/__generated__/graphql";
import { ContactSummaryCards } from "./ContactSummaryCards";

const baseSummary: TransactionsSummary = {
  __typename: "TransactionsSummary",
  totalLoanGiven: 500000,
  totalLoanReceived: 200000,
  totalRepaymentMade: 40000,
  totalRepaymentReceived: 80000,
  totalGiftGiven: 0,
  totalGiftReceived: 0,
  totalAdvancePaid: 0,
  totalAdvanceReceived: 0,
  totalDepositPaid: 0,
  totalDepositReceived: 0,
  totalEscrowed: 0,
  totalRemitted: 0,
  netBalance: 0,
  currency: "NGN",
};

describe("ContactSummaryCards", () => {
  it("always renders primary stats", () => {
    render(<ContactSummaryCards summary={baseSummary} contactBalance={450000} />);
    expect(screen.getByText("Total Loaned Out")).toBeInTheDocument();
    expect(screen.getByText("Total Borrowed")).toBeInTheDocument();
    expect(screen.getByText("Repayments Received")).toBeInTheDocument();
    expect(screen.getByText("Repayments Made")).toBeInTheDocument();
    expect(screen.getByText("Net Balance with Contact")).toBeInTheDocument();
  });

  it("hides Other Flows panel when all secondary values are zero", () => {
    render(<ContactSummaryCards summary={baseSummary} contactBalance={0} />);
    expect(screen.queryByText("Other Flows")).not.toBeInTheDocument();
  });

  it("shows Other Flows panel when at least one secondary value is non-zero", () => {
    const summary = { ...baseSummary, totalAdvancePaid: 300000 };
    render(<ContactSummaryCards summary={summary} contactBalance={0} />);
    expect(screen.getByText("Other Flows")).toBeInTheDocument();
  });

  it("Other Flows panel is collapsed by default", () => {
    const summary = { ...baseSummary, totalAdvancePaid: 300000 };
    render(<ContactSummaryCards summary={summary} contactBalance={0} />);
    expect(screen.queryByText("Advance Paid")).not.toBeInTheDocument();
  });

  it("expands Other Flows on click", () => {
    const summary = { ...baseSummary, totalAdvancePaid: 300000 };
    render(<ContactSummaryCards summary={summary} contactBalance={0} />);
    fireEvent.click(screen.getByText("Other Flows"));
    expect(screen.getByText("Advance Paid")).toBeInTheDocument();
  });

  it("only renders non-zero cards inside Other Flows", () => {
    const summary = { ...baseSummary, totalAdvancePaid: 300000, totalGiftGiven: 0 };
    render(<ContactSummaryCards summary={summary} contactBalance={0} />);
    fireEvent.click(screen.getByText("Other Flows"));
    expect(screen.getByText("Advance Paid")).toBeInTheDocument();
    expect(screen.queryByText("Gift Given")).not.toBeInTheDocument();
  });
});
