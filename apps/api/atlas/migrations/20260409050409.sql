-- Reopen lifecycle-parent transactions whose outstanding balance > 0.
--
-- Background: prior to this change, every transaction was created with the
-- schema default status COMPLETED. That is correct for one-shot ledger
-- entries (gifts, advances, deposits, repayments, remittances) but wrong
-- for "lifecycle parent" types — LOAN_GIVEN, LOAN_RECEIVED, and ESCROWED —
-- which only become COMPLETED once enough children settle them.
--
-- Going forward, the create() flow defaults these three types to PENDING.
-- This migration reconciles historic rows by flipping any lifecycle parent
-- whose non-cancelled children sum to less than its face amount back to
-- PENDING. Fully-settled and cancelled rows are left untouched.
--
-- Idempotent: re-running this migration is a no-op once every parent's
-- status matches its outstanding balance.

UPDATE "transactions" t
SET "status" = 'PENDING'
WHERE t."type" IN ('LOAN_GIVEN', 'LOAN_RECEIVED', 'ESCROWED')
  AND t."status" = 'COMPLETED'
  AND t."amount" IS NOT NULL
  AND COALESCE(
    (
      SELECT SUM(c."amount")
      FROM "transactions" c
      WHERE c."parentId" = t."id"
        AND c."status" <> 'CANCELLED'
    ),
    0
  ) < t."amount";
