-- Modify "project_transactions" table
ALTER TABLE "public"."project_transactions" ADD COLUMN "contactId" text NULL, ADD COLUMN "contactTransactionType" "public"."TransactionType" NULL, ADD COLUMN "isMirroredFromContact" boolean NOT NULL DEFAULT false, ADD CONSTRAINT "project_transactions_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "public"."contacts" ("id") ON UPDATE CASCADE ON DELETE SET NULL NOT VALID;
-- Validate "project_transactions_contactId_fkey" constraint
ALTER TABLE "public"."project_transactions" VALIDATE CONSTRAINT "project_transactions_contactId_fkey";
-- Modify "transactions" table
ALTER TABLE "public"."transactions" ADD COLUMN "projectTransactionId" text NULL, ADD COLUMN "isMirroredFromProject" boolean NOT NULL DEFAULT false, ADD CONSTRAINT "transactions_projectTransactionId_fkey" FOREIGN KEY ("projectTransactionId") REFERENCES "public"."project_transactions" ("id") ON UPDATE CASCADE ON DELETE RESTRICT NOT VALID;
-- Validate "transactions_projectTransactionId_fkey" constraint
ALTER TABLE "public"."transactions" VALIDATE CONSTRAINT "transactions_projectTransactionId_fkey";
-- Create index "transactions_projectTransactionId_key" to table: "transactions"
CREATE UNIQUE INDEX "transactions_projectTransactionId_key" ON "public"."transactions" ("projectTransactionId");
