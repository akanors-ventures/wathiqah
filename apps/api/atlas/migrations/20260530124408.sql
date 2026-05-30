-- Create enum type "PersonalEntryType"
CREATE TYPE "public"."PersonalEntryType" AS ENUM ('INCOME', 'EXPENSE');
-- Create "personal_entries" table
CREATE TABLE "public"."personal_entries" (
  "id" text NOT NULL,
  "type" "public"."PersonalEntryType" NOT NULL,
  "amount" numeric(10,2) NOT NULL,
  "currency" text NOT NULL DEFAULT 'NGN',
  "category" text NULL,
  "date" timestamp(3) NOT NULL,
  "description" text NULL,
  "createdAt" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdById" text NOT NULL,
  PRIMARY KEY ("id"),
  CONSTRAINT "personal_entries_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "public"."users" ("id") ON UPDATE CASCADE ON DELETE RESTRICT
);
-- Create index "personal_entries_createdById_idx" to table: "personal_entries"
CREATE INDEX "personal_entries_createdById_idx" ON "public"."personal_entries" ("createdById");
