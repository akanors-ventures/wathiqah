-- Data migration: map old type + direction to new formal types
UPDATE "transactions" SET "type" = 'LOAN_GIVEN'       WHERE "type" = 'GIVEN';
UPDATE "transactions" SET "type" = 'LOAN_RECEIVED'     WHERE "type" = 'RECEIVED';
UPDATE "transactions" SET "type" = 'REPAYMENT_MADE'
  WHERE "type" = 'RETURNED' AND "returnDirection" = 'TO_CONTACT';
UPDATE "transactions" SET "type" = 'REPAYMENT_RECEIVED'
  WHERE "type" = 'RETURNED' AND "returnDirection" = 'TO_ME';
UPDATE "transactions" SET "type" = 'REPAYMENT_MADE'
  WHERE "type" = 'RETURNED' AND "returnDirection" IS NULL;
UPDATE "transactions" SET "type" = 'GIFT_GIVEN'
  WHERE "type" = 'GIFT' AND "returnDirection" = 'TO_CONTACT';
UPDATE "transactions" SET "type" = 'GIFT_RECEIVED'
  WHERE "type" = 'GIFT' AND "returnDirection" = 'TO_ME';
UPDATE "transactions" SET "type" = 'GIFT_GIVEN'
  WHERE "type" = 'GIFT' AND "returnDirection" IS NULL;
-- NOTE: EXPENSE and INCOME rows are left as-is (handled by follow-up PersonalEntry plan)

-- Migrate transaction_history JSON previousState types
UPDATE "transaction_history"
SET "previousState" = jsonb_set(
  "previousState", '{type}',
  CASE "previousState"->>'type'
    WHEN 'GIVEN'    THEN '"LOAN_GIVEN"'::jsonb
    WHEN 'RECEIVED' THEN '"LOAN_RECEIVED"'::jsonb
    WHEN 'RETURNED' THEN
      CASE "previousState"->>'returnDirection'
        WHEN 'TO_CONTACT' THEN '"REPAYMENT_MADE"'::jsonb
        ELSE '"REPAYMENT_RECEIVED"'::jsonb
      END
    WHEN 'GIFT' THEN
      CASE "previousState"->>'returnDirection'
        WHEN 'TO_CONTACT' THEN '"GIFT_GIVEN"'::jsonb
        ELSE '"GIFT_RECEIVED"'::jsonb
      END
    ELSE to_json("previousState"->>'type')::jsonb
  END
)
WHERE "previousState" IS NOT NULL AND "previousState" ? 'type';

-- Migrate transaction_history JSON newState types
UPDATE "transaction_history"
SET "newState" = jsonb_set(
  "newState", '{type}',
  CASE "newState"->>'type'
    WHEN 'GIVEN'    THEN '"LOAN_GIVEN"'::jsonb
    WHEN 'RECEIVED' THEN '"LOAN_RECEIVED"'::jsonb
    WHEN 'RETURNED' THEN
      CASE "newState"->>'returnDirection'
        WHEN 'TO_CONTACT' THEN '"REPAYMENT_MADE"'::jsonb
        ELSE '"REPAYMENT_RECEIVED"'::jsonb
      END
    WHEN 'GIFT' THEN
      CASE "newState"->>'returnDirection'
        WHEN 'TO_CONTACT' THEN '"GIFT_GIVEN"'::jsonb
        ELSE '"GIFT_RECEIVED"'::jsonb
      END
    ELSE to_json("newState"->>'type')::jsonb
  END
)
WHERE "newState" IS NOT NULL AND "newState" ? 'type';

-- Drop returnDirection column (data migration is complete)
ALTER TABLE "transactions" DROP COLUMN IF EXISTS "returnDirection";

-- Recreate TransactionType enum without old values (GIVEN/RECEIVED/RETURNED/GIFT)
-- PostgreSQL does not support ALTER TYPE ... DROP VALUE, so we recreate the type.
CREATE TYPE "TransactionType_new" AS ENUM (
  'EXPENSE',
  'INCOME',
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

-- Drop ReturnDirection enum (no longer referenced)
DROP TYPE IF EXISTS "public"."ReturnDirection";
