import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { TransactionDetail, TransactionDetailView } from "@/lib/utils/transactionDetailView";
import { AssetCategory, TransactionStatus, TransactionType } from "@/types/__generated__/graphql";
import { TransactionHeader } from "./TransactionHeader";

function makeTransaction(overrides: Partial<TransactionDetail> = {}): TransactionDetail {
  return {
    __typename: "Transaction",
    id: "tx-1",
    amount: 100000,
    category: AssetCategory.Funds,
    type: TransactionType.Escrowed,
    status: TransactionStatus.Pending,
    currency: "NGN",
    date: "2026-01-01",
    description: null,
    itemName: null,
    quantity: null,
    createdAt: "2026-01-01",
    parentId: null,
    orgId: null,
    projectTransactionId: null,
    isMirroredFromProject: false,
    orgSourceTransactionId: null,
    remainingAmount: 100000,
    orgSourceTransaction: null,
    projectTransaction: null,
    allocationsOut: [],
    allocationsIn: [],
    conversions: [],
    contact: { __typename: "Contact", id: "c-1", name: "Musa", isSupporter: false },
    witnesses: [],
    history: [],
    ...overrides,
  };
}

function makeView(overrides: Partial<TransactionDetailView> = {}): TransactionDetailView {
  return {
    isPersonalMirror: false,
    canConvertToGift: false,
    canRecordReturn: false,
    canRecordRemit: false,
    isCreditPool: true,
    canApplyCredit: false,
    canSettleFromCredit: false,
    allocationsOut: [],
    allocationsIn: [],
    giftConversions: [],
    repayments: [],
    remittances: [],
    totalGifted: 0,
    totalRepaid: 0,
    totalRemitted: 0,
    remainingAmount: 100000,
    totalSettled: 0,
    ...overrides,
  };
}

const noop = () => {
  /* not asserted in this test */
};

describe("TransactionHeader", () => {
  it("shows a single allocate button labeled 'Apply to obligations' for a credit pool", () => {
    render(
      <TransactionHeader
        transaction={makeTransaction()}
        view={makeView({ canApplyCredit: true, canSettleFromCredit: false })}
        onEdit={noop}
        onRemove={noop}
        onConvertGift={noop}
        onRecordReturn={noop}
        onRecordRemit={noop}
        onAllocate={noop}
      />,
    );
    expect(screen.getByRole("button", { name: /Apply to obligations/ })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Settle from a credit/ })).not.toBeInTheDocument();
  });

  it("shows a single allocate button labeled 'Settle from a credit' for a lifecycle obligation", () => {
    render(
      <TransactionHeader
        transaction={makeTransaction({ type: TransactionType.LoanGiven })}
        view={makeView({ canApplyCredit: false, canSettleFromCredit: true, isCreditPool: false })}
        onEdit={noop}
        onRemove={noop}
        onConvertGift={noop}
        onRecordReturn={noop}
        onRecordRemit={noop}
        onAllocate={noop}
      />,
    );
    expect(screen.getByRole("button", { name: /Settle from a credit/ })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Apply to obligations/ })).not.toBeInTheDocument();
  });

  it("renders no allocate button when neither capability is available", () => {
    render(
      <TransactionHeader
        transaction={makeTransaction({ type: TransactionType.GiftGiven })}
        view={makeView({ canApplyCredit: false, canSettleFromCredit: false })}
        onEdit={noop}
        onRemove={noop}
        onConvertGift={noop}
        onRecordReturn={noop}
        onRecordRemit={noop}
        onAllocate={noop}
      />,
    );
    expect(screen.queryByRole("button", { name: /Apply to obligations/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Settle from a credit/ })).not.toBeInTheDocument();
  });

  it("calls onAllocate when the single allocate button is clicked", () => {
    const onAllocate = vi.fn();
    render(
      <TransactionHeader
        transaction={makeTransaction()}
        view={makeView({ canApplyCredit: true })}
        onEdit={noop}
        onRemove={noop}
        onConvertGift={noop}
        onRecordReturn={noop}
        onRecordRemit={noop}
        onAllocate={onAllocate}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /Apply to obligations/ }));
    expect(onAllocate).toHaveBeenCalledTimes(1);
  });

  it("shows Edit/Remove for a normal transaction, not the org-mirror notice", () => {
    render(
      <TransactionHeader
        transaction={makeTransaction()}
        view={makeView()}
        onEdit={noop}
        onRemove={noop}
        onConvertGift={noop}
        onRecordReturn={noop}
        onRecordRemit={noop}
        onAllocate={noop}
      />,
    );
    expect(screen.getByRole("button", { name: /Edit/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Remove/ })).toBeInTheDocument();
  });

  it("hides Edit/Remove and shows the org-mirror notice for a personal-ledger mirror", () => {
    render(
      <TransactionHeader
        transaction={makeTransaction({
          orgSourceTransactionId: "org-tx-1",
          orgSourceTransaction: {
            __typename: "Transaction",
            id: "org-tx-1",
            organisation: {
              __typename: "Organisation",
              id: "org-1",
              name: "Acme Co",
              slug: "acme",
            },
            projectTransaction: null,
          },
        })}
        view={makeView({ isPersonalMirror: true })}
        onEdit={noop}
        onRemove={noop}
        onConvertGift={noop}
        onRecordReturn={noop}
        onRecordRemit={noop}
        onAllocate={noop}
      />,
    );
    expect(screen.queryByRole("button", { name: /^Edit/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^Remove/ })).not.toBeInTheDocument();
    expect(screen.getByText(/Recorded on behalf of Acme Co/)).toBeInTheDocument();
  });
});
