-- Create enum type "admin_action"
CREATE TYPE "public"."admin_action" AS ENUM ('PROVISION_PRO', 'DEPROVISION_PRO', 'SET_USER_ROLE');
-- Create "admin_audit_logs" table
CREATE TABLE "public"."admin_audit_logs" (
  "id" text NOT NULL,
  "actorId" text NOT NULL,
  "action" "public"."admin_action" NOT NULL,
  "targetUserId" text NOT NULL,
  "metadata" jsonb NULL,
  "createdAt" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY ("id")
);
-- Create index "admin_audit_logs_action_idx" to table: "admin_audit_logs"
CREATE INDEX "admin_audit_logs_action_idx" ON "public"."admin_audit_logs" ("action");
-- Create index "admin_audit_logs_actorId_idx" to table: "admin_audit_logs"
CREATE INDEX "admin_audit_logs_actorId_idx" ON "public"."admin_audit_logs" ("actorId");
-- Create index "admin_audit_logs_createdAt_idx" to table: "admin_audit_logs"
CREATE INDEX "admin_audit_logs_createdAt_idx" ON "public"."admin_audit_logs" ("createdAt");
-- Create index "admin_audit_logs_targetUserId_idx" to table: "admin_audit_logs"
CREATE INDEX "admin_audit_logs_targetUserId_idx" ON "public"."admin_audit_logs" ("targetUserId");
-- Add foreign key constraints for "admin_audit_logs" table
ALTER TABLE "public"."admin_audit_logs" ADD CONSTRAINT "admin_audit_logs_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "public"."users" ("id") ON UPDATE CASCADE ON DELETE RESTRICT NOT VALID;
ALTER TABLE "public"."admin_audit_logs" VALIDATE CONSTRAINT "admin_audit_logs_actorId_fkey";
ALTER TABLE "public"."admin_audit_logs" ADD CONSTRAINT "admin_audit_logs_targetUserId_fkey" FOREIGN KEY ("targetUserId") REFERENCES "public"."users" ("id") ON UPDATE CASCADE ON DELETE RESTRICT NOT VALID;
ALTER TABLE "public"."admin_audit_logs" VALIDATE CONSTRAINT "admin_audit_logs_targetUserId_fkey";
