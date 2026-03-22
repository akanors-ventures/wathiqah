-- Create enum type "user_role"
CREATE TYPE "user_role" AS ENUM ('USER', 'ADMIN');
-- Modify "users" table
ALTER TABLE "users" ADD COLUMN "role" "user_role" NOT NULL DEFAULT 'USER';
-- Modify "subscriptions" table
ALTER TABLE "subscriptions" ADD COLUMN "isProvisioned" boolean NOT NULL DEFAULT false, ADD COLUMN "provisionedById" text NULL, ADD CONSTRAINT "subscriptions_provisionedById_fkey" FOREIGN KEY ("provisionedById") REFERENCES "users" ("id") ON UPDATE CASCADE ON DELETE SET NULL NOT VALID;
-- Validate the foreign key constraint without holding a full table lock
ALTER TABLE "subscriptions" VALIDATE CONSTRAINT "subscriptions_provisionedById_fkey";
