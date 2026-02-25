-- Create enum type "Priority"
CREATE TYPE "Priority" AS ENUM ('HIGH', 'MEDIUM', 'LOW');
-- Create enum type "AccessStatus"
CREATE TYPE "AccessStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REVOKED');
-- Create enum type "ReturnDirection"
CREATE TYPE "ReturnDirection" AS ENUM ('TO_ME', 'TO_CONTACT');
-- Create enum type "AssetCategory"
CREATE TYPE "AssetCategory" AS ENUM ('FUNDS', 'ITEM');
-- Create enum type "TransactionType"
CREATE TYPE "TransactionType" AS ENUM ('GIVEN', 'RECEIVED', 'RETURNED', 'GIFT', 'EXPENSE', 'INCOME');
-- Create enum type "TransactionStatus"
CREATE TYPE "TransactionStatus" AS ENUM ('PENDING', 'COMPLETED', 'CANCELLED');
-- Create enum type "WitnessStatus"
CREATE TYPE "WitnessStatus" AS ENUM ('PENDING', 'ACKNOWLEDGED', 'DECLINED', 'MODIFIED');
-- Create enum type "ProjectTransactionType"
CREATE TYPE "ProjectTransactionType" AS ENUM ('INCOME', 'EXPENSE');
-- Create enum type "PaymentType"
CREATE TYPE "PaymentType" AS ENUM ('SUBSCRIPTION', 'SUPPORT');
-- Create "exchange_rates" table
CREATE TABLE "exchange_rates" (
  "id" text NOT NULL,
  "from" text NOT NULL,
  "to" text NOT NULL,
  "rate" numeric(18,8) NOT NULL,
  "provider" text NOT NULL,
  "lastUpdated" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY ("id")
);
-- Create index "exchange_rates_from_to_key" to table: "exchange_rates"
CREATE UNIQUE INDEX "exchange_rates_from_to_key" ON "exchange_rates" ("from", "to");
-- Create enum type "PromiseStatus"
CREATE TYPE "PromiseStatus" AS ENUM ('PENDING', 'FULFILLED', 'OVERDUE');
-- Create enum type "InvitationStatus"
CREATE TYPE "InvitationStatus" AS ENUM ('PENDING', 'ACCEPTED', 'EXPIRED', 'CANCELLED');
-- Create enum type "SubscriptionTier"
CREATE TYPE "SubscriptionTier" AS ENUM ('FREE', 'PRO');
-- Create enum type "SupportStatus"
CREATE TYPE "SupportStatus" AS ENUM ('PENDING', 'SUCCESSFUL', 'FAILED');
-- Create enum type "PaymentStatus"
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'SUCCESSFUL', 'FAILED', 'REFUNDED');
-- Create "webhook_logs" table
CREATE TABLE "webhook_logs" (
  "id" text NOT NULL,
  "provider" text NOT NULL,
  "externalId" text NULL,
  "type" text NOT NULL,
  "payload" jsonb NOT NULL,
  "status" text NOT NULL,
  "error" text NULL,
  "createdAt" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY ("id")
);
-- Create "users" table
CREATE TABLE "users" (
  "id" text NOT NULL,
  "email" text NOT NULL,
  "passwordHash" text NULL,
  "createdAt" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "refreshTokenHash" text NULL,
  "isEmailVerified" boolean NOT NULL DEFAULT false,
  "firstName" text NOT NULL,
  "lastName" text NOT NULL,
  "phoneNumber" text NULL,
  "preferredCurrency" text NOT NULL DEFAULT 'NGN',
  "tier" "SubscriptionTier" NOT NULL DEFAULT 'FREE',
  "subscriptionStatus" text NULL,
  "subscriptionId" text NULL,
  "featureUsage" jsonb NULL DEFAULT '{}',
  "isSupporter" boolean NOT NULL DEFAULT false,
  PRIMARY KEY ("id")
);
-- Create index "users_email_key" to table: "users"
CREATE UNIQUE INDEX "users_email_key" ON "users" ("email");
-- Create index "users_phoneNumber_idx" to table: "users"
CREATE INDEX "users_phoneNumber_idx" ON "users" ("phoneNumber");
-- Create "exchange_rate_history" table
CREATE TABLE "exchange_rate_history" (
  "id" text NOT NULL,
  "from" text NOT NULL,
  "to" text NOT NULL,
  "rate" numeric(18,8) NOT NULL,
  "provider" text NOT NULL,
  "createdAt" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY ("id")
);
-- Create index "exchange_rate_history_from_to_createdAt_idx" to table: "exchange_rate_history"
CREATE INDEX "exchange_rate_history_from_to_createdAt_idx" ON "exchange_rate_history" ("from", "to", "createdAt");
-- Create "access_grants" table
CREATE TABLE "access_grants" (
  "id" text NOT NULL,
  "email" text NOT NULL,
  "token" text NOT NULL,
  "status" "AccessStatus" NOT NULL DEFAULT 'PENDING',
  "createdAt" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expiresAt" timestamp(3) NULL,
  "granterId" text NOT NULL,
  PRIMARY KEY ("id"),
  CONSTRAINT "access_grants_granterId_fkey" FOREIGN KEY ("granterId") REFERENCES "users" ("id") ON UPDATE CASCADE ON DELETE RESTRICT
);
-- Create index "access_grants_token_key" to table: "access_grants"
CREATE UNIQUE INDEX "access_grants_token_key" ON "access_grants" ("token");
-- Create "contacts" table
CREATE TABLE "contacts" (
  "id" text NOT NULL,
  "email" text NULL,
  "phoneNumber" text NULL,
  "createdAt" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "userId" text NOT NULL,
  "firstName" text NOT NULL,
  "lastName" text NOT NULL,
  "linkedUserId" text NULL,
  PRIMARY KEY ("id"),
  CONSTRAINT "contacts_linkedUserId_fkey" FOREIGN KEY ("linkedUserId") REFERENCES "users" ("id") ON UPDATE CASCADE ON DELETE SET NULL,
  CONSTRAINT "contacts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON UPDATE CASCADE ON DELETE RESTRICT
);
-- Create "contact_invitations" table
CREATE TABLE "contact_invitations" (
  "id" text NOT NULL,
  "token" text NOT NULL,
  "status" "InvitationStatus" NOT NULL DEFAULT 'PENDING',
  "createdAt" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expiresAt" timestamp(3) NOT NULL,
  "acceptedAt" timestamp(3) NULL,
  "contactId" text NOT NULL,
  "inviterId" text NOT NULL,
  "invitedUserId" text NULL,
  PRIMARY KEY ("id"),
  CONSTRAINT "contact_invitations_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "contacts" ("id") ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT "contact_invitations_invitedUserId_fkey" FOREIGN KEY ("invitedUserId") REFERENCES "users" ("id") ON UPDATE CASCADE ON DELETE SET NULL,
  CONSTRAINT "contact_invitations_inviterId_fkey" FOREIGN KEY ("inviterId") REFERENCES "users" ("id") ON UPDATE CASCADE ON DELETE RESTRICT
);
-- Create index "contact_invitations_token_key" to table: "contact_invitations"
CREATE UNIQUE INDEX "contact_invitations_token_key" ON "contact_invitations" ("token");
-- Create "payments" table
CREATE TABLE "payments" (
  "id" text NOT NULL,
  "userId" text NOT NULL,
  "amount" numeric(10,2) NOT NULL,
  "currency" text NOT NULL,
  "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
  "provider" text NOT NULL,
  "externalId" text NULL,
  "type" "PaymentType" NOT NULL,
  "metadata" jsonb NULL,
  "createdAt" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" timestamp(3) NOT NULL,
  PRIMARY KEY ("id"),
  CONSTRAINT "payments_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON UPDATE CASCADE ON DELETE RESTRICT
);
-- Create index "payments_createdAt_idx" to table: "payments"
CREATE INDEX "payments_createdAt_idx" ON "payments" ("createdAt");
-- Create index "payments_externalId_key" to table: "payments"
CREATE UNIQUE INDEX "payments_externalId_key" ON "payments" ("externalId");
-- Create index "payments_provider_idx" to table: "payments"
CREATE INDEX "payments_provider_idx" ON "payments" ("provider");
-- Create index "payments_status_idx" to table: "payments"
CREATE INDEX "payments_status_idx" ON "payments" ("status");
-- Create index "payments_userId_idx" to table: "payments"
CREATE INDEX "payments_userId_idx" ON "payments" ("userId");
-- Create "projects" table
CREATE TABLE "projects" (
  "id" text NOT NULL,
  "name" text NOT NULL,
  "description" text NULL,
  "budget" numeric(10,2) NULL,
  "balance" numeric(10,2) NOT NULL DEFAULT 0.00,
  "currency" text NOT NULL DEFAULT 'NGN',
  "userId" text NOT NULL,
  "createdAt" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" timestamp(3) NOT NULL,
  PRIMARY KEY ("id"),
  CONSTRAINT "projects_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON UPDATE CASCADE ON DELETE RESTRICT
);
-- Create "project_transactions" table
CREATE TABLE "project_transactions" (
  "id" text NOT NULL,
  "amount" numeric(10,2) NOT NULL,
  "type" "ProjectTransactionType" NOT NULL,
  "category" text NULL,
  "description" text NULL,
  "date" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "projectId" text NOT NULL,
  "createdAt" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" timestamp(3) NOT NULL,
  PRIMARY KEY ("id"),
  CONSTRAINT "project_transactions_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects" ("id") ON UPDATE CASCADE ON DELETE RESTRICT
);
-- Create "promises" table
CREATE TABLE "promises" (
  "id" text NOT NULL,
  "description" text NOT NULL,
  "promiseTo" text NOT NULL,
  "dueDate" timestamp(3) NOT NULL,
  "notes" text NULL,
  "priority" "Priority" NOT NULL DEFAULT 'MEDIUM',
  "category" text NULL,
  "status" "PromiseStatus" NOT NULL DEFAULT 'PENDING',
  "createdAt" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" timestamp(3) NOT NULL,
  "userId" text NOT NULL,
  PRIMARY KEY ("id"),
  CONSTRAINT "promises_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON UPDATE CASCADE ON DELETE RESTRICT
);
-- Create "subscriptions" table
CREATE TABLE "subscriptions" (
  "id" text NOT NULL,
  "userId" text NOT NULL,
  "tier" "SubscriptionTier" NOT NULL DEFAULT 'FREE',
  "status" text NOT NULL,
  "provider" text NOT NULL,
  "externalId" text NULL,
  "planId" text NULL,
  "currentPeriodStart" timestamp(3) NULL,
  "currentPeriodEnd" timestamp(3) NULL,
  "cancelAtPeriodEnd" boolean NOT NULL DEFAULT false,
  "canceledAt" timestamp(3) NULL,
  "endedAt" timestamp(3) NULL,
  "createdAt" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" timestamp(3) NOT NULL,
  PRIMARY KEY ("id"),
  CONSTRAINT "subscriptions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON UPDATE CASCADE ON DELETE RESTRICT
);
-- Create index "subscriptions_externalId_key" to table: "subscriptions"
CREATE UNIQUE INDEX "subscriptions_externalId_key" ON "subscriptions" ("externalId");
-- Create index "subscriptions_userId_key" to table: "subscriptions"
CREATE UNIQUE INDEX "subscriptions_userId_key" ON "subscriptions" ("userId");
-- Create "supports" table
CREATE TABLE "supports" (
  "id" text NOT NULL,
  "amount" numeric(20,2) NOT NULL,
  "currency" text NOT NULL DEFAULT 'NGN',
  "status" "SupportStatus" NOT NULL DEFAULT 'PENDING',
  "paymentProvider" text NULL,
  "paymentRef" text NULL,
  "supporterId" text NULL,
  "supporterName" text NULL,
  "supporterEmail" text NULL,
  "message" text NULL,
  "isAnonymous" boolean NOT NULL DEFAULT false,
  "createdAt" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" timestamp(3) NOT NULL,
  PRIMARY KEY ("id"),
  CONSTRAINT "supports_supporterId_fkey" FOREIGN KEY ("supporterId") REFERENCES "users" ("id") ON UPDATE CASCADE ON DELETE SET NULL
);
-- Create index "supports_paymentRef_key" to table: "supports"
CREATE UNIQUE INDEX "supports_paymentRef_key" ON "supports" ("paymentRef");
-- Create "transactions" table
CREATE TABLE "transactions" (
  "id" text NOT NULL,
  "category" "AssetCategory" NOT NULL DEFAULT 'FUNDS',
  "amount" numeric(10,2) NULL,
  "itemName" text NULL,
  "quantity" integer NULL DEFAULT 1,
  "type" "TransactionType" NOT NULL,
  "date" timestamp(3) NOT NULL,
  "description" text NULL,
  "createdAt" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "contactId" text NULL,
  "createdById" text NOT NULL,
  "status" "TransactionStatus" NOT NULL DEFAULT 'COMPLETED',
  "returnDirection" "ReturnDirection" NULL,
  "parentId" text NULL,
  "currency" text NOT NULL DEFAULT 'NGN',
  PRIMARY KEY ("id"),
  CONSTRAINT "transactions_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "contacts" ("id") ON UPDATE CASCADE ON DELETE SET NULL,
  CONSTRAINT "transactions_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users" ("id") ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT "transactions_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "transactions" ("id") ON UPDATE CASCADE ON DELETE SET NULL
);
-- Create "transaction_history" table
CREATE TABLE "transaction_history" (
  "id" text NOT NULL,
  "transactionId" text NOT NULL,
  "userId" text NOT NULL,
  "previousState" jsonb NOT NULL,
  "newState" jsonb NOT NULL,
  "changeType" text NOT NULL,
  "createdAt" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY ("id"),
  CONSTRAINT "transaction_history_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "transactions" ("id") ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT "transaction_history_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON UPDATE CASCADE ON DELETE RESTRICT
);
-- Create "witnesses" table
CREATE TABLE "witnesses" (
  "id" text NOT NULL,
  "status" "WitnessStatus" NOT NULL DEFAULT 'PENDING',
  "invitedAt" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "acknowledgedAt" timestamp(3) NULL,
  "transactionId" text NULL,
  "projectTransactionId" text NULL,
  "userId" text NOT NULL,
  PRIMARY KEY ("id"),
  CONSTRAINT "witnesses_projectTransactionId_fkey" FOREIGN KEY ("projectTransactionId") REFERENCES "project_transactions" ("id") ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT "witnesses_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "transactions" ("id") ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT "witnesses_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON UPDATE CASCADE ON DELETE RESTRICT
);
-- Create index "witnesses_projectTransactionId_userId_key" to table: "witnesses"
CREATE UNIQUE INDEX "witnesses_projectTransactionId_userId_key" ON "witnesses" ("projectTransactionId", "userId");
-- Create index "witnesses_transactionId_userId_key" to table: "witnesses"
CREATE UNIQUE INDEX "witnesses_transactionId_userId_key" ON "witnesses" ("transactionId", "userId");
