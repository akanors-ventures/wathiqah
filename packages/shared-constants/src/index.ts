/**
 * Single source of truth for which `TransactionType` values flow money INTO vs
 * OUT OF a project, when a contact transaction is linked to a project transaction.
 *
 * Backend (`ProjectContactLinkService`) and frontend (`ProjectTransactionForm`)
 * both consume these instead of hand-maintaining parallel copies — the backend's
 * Prisma-generated `TransactionType` enum and the frontend's GraphQL-codegen
 * `TransactionType` enum serialize to the same SCREAMING_SNAKE_CASE string
 * values, so plain string arrays are assignable on both sides without a cast.
 *
 * Two other near-identical mappings exist for different domains — if this
 * list changes, check whether they need to change too:
 * - `apps/web/src/lib/utils/transactionDisplay.ts`'s per-type `isIncoming`
 *   field encodes the same cash-flow-direction split, for display purposes.
 * - `apps/api/src/modules/contacts/contacts.service.ts`'s
 *   `CONTACT_STANDING_SIGN` encodes obligation sign, not project cash-flow
 *   direction, and deliberately excludes GIFT types — not a strict subset
 *   relationship, don't assume the two must move together.
 */
export const PROJECT_INCOME_CONTACT_TRANSACTION_TYPES = [
  'LOAN_RECEIVED',
  'REPAYMENT_RECEIVED',
  'GIFT_RECEIVED',
  'ADVANCE_RECEIVED',
  'DEPOSIT_RECEIVED',
  'ESCROWED',
] as const;

export const PROJECT_EXPENSE_CONTACT_TRANSACTION_TYPES = [
  'LOAN_GIVEN',
  'REPAYMENT_MADE',
  'GIFT_GIVEN',
  'ADVANCE_PAID',
  'DEPOSIT_PAID',
  'REMITTED',
] as const;

/**
 * `TransactionType` values that MUST reference a parent loan/escrow
 * (`parentTransactionId`) — a repayment or remittance without a parent is
 * meaningless. Shared between the backend's link-validation
 * (`ProjectContactLinkService`) and the frontend's form validation
 * (`ProjectTransactionForm`) so the "must pick a loan" rule can't drift
 * between the two.
 */
export const MANDATORY_PARENT_CONTACT_TRANSACTION_TYPES = [
  'REPAYMENT_MADE',
  'REPAYMENT_RECEIVED',
  'REMITTED',
] as const;
