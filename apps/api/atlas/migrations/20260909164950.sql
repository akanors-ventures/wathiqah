-- Trimmed to this change only. `db:migrate` also emitted FK ON DELETE drift on
-- contacts/notes/org_events/org_subscriptions/organisation_members/projects/
-- promises/transactions (pre-existing DB drift, not part of this diff) and a
-- DROP of transaction_allocations' two CHECK constraints (amount_positive,
-- distinct_endpoints), which Prisma cannot express and so Atlas proposes to
-- remove on every diff. All of that was stripped by hand.

-- Modify "transaction_allocations" table
ALTER TABLE "public"."transaction_allocations" ADD COLUMN "orgSourceAllocationId" text NULL;
-- Create index "transaction_allocations_orgSourceAllocationId_key" to table: "transaction_allocations"
CREATE UNIQUE INDEX "transaction_allocations_orgSourceAllocationId_key" ON "public"."transaction_allocations" ("orgSourceAllocationId");
-- Self-FK on a populated table: add NOT VALID, then validate, so the ADD does
-- not take a full-table lock.
ALTER TABLE "public"."transaction_allocations" ADD CONSTRAINT "transaction_allocations_orgSourceAllocationId_fkey" FOREIGN KEY ("orgSourceAllocationId") REFERENCES "public"."transaction_allocations" ("id") ON UPDATE CASCADE ON DELETE CASCADE NOT VALID;
ALTER TABLE "public"."transaction_allocations" VALIDATE CONSTRAINT "transaction_allocations_orgSourceAllocationId_fkey";
