-- Add hasSeenSharedHistory column to users table
ALTER TABLE "users" ADD COLUMN "hasSeenSharedHistory" boolean NOT NULL DEFAULT false;
