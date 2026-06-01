-- Modify "contacts" table
ALTER TABLE "public"."contacts" DROP CONSTRAINT "contacts_orgId_fkey", ADD CONSTRAINT "contacts_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "public"."organisations" ("id") ON UPDATE CASCADE ON DELETE SET NULL;
-- Modify "org_events" table
ALTER TABLE "public"."org_events" DROP CONSTRAINT "org_events_createdById_fkey", DROP CONSTRAINT "org_events_orgId_fkey", ADD CONSTRAINT "org_events_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "public"."users" ("id") ON UPDATE CASCADE ON DELETE RESTRICT, ADD CONSTRAINT "org_events_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "public"."organisations" ("id") ON UPDATE CASCADE ON DELETE RESTRICT;
-- Modify "org_notes" table
ALTER TABLE "public"."org_notes" DROP CONSTRAINT "org_notes_createdById_fkey", DROP CONSTRAINT "org_notes_orgId_fkey", ADD CONSTRAINT "org_notes_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "public"."users" ("id") ON UPDATE CASCADE ON DELETE RESTRICT, ADD CONSTRAINT "org_notes_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "public"."organisations" ("id") ON UPDATE CASCADE ON DELETE RESTRICT;
-- Modify "org_subscriptions" table
ALTER TABLE "public"."org_subscriptions" DROP CONSTRAINT "org_subscriptions_orgId_fkey", ADD CONSTRAINT "org_subscriptions_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "public"."organisations" ("id") ON UPDATE CASCADE ON DELETE RESTRICT;
-- Modify "organisation_members" table
ALTER TABLE "public"."organisation_members" DROP CONSTRAINT "organisation_members_orgId_fkey", DROP CONSTRAINT "organisation_members_userId_fkey", ADD CONSTRAINT "organisation_members_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "public"."organisations" ("id") ON UPDATE CASCADE ON DELETE RESTRICT, ADD CONSTRAINT "organisation_members_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users" ("id") ON UPDATE CASCADE ON DELETE RESTRICT;
-- Modify "projects" table
ALTER TABLE "public"."projects" DROP CONSTRAINT "projects_orgId_fkey", ADD CONSTRAINT "projects_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "public"."organisations" ("id") ON UPDATE CASCADE ON DELETE SET NULL;
-- Modify "promises" table
ALTER TABLE "public"."promises" DROP CONSTRAINT "promises_orgId_fkey", ADD CONSTRAINT "promises_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "public"."organisations" ("id") ON UPDATE CASCADE ON DELETE SET NULL;
-- Modify "transactions" table
ALTER TABLE "public"."transactions" DROP CONSTRAINT "transactions_orgId_fkey", ADD CONSTRAINT "transactions_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "public"."organisations" ("id") ON UPDATE CASCADE ON DELETE SET NULL;
-- Create "user_notes" table
CREATE TABLE "public"."user_notes" (
  "id" text NOT NULL,
  "userId" text NOT NULL,
  "title" text NOT NULL,
  "body" text NOT NULL,
  "category" text NULL,
  "createdAt" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" timestamp(3) NOT NULL,
  PRIMARY KEY ("id"),
  CONSTRAINT "user_notes_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users" ("id") ON UPDATE CASCADE ON DELETE RESTRICT
);
-- Create index "user_notes_userId_createdAt_idx" to table: "user_notes"
CREATE INDEX "user_notes_userId_createdAt_idx" ON "public"."user_notes" ("userId", "createdAt");
