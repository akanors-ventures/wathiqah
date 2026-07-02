-- Create enum type "NotificationType"
CREATE TYPE "public"."NotificationType" AS ENUM ('WITNESS_INVITED', 'WITNESS_ACKNOWLEDGED', 'WITNESS_DECLINED', 'WITNESS_TRANSACTION_MODIFIED', 'WITNESS_TRANSACTION_CANCELLED', 'PROVISIONING_GRANTED', 'PROVISIONING_REVOKED', 'PROVISIONING_EXPIRED', 'ROLE_PROMOTED', 'ROLE_DEMOTED');
-- Create "notifications" table
CREATE TABLE "public"."notifications" (
  "id" text NOT NULL,
  "userId" text NOT NULL,
  "type" "public"."NotificationType" NOT NULL,
  "title" text NOT NULL,
  "body" text NOT NULL,
  "link" text NULL,
  "read" boolean NOT NULL DEFAULT false,
  "createdAt" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY ("id"),
  CONSTRAINT "notifications_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users" ("id") ON UPDATE CASCADE ON DELETE CASCADE
);
-- Create index "notifications_userId_createdAt_idx" to table: "notifications"
CREATE INDEX "notifications_userId_createdAt_idx" ON "public"."notifications" ("userId", "createdAt" DESC);
-- Create index "notifications_userId_read_idx" to table: "notifications"
CREATE INDEX "notifications_userId_read_idx" ON "public"."notifications" ("userId", "read");
