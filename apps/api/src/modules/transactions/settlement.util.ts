/**
 * Settlement arithmetic, shared by TransactionsService and ContactsService.
 *
 * Deliberately pure (no Prisma, no Nest) so it is unit-testable in isolation
 * and importable from either service without a module dependency. The Prisma
 * loaders that feed it live on TransactionsService.
 *
 * Before this module, settlement was re-derived by copy-pasted
 * `SUM(children WHERE parentId = X AND status != CANCELLED)` in five separate
 * places. Allocations (TransactionAllocation) add a second source of
 * settlement that none of those sites knew about, so they all route here now.
 */

/** + = contact owes me, − = I owe contact. Mirrors CONTACT_STANDING_SIGN in
 *  contacts.service.ts, which stays the authority for balance math; this copy
 *  exists so the allocation direction rule can be enforced without importing
 *  ContactsService into TransactionsModule. Keep the two in sync. */
export const OBLIGATION_SIGN: Readonly<Record<string, 1 | -1>> = {
  LOAN_GIVEN: 1,
  ADVANCE_PAID: 1,
  DEPOSIT_PAID: 1,
  REMITTED: 1,
  LOAN_RECEIVED: -1,
  ADVANCE_RECEIVED: -1,
  DEPOSIT_RECEIVED: -1,
  ESCROWED: -1,
};

/**
 * Types that carry an outstanding balance and a PENDING/COMPLETED lifecycle,
 * and are therefore valid allocation endpoints.
 *
 * GIFT_* are excluded: they represent no ongoing obligation and have no
 * standing sign, so they can never be a value-conserving endpoint.
 * REPAYMENT_* are excluded: they are settled events in their own right, always
 * children of a loan, never independently outstanding.
 */
export const LIFECYCLE_OBLIGATION_TYPES = [
  'LOAN_GIVEN',
  'LOAN_RECEIVED',
  'ADVANCE_PAID',
  'ADVANCE_RECEIVED',
  'DEPOSIT_PAID',
  'DEPOSIT_RECEIVED',
  'ESCROWED',
  'REMITTED',
] as const;

/**
 * Types that can act as the *source* of an allocation — a pool of money
 * received or disbursed whose unapplied remainder can be pushed onto other
 * obligations.
 *
 *  - ESCROWED (−1): cash I'm holding. Settles what the contact owes me.
 *  - REMITTED (+1): cash I disbursed. Settles what I owe.
 */
export const CREDIT_SOURCE_TYPES = ['ESCROWED', 'REMITTED'] as const;

export function isLifecycleObligationType(type: string): boolean {
  return (LIFECYCLE_OBLIGATION_TYPES as readonly string[]).includes(type);
}

export function isCreditSourceType(type: string): boolean {
  return (CREDIT_SOURCE_TYPES as readonly string[]).includes(type);
}

/**
 * True when allocating between these two types conserves value.
 *
 * An allocation creates no Transaction row; it reduces the effective amount of
 * both endpoints by X. With s(t) = OBLIGATION_SIGN[t]:
 *
 *   Δ contact standing = −X · (s(src) + s(tgt))
 *   Δ computeNetBalance = +X · (s(src) + s(tgt))
 *
 * Both vanish exactly when the signs are opposite. Same-signed endpoints are
 * two liabilities (or two claims) pointing the same way, with no counter-claim
 * to net against — allocating between them would move the balance by 2X for an
 * X allocation, inventing value that never moved. The real-world event that
 * shrinks both is a write-off, which is a gift, and gift conversion already
 * handles that.
 */
export function isValueConservingPair(
  sourceType: string,
  targetType: string,
): boolean {
  const s = OBLIGATION_SIGN[sourceType];
  const t = OBLIGATION_SIGN[targetType];
  if (s === undefined || t === undefined) return false;
  return s * t === -1;
}

type AmountLike = { amount: unknown };

/** Prisma Decimal, number, string or null → number. */
export function toNumber(value: unknown): number {
  if (value == null) return 0;
  if (typeof value === 'object' && value !== null && 'toNumber' in value) {
    return (value as { toNumber: () => number }).toNumber();
  }
  return Number(value);
}

function sumAmounts(rows: AmountLike[] | undefined): number {
  if (!rows || rows.length === 0) return 0;
  return rows.reduce((sum, row) => sum + toNumber(row.amount), 0);
}

/**
 * SETTLEMENT view — how much of this transaction has been discharged.
 *
 * Drives status recompute, `remainingAmount`, and every cap check. Children
 * (repayments, remittances, gift conversions) count in full; allocations count
 * on BOTH legs, because drawing credit out of a pool discharges the pool just
 * as receiving credit discharges an obligation.
 *
 * DO NOT merge this with computeEffectiveObligationAmount. They subtract
 * different sets and the difference is load-bearing — see that function's note.
 */
export function computeSettledAmount(parts: {
  children?: AmountLike[];
  allocationsIn?: AmountLike[];
  allocationsOut?: AmountLike[];
}): number {
  return (
    sumAmounts(parts.children) +
    sumAmounts(parts.allocationsIn) +
    sumAmounts(parts.allocationsOut)
  );
}

/** Outstanding balance, never negative. */
export function computeOutstanding(
  parentAmount: unknown,
  settled: number,
): number {
  return Math.max(0, toNumber(parentAmount) - settled);
}

/**
 * CONTACT-STANDING view — the effective principal used for balance math.
 *
 * Deliberately DIFFERENT from computeSettledAmount: repayment and remittance
 * children are NOT subtracted here, because they are summed as their own
 * signed rows by computeContactBalance. Subtracting them here as well would
 * double-count every repayment.
 *
 * Only gift conversions and allocations are subtracted — precisely the two
 * mechanisms that discharge an obligation *without* a signed row of their own.
 */
export function computeEffectiveObligationAmount(parts: {
  amount: unknown;
  giftConversions?: AmountLike[];
  allocationsIn?: AmountLike[];
  allocationsOut?: AmountLike[];
}): number {
  const discharged =
    sumAmounts(parts.giftConversions) +
    sumAmounts(parts.allocationsIn) +
    sumAmounts(parts.allocationsOut);
  return Math.max(0, toNumber(parts.amount) - discharged);
}
