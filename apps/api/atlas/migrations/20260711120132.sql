-- Add value to enum type: "admin_action"
ALTER TYPE "public"."admin_action" ADD VALUE 'PLAN_CREATED';
-- Add value to enum type: "admin_action"
ALTER TYPE "public"."admin_action" ADD VALUE 'PLAN_UPDATED';
-- Add value to enum type: "admin_action"
ALTER TYPE "public"."admin_action" ADD VALUE 'PLAN_CANCELLED';
-- Add value to enum type: "admin_action"
ALTER TYPE "public"."admin_action" ADD VALUE 'PLAN_SYNCED';
-- Create enum type "plan_status"
CREATE TYPE "public"."plan_status" AS ENUM ('ACTIVE', 'INACTIVE', 'CANCELLED');
-- Modify "admin_audit_logs" table
ALTER TABLE "public"."admin_audit_logs" DROP CONSTRAINT "admin_audit_logs_targetUserId_fkey", ALTER COLUMN "targetUserId" DROP NOT NULL, ADD CONSTRAINT "admin_audit_logs_targetUserId_fkey" FOREIGN KEY ("targetUserId") REFERENCES "public"."users" ("id") ON UPDATE CASCADE ON DELETE SET NULL;
-- Create "plans" table
CREATE TABLE "public"."plans" (
  "id" text NOT NULL,
  "tier" "public"."SubscriptionTier" NULL,
  "interval" text NOT NULL,
  "currency" text NOT NULL,
  "amount" numeric(10,2) NOT NULL,
  "name" text NOT NULL,
  "provider" text NOT NULL DEFAULT 'flutterwave',
  "providerPlanId" text NOT NULL,
  "status" "public"."plan_status" NOT NULL DEFAULT 'ACTIVE',
  "createdAt" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" timestamp(3) NOT NULL,
  "createdById" text NULL,
  PRIMARY KEY ("id"),
  CONSTRAINT "plans_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "public"."users" ("id") ON UPDATE CASCADE ON DELETE SET NULL
);
-- Create index "plans_providerPlanId_key" to table: "plans"
CREATE UNIQUE INDEX "plans_providerPlanId_key" ON "public"."plans" ("providerPlanId");
-- Create index "plans_tier_interval_currency_status_idx" to table: "plans"
CREATE INDEX "plans_tier_interval_currency_status_idx" ON "public"."plans" ("tier", "interval", "currency", "status");
-- Modify "subscriptions" table
ALTER TABLE "public"."subscriptions" DROP COLUMN "billingInterval", ADD CONSTRAINT "subscriptions_planId_fkey" FOREIGN KEY ("planId") REFERENCES "public"."plans" ("id") ON UPDATE CASCADE ON DELETE SET NULL;
