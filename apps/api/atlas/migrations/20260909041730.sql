-- Create enum type "AllocationStatus"
CREATE TYPE "public"."AllocationStatus" AS ENUM ('ACTIVE', 'REVERSED');
-- Create "transaction_allocations" table
CREATE TABLE "public"."transaction_allocations" (
  "id" text NOT NULL,
  "sourceTransactionId" text NOT NULL,
  "targetTransactionId" text NOT NULL,
  "amount" numeric(10,2) NOT NULL,
  "currency" text NOT NULL,
  "date" timestamp(3) NOT NULL,
  "note" text NULL,
  "status" "public"."AllocationStatus" NOT NULL DEFAULT 'ACTIVE',
  "orgId" text NULL,
  "createdById" text NOT NULL,
  "createdAt" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "reversedAt" timestamp(3) NULL,
  "reversedById" text NULL,
  PRIMARY KEY ("id"),
  CONSTRAINT "transaction_allocations_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "public"."users" ("id") ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT "transaction_allocations_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "public"."organisations" ("id") ON UPDATE CASCADE ON DELETE SET NULL,
  CONSTRAINT "transaction_allocations_reversedById_fkey" FOREIGN KEY ("reversedById") REFERENCES "public"."users" ("id") ON UPDATE CASCADE ON DELETE SET NULL,
  CONSTRAINT "transaction_allocations_sourceTransactionId_fkey" FOREIGN KEY ("sourceTransactionId") REFERENCES "public"."transactions" ("id") ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT "transaction_allocations_targetTransactionId_fkey" FOREIGN KEY ("targetTransactionId") REFERENCES "public"."transactions" ("id") ON UPDATE CASCADE ON DELETE CASCADE
);
-- Create index "transaction_allocations_orgId_idx" to table: "transaction_allocations"
CREATE INDEX "transaction_allocations_orgId_idx" ON "public"."transaction_allocations" ("orgId");
-- Create index "transaction_allocations_sourceTransactionId_status_idx" to table: "transaction_allocations"
CREATE INDEX "transaction_allocations_sourceTransactionId_status_idx" ON "public"."transaction_allocations" ("sourceTransactionId", "status");
-- Create index "transaction_allocations_targetTransactionId_status_idx" to table: "transaction_allocations"
CREATE INDEX "transaction_allocations_targetTransactionId_status_idx" ON "public"."transaction_allocations" ("targetTransactionId", "status");
-- Guards Prisma cannot express. Table is new and empty, so no NOT VALID/VALIDATE split
-- is needed (that pattern is for ADD CONSTRAINT on a populated table).
ALTER TABLE "public"."transaction_allocations"
  ADD CONSTRAINT "transaction_allocations_amount_positive" CHECK ("amount" > 0),
  ADD CONSTRAINT "transaction_allocations_distinct_endpoints" CHECK ("sourceTransactionId" <> "targetTransactionId");
