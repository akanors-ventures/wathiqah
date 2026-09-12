-- Backfill: give advances and deposits the outstanding lifecycle.
--
-- These types were created with the schema default COMPLETED because
-- createWithClient only marked LOAN_GIVEN/LOAN_RECEIVED/ESCROWED as lifecycle
-- parents. They are now allocation targets, so they need a real PENDING/
-- COMPLETED lifecycle like every other obligation: an advance that has not been
-- worked off genuinely is outstanding.
--
-- Only top-level rows (parentId IS NULL) that are not already fully settled by
-- their children are reopened. Rows already CANCELLED are left alone. No
-- allocations exist yet at this point in the migration history, so children are
-- the only settlement source to consider.
--
-- This visibly changes status badges and dashboard counts on existing records.
UPDATE "public"."transactions" t
SET "status" = 'PENDING'
WHERE t."type" IN (
    'ADVANCE_PAID',
    'ADVANCE_RECEIVED',
    'DEPOSIT_PAID',
    'DEPOSIT_RECEIVED'
  )
  AND t."status" = 'COMPLETED'
  AND t."parentId" IS NULL
  AND t."amount" IS NOT NULL
  AND t."amount" > COALESCE((
    SELECT SUM(c."amount")
    FROM "public"."transactions" c
    WHERE c."parentId" = t."id"
      AND c."status" <> 'CANCELLED'
  ), 0);
