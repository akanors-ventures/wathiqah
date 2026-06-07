-- Create OrgRole enum
CREATE TYPE "OrgRole" AS ENUM ('ADMIN', 'OPERATOR', 'VIEWER');

-- Create AttributionMode enum
CREATE TYPE "AttributionMode" AS ENUM ('ORG_ONLY', 'ORG_AND_OPERATOR');

-- Create organisations table
CREATE TABLE "organisations" (
  "id"              TEXT NOT NULL,
  "name"            TEXT NOT NULL,
  "slug"            TEXT NOT NULL,
  "description"     TEXT,
  "logoUrl"         TEXT,
  "industry"        TEXT,
  "attributionMode" "AttributionMode" NOT NULL DEFAULT 'ORG_ONLY',
  "createdAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"       TIMESTAMP(3) NOT NULL,
  CONSTRAINT "organisations_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "organisations_slug_key" ON "organisations"("slug");

-- Create organisation_members table
CREATE TABLE "organisation_members" (
  "id"       TEXT NOT NULL,
  "orgId"    TEXT NOT NULL,
  "userId"   TEXT NOT NULL,
  "role"     "OrgRole" NOT NULL DEFAULT 'OPERATOR',
  "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "organisation_members_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "organisation_members_orgId_userId_key" ON "organisation_members"("orgId", "userId");
ALTER TABLE "organisation_members"
  ADD CONSTRAINT "organisation_members_orgId_fkey"
  FOREIGN KEY ("orgId") REFERENCES "organisations"("id") NOT VALID;
ALTER TABLE "organisation_members"
  VALIDATE CONSTRAINT "organisation_members_orgId_fkey";
ALTER TABLE "organisation_members"
  ADD CONSTRAINT "organisation_members_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "users"("id") NOT VALID;
ALTER TABLE "organisation_members"
  VALIDATE CONSTRAINT "organisation_members_userId_fkey";

-- Create org_subscriptions table
CREATE TABLE "org_subscriptions" (
  "id"                TEXT NOT NULL,
  "orgId"             TEXT NOT NULL,
  "tier"              "SubscriptionTier" NOT NULL DEFAULT 'FREE',
  "status"            TEXT NOT NULL,
  "provider"          TEXT NOT NULL,
  "externalId"        TEXT,
  "currentPeriodEnd"  TIMESTAMP(3),
  "cancelAtPeriodEnd" BOOLEAN NOT NULL DEFAULT false,
  "createdAt"         TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"         TIMESTAMP(3) NOT NULL,
  CONSTRAINT "org_subscriptions_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "org_subscriptions_orgId_key" ON "org_subscriptions"("orgId");
CREATE UNIQUE INDEX "org_subscriptions_externalId_key" ON "org_subscriptions"("externalId");
ALTER TABLE "org_subscriptions"
  ADD CONSTRAINT "org_subscriptions_orgId_fkey"
  FOREIGN KEY ("orgId") REFERENCES "organisations"("id") NOT VALID;
ALTER TABLE "org_subscriptions"
  VALIDATE CONSTRAINT "org_subscriptions_orgId_fkey";

-- Create org_events table
CREATE TABLE "org_events" (
  "id"          TEXT NOT NULL,
  "orgId"       TEXT NOT NULL,
  "title"       TEXT NOT NULL,
  "date"        TIMESTAMP(3) NOT NULL,
  "endDate"     TIMESTAMP(3),
  "category"    TEXT NOT NULL,
  "notes"       TEXT,
  "isRecurring" BOOLEAN NOT NULL DEFAULT false,
  "recurrence"  TEXT,
  "createdById" TEXT NOT NULL,
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"   TIMESTAMP(3) NOT NULL,
  CONSTRAINT "org_events_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "org_events_orgId_date_idx" ON "org_events"("orgId", "date");
ALTER TABLE "org_events"
  ADD CONSTRAINT "org_events_orgId_fkey"
  FOREIGN KEY ("orgId") REFERENCES "organisations"("id") NOT VALID;
ALTER TABLE "org_events"
  VALIDATE CONSTRAINT "org_events_orgId_fkey";
ALTER TABLE "org_events"
  ADD CONSTRAINT "org_events_createdById_fkey"
  FOREIGN KEY ("createdById") REFERENCES "users"("id") NOT VALID;
ALTER TABLE "org_events"
  VALIDATE CONSTRAINT "org_events_createdById_fkey";

-- Create org_notes table
CREATE TABLE "org_notes" (
  "id"          TEXT NOT NULL,
  "orgId"       TEXT NOT NULL,
  "body"        TEXT NOT NULL,
  "category"    TEXT,
  "createdById" TEXT NOT NULL,
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"   TIMESTAMP(3) NOT NULL,
  CONSTRAINT "org_notes_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "org_notes_orgId_createdAt_idx" ON "org_notes"("orgId", "createdAt");
ALTER TABLE "org_notes"
  ADD CONSTRAINT "org_notes_orgId_fkey"
  FOREIGN KEY ("orgId") REFERENCES "organisations"("id") NOT VALID;
ALTER TABLE "org_notes"
  VALIDATE CONSTRAINT "org_notes_orgId_fkey";
ALTER TABLE "org_notes"
  ADD CONSTRAINT "org_notes_createdById_fkey"
  FOREIGN KEY ("createdById") REFERENCES "users"("id") NOT VALID;
ALTER TABLE "org_notes"
  VALIDATE CONSTRAINT "org_notes_createdById_fkey";

-- Add orgId to existing tables
ALTER TABLE "transactions" ADD COLUMN "orgId" TEXT;
ALTER TABLE "transactions"
  ADD CONSTRAINT "transactions_orgId_fkey"
  FOREIGN KEY ("orgId") REFERENCES "organisations"("id") NOT VALID;
ALTER TABLE "transactions"
  VALIDATE CONSTRAINT "transactions_orgId_fkey";

ALTER TABLE "contacts" ADD COLUMN "orgId" TEXT;
ALTER TABLE "contacts"
  ADD CONSTRAINT "contacts_orgId_fkey"
  FOREIGN KEY ("orgId") REFERENCES "organisations"("id") NOT VALID;
ALTER TABLE "contacts"
  VALIDATE CONSTRAINT "contacts_orgId_fkey";

ALTER TABLE "projects" ADD COLUMN "orgId" TEXT;
ALTER TABLE "projects"
  ADD CONSTRAINT "projects_orgId_fkey"
  FOREIGN KEY ("orgId") REFERENCES "organisations"("id") NOT VALID;
ALTER TABLE "projects"
  VALIDATE CONSTRAINT "projects_orgId_fkey";

ALTER TABLE "promises" ADD COLUMN "orgId" TEXT;
ALTER TABLE "promises"
  ADD CONSTRAINT "promises_orgId_fkey"
  FOREIGN KEY ("orgId") REFERENCES "organisations"("id") NOT VALID;
ALTER TABLE "promises"
  VALIDATE CONSTRAINT "promises_orgId_fkey";
