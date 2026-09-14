import {
  AssetCategory,
  type TransactionQuery,
  TransactionType,
} from "@/types/__generated__/graphql";

export type TransactionDetail = NonNullable<TransactionQuery["transaction"]>;
export type TransactionAllocationOut = TransactionDetail["allocationsOut"][number];
export type TransactionAllocationIn = TransactionDetail["allocationsIn"][number];
export type TransactionConversion = NonNullable<TransactionDetail["conversions"]>[number];

/** Types that carry an outstanding balance and can be settled from a credit. */
const LIFECYCLE_TYPES: TransactionType[] = [
  TransactionType.LoanGiven,
  TransactionType.LoanReceived,
  TransactionType.AdvancePaid,
  TransactionType.AdvanceReceived,
  TransactionType.DepositPaid,
  TransactionType.DepositReceived,
];

export type AllocationEligibility = "applyCredit" | "settleFromCredit" | null;

/**
 * The type/category half of the allocation capability check — independent of
 * per-transaction state like `parentId` or mirror flags, so it also applies
 * to a transaction that doesn't exist yet (e.g. right after creation, before
 * those fields are known to the caller).
 */
export function getAllocationEligibility(
  type: TransactionType,
  category: AssetCategory,
): AllocationEligibility {
  if (category !== AssetCategory.Funds) return null;
  if (type === TransactionType.Escrowed || type === TransactionType.Remitted) {
    return "applyCredit";
  }
  if (LIFECYCLE_TYPES.includes(type)) return "settleFromCredit";
  return null;
}

export interface TransactionDetailView {
  isPersonalMirror: boolean;
  canConvertToGift: boolean;
  canRecordReturn: boolean;
  canRecordRemit: boolean;
  isCreditPool: boolean;
  canApplyCredit: boolean;
  canSettleFromCredit: boolean;
  allocationsOut: TransactionAllocationOut[];
  allocationsIn: TransactionAllocationIn[];
  giftConversions: TransactionConversion[];
  repayments: TransactionConversion[];
  remittances: TransactionConversion[];
  totalGifted: number;
  totalRepaid: number;
  totalRemitted: number;
  remainingAmount: number;
  totalSettled: number;
}

/**
 * Derives every capability flag, filtered child list, and display total the
 * transaction detail page needs from the raw query result. Pure function of
 * `transaction` — no state or effects — so it's directly unit-testable
 * without React.
 */
export function getTransactionDetailView(transaction: TransactionDetail): TransactionDetailView {
  const allChildren = (transaction.conversions ?? []).filter(
    (c): c is NonNullable<typeof c> => c !== null && c.status !== "CANCELLED",
  );
  const giftConversions = allChildren.filter(
    (c) => c.type === TransactionType.GiftGiven || c.type === TransactionType.GiftReceived,
  );
  const repayments = allChildren.filter(
    (c) => c.type === TransactionType.RepaymentMade || c.type === TransactionType.RepaymentReceived,
  );
  const remittances = allChildren.filter((c) => c.type === TransactionType.Remitted);

  // A personal-ledger mirror's children are only ever created automatically
  // alongside the org-side child (see TransactionsService.maybeCreatePersonalMirror)
  // — recording one directly here would desync it from the org ledger.
  const isPersonalMirror = !!transaction.orgSourceTransactionId;

  const canConvertToGift =
    !isPersonalMirror &&
    transaction.category === AssetCategory.Funds &&
    (transaction.type === TransactionType.LoanGiven ||
      transaction.type === TransactionType.LoanReceived);

  const canRecordReturn =
    !isPersonalMirror &&
    transaction.category === AssetCategory.Funds &&
    (transaction.type === TransactionType.LoanGiven ||
      transaction.type === TransactionType.LoanReceived) &&
    !!transaction.contact;

  const canRecordRemit =
    !isPersonalMirror &&
    transaction.category === AssetCategory.Funds &&
    transaction.type === TransactionType.Escrowed &&
    !!transaction.contact;

  const allocationsOut = (transaction.allocationsOut ?? []).filter(
    (a): a is NonNullable<typeof a> => a !== null,
  );
  const allocationsIn = (transaction.allocationsIn ?? []).filter(
    (a): a is NonNullable<typeof a> => a !== null,
  );

  const isCreditPool =
    transaction.type === TransactionType.Escrowed || transaction.type === TransactionType.Remitted;

  // A credit pool spends its balance; every other lifecycle obligation
  // receives from one. The server enforces the opposite-sign rule either way —
  // these flags only decide which button to offer.
  const eligibility = getAllocationEligibility(transaction.type, transaction.category);
  const eligibleForAllocation = !isPersonalMirror && !transaction.parentId;

  const canApplyCredit = eligibleForAllocation && eligibility === "applyCredit";
  const canSettleFromCredit = eligibleForAllocation && eligibility === "settleFromCredit";

  // Per-channel breakdown, for display only — never for the remaining balance.
  const totalGifted = giftConversions.reduce((sum, c) => sum + (c.amount || 0), 0);
  const totalRepaid = repayments.reduce((sum, c) => sum + (c.amount || 0), 0);
  const totalRemitted = remittances.reduce((sum, c) => sum + (c.amount || 0), 0);

  // Server-computed. It must NOT be derived here from `conversions`:
  // allocations are not children, so a local sum silently ignores them and
  // every cap and capability flag on this page goes stale — the escrow's
  // "Record Remittance" button would offer money already allocated away.
  const remainingAmount = transaction.remainingAmount ?? 0;
  const totalSettled = Math.max(0, (transaction.amount || 0) - remainingAmount);

  return {
    isPersonalMirror,
    canConvertToGift,
    canRecordReturn,
    canRecordRemit,
    isCreditPool,
    canApplyCredit,
    canSettleFromCredit,
    allocationsOut,
    allocationsIn,
    giftConversions,
    repayments,
    remittances,
    totalGifted,
    totalRepaid,
    totalRemitted,
    remainingAmount,
    totalSettled,
  };
}
