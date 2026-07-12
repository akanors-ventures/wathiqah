-- Modify "subscriptions" table
ALTER TABLE "public"."subscriptions" ADD COLUMN "providerSubscriptionId" text NULL, ADD COLUMN "billingInterval" text NULL;
-- Create index "subscriptions_providerSubscriptionId_key" to table: "subscriptions"
CREATE UNIQUE INDEX "subscriptions_providerSubscriptionId_key" ON "public"."subscriptions" ("providerSubscriptionId");
