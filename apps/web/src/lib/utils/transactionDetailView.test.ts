import { describe, expect, it } from "vitest";
import {
  AllocationStatus,
  AssetCategory,
  TransactionStatus,
  TransactionType,
} from "@/types/__generated__/graphql";
import {
  getAllocationEligibility,
  getTransactionDetailView,
  type TransactionDetail,
} from "./transactionDetailView";

function makeTransaction(overrides: Partial<TransactionDetail> = {}): TransactionDetail {
  return {
    __typename: "Transaction",
    id: "tx-1",
    amount: 100000,
    category: AssetCategory.Funds,
    type: TransactionType.LoanGiven,
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

describe("getTransactionDetailView", () => {
  it("flags a personal-ledger mirror and suppresses every settlement capability", () => {
    const view = getTransactionDetailView(
      makeTransaction({ orgSourceTransactionId: "org-tx-1", type: TransactionType.LoanGiven }),
    );
    expect(view.isPersonalMirror).toBe(true);
    expect(view.canConvertToGift).toBe(false);
    expect(view.canRecordReturn).toBe(false);
    expect(view.canRecordRemit).toBe(false);
    expect(view.canApplyCredit).toBe(false);
    expect(view.canSettleFromCredit).toBe(false);
  });

  it("allows converting a LOAN_GIVEN to a gift and recording a return, given a contact", () => {
    const view = getTransactionDetailView(makeTransaction({ type: TransactionType.LoanGiven }));
    expect(view.canConvertToGift).toBe(true);
    expect(view.canRecordReturn).toBe(true);
  });

  it("does not allow recording a return without a contact", () => {
    const view = getTransactionDetailView(
      makeTransaction({ type: TransactionType.LoanGiven, contact: null }),
    );
    expect(view.canRecordReturn).toBe(false);
    // Conversion to a gift has no contact requirement of its own.
    expect(view.canConvertToGift).toBe(true);
  });

  it("only offers Record Remittance for an ESCROWED transaction with a contact", () => {
    expect(
      getTransactionDetailView(makeTransaction({ type: TransactionType.Escrowed })).canRecordRemit,
    ).toBe(true);
    expect(
      getTransactionDetailView(makeTransaction({ type: TransactionType.Escrowed, contact: null }))
        .canRecordRemit,
    ).toBe(false);
    expect(
      getTransactionDetailView(makeTransaction({ type: TransactionType.LoanGiven })).canRecordRemit,
    ).toBe(false);
  });

  it("treats ESCROWED/REMITTED as credit pools that can apply to obligations, never settle", () => {
    const escrow = getTransactionDetailView(makeTransaction({ type: TransactionType.Escrowed }));
    expect(escrow.isCreditPool).toBe(true);
    expect(escrow.canApplyCredit).toBe(true);
    expect(escrow.canSettleFromCredit).toBe(false);
  });

  it("treats a lifecycle obligation as settleable from a credit, never a credit pool", () => {
    const loan = getTransactionDetailView(makeTransaction({ type: TransactionType.LoanGiven }));
    expect(loan.isCreditPool).toBe(false);
    expect(loan.canApplyCredit).toBe(false);
    expect(loan.canSettleFromCredit).toBe(true);
  });

  it("blocks both allocation capabilities for a child transaction (parentId set)", () => {
    const view = getTransactionDetailView(
      makeTransaction({ type: TransactionType.Escrowed, parentId: "parent-tx" }),
    );
    expect(view.canApplyCredit).toBe(false);

    const settleView = getTransactionDetailView(
      makeTransaction({ type: TransactionType.LoanGiven, parentId: "parent-tx" }),
    );
    expect(settleView.canSettleFromCredit).toBe(false);
  });

  it("still allows allocation for a project-mirrored transaction — only edit/delete redirect to the project page", () => {
    const view = getTransactionDetailView(
      makeTransaction({ type: TransactionType.Escrowed, isMirroredFromProject: true }),
    );
    expect(view.canApplyCredit).toBe(true);
  });

  it("blocks all settlement capabilities for an ITEM-category transaction", () => {
    const view = getTransactionDetailView(
      makeTransaction({ category: AssetCategory.Item, type: TransactionType.LoanGiven }),
    );
    expect(view.canConvertToGift).toBe(false);
    expect(view.canRecordReturn).toBe(false);
    expect(view.canSettleFromCredit).toBe(false);
  });

  it("filters conversions into gift/repayment/remittance buckets and excludes cancelled ones", () => {
    const view = getTransactionDetailView(
      makeTransaction({
        conversions: [
          {
            __typename: "Transaction",
            id: "gift-1",
            amount: 20000,
            type: TransactionType.GiftGiven,
            currency: "NGN",
            date: "2026-02-01",
            status: TransactionStatus.Completed,
          },
          {
            __typename: "Transaction",
            id: "repay-1",
            amount: 30000,
            type: TransactionType.RepaymentReceived,
            currency: "NGN",
            date: "2026-03-01",
            status: TransactionStatus.Completed,
          },
          {
            __typename: "Transaction",
            id: "remit-1",
            amount: 40000,
            type: TransactionType.Remitted,
            currency: "NGN",
            date: "2026-04-01",
            status: TransactionStatus.Completed,
          },
          {
            __typename: "Transaction",
            id: "cancelled-1",
            amount: 99999,
            type: TransactionType.GiftGiven,
            currency: "NGN",
            date: "2026-05-01",
            status: TransactionStatus.Cancelled,
          },
        ],
      }),
    );

    expect(view.giftConversions.map((c) => c.id)).toEqual(["gift-1"]);
    expect(view.repayments.map((c) => c.id)).toEqual(["repay-1"]);
    expect(view.remittances.map((c) => c.id)).toEqual(["remit-1"]);
    expect(view.totalGifted).toBe(20000);
    expect(view.totalRepaid).toBe(30000);
    expect(view.totalRemitted).toBe(40000);
  });

  it("computes remainingAmount and totalSettled from the server field, not from conversions", () => {
    // Regression: totalSettled must reflect allocations too, which never show
    // up in `conversions` — deriving it from conversions alone would go stale.
    const view = getTransactionDetailView(
      makeTransaction({ amount: 100000, remainingAmount: 25000 }),
    );
    expect(view.remainingAmount).toBe(25000);
    expect(view.totalSettled).toBe(75000);
  });

  it("clamps totalSettled at zero when remainingAmount exceeds amount", () => {
    const view = getTransactionDetailView(
      makeTransaction({ amount: 100000, remainingAmount: 150000 }),
    );
    expect(view.totalSettled).toBe(0);
  });

  it("filters out null allocation entries", () => {
    const view = getTransactionDetailView(
      makeTransaction({
        allocationsOut: [
          null,
          {
            __typename: "TransactionAllocation",
            id: "alloc-1",
            amount: 5000,
            currency: "NGN",
            date: "2026-01-05",
            note: null,
            status: AllocationStatus.Active,
            targetTransaction: null,
          },
        ] as unknown as TransactionDetail["allocationsOut"],
      }),
    );
    expect(view.allocationsOut).toHaveLength(1);
    expect(view.allocationsOut[0]?.id).toBe("alloc-1");
  });
});

describe("getAllocationEligibility", () => {
  it("returns null for any ITEM-category transaction, regardless of type", () => {
    expect(getAllocationEligibility(TransactionType.LoanGiven, AssetCategory.Item)).toBeNull();
    expect(getAllocationEligibility(TransactionType.Escrowed, AssetCategory.Item)).toBeNull();
  });

  it("treats ESCROWED and REMITTED as credit pools that can apply to obligations", () => {
    expect(getAllocationEligibility(TransactionType.Escrowed, AssetCategory.Funds)).toBe(
      "applyCredit",
    );
    expect(getAllocationEligibility(TransactionType.Remitted, AssetCategory.Funds)).toBe(
      "applyCredit",
    );
  });

  it("treats every lifecycle obligation type as settleable from a credit", () => {
    const lifecycleTypes = [
      TransactionType.LoanGiven,
      TransactionType.LoanReceived,
      TransactionType.AdvancePaid,
      TransactionType.AdvanceReceived,
      TransactionType.DepositPaid,
      TransactionType.DepositReceived,
    ];
    for (const type of lifecycleTypes) {
      expect(getAllocationEligibility(type, AssetCategory.Funds)).toBe("settleFromCredit");
    }
  });

  it("returns null for gift and repayment types", () => {
    const ineligibleTypes = [
      TransactionType.GiftGiven,
      TransactionType.GiftReceived,
      TransactionType.RepaymentMade,
      TransactionType.RepaymentReceived,
    ];
    for (const type of ineligibleTypes) {
      expect(getAllocationEligibility(type, AssetCategory.Funds)).toBeNull();
    }
  });

  it("agrees with getTransactionDetailView's canApplyCredit/canSettleFromCredit for a fresh transaction", () => {
    const escrow = getTransactionDetailView(makeTransaction({ type: TransactionType.Escrowed }));
    expect(escrow.canApplyCredit).toBe(
      getAllocationEligibility(TransactionType.Escrowed, AssetCategory.Funds) === "applyCredit",
    );

    const loan = getTransactionDetailView(makeTransaction({ type: TransactionType.LoanGiven }));
    expect(loan.canSettleFromCredit).toBe(
      getAllocationEligibility(TransactionType.LoanGiven, AssetCategory.Funds) ===
        "settleFromCredit",
    );
  });
});
