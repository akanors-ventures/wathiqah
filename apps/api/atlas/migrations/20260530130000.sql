-- Move legacy personal income/expense rows into personal_entries.
-- EXPENSE/INCOME are always FUNDS-category records with an amount; COALESCE is
-- defensive so the migration never fails on an unexpected NULL.
INSERT INTO "personal_entries"
  ("id", "type", "amount", "currency", "date", "description", "createdAt", "createdById")
SELECT
  "id",
  "type"::text::"PersonalEntryType",
  COALESCE("amount", 0),
  "currency",
  "date",
  "description",
  "createdAt",
  "createdById"
FROM "transactions"
WHERE "type" IN ('EXPENSE', 'INCOME');

-- Remove the migrated rows (their transaction_history cascades via FK ON DELETE CASCADE).
DELETE FROM "transactions" WHERE "type" IN ('EXPENSE', 'INCOME');

-- Recreate TransactionType without EXPENSE/INCOME.
-- PostgreSQL does not support ALTER TYPE ... DROP VALUE, so we recreate the type.
CREATE TYPE "TransactionType_new" AS ENUM (
  'LOAN_GIVEN',
  'LOAN_RECEIVED',
  'REPAYMENT_MADE',
  'REPAYMENT_RECEIVED',
  'GIFT_GIVEN',
  'GIFT_RECEIVED',
  'ADVANCE_PAID',
  'ADVANCE_RECEIVED',
  'DEPOSIT_PAID',
  'DEPOSIT_RECEIVED',
  'ESCROWED',
  'REMITTED'
);

ALTER TABLE "transactions"
  ALTER COLUMN "type" TYPE "TransactionType_new"
  USING "type"::text::"TransactionType_new";

DROP TYPE "public"."TransactionType";
ALTER TYPE "TransactionType_new" RENAME TO "TransactionType";
