-- Rename org_notes to notes (unified note table for org and personal notes)
ALTER TABLE "org_notes" RENAME TO "notes";
ALTER TABLE "notes" RENAME CONSTRAINT "org_notes_pkey" TO "notes_pkey";
ALTER INDEX "org_notes_orgId_createdAt_idx" RENAME TO "notes_orgId_createdAt_idx";
ALTER TABLE "notes" RENAME CONSTRAINT "org_notes_orgId_fkey" TO "notes_orgId_fkey";
ALTER TABLE "notes" RENAME CONSTRAINT "org_notes_createdById_fkey" TO "notes_createdById_fkey";
-- Make orgId nullable (personal notes have no org)
ALTER TABLE "notes" ALTER COLUMN "orgId" DROP NOT NULL;
-- Add title column (optional, primarily for personal notes)
ALTER TABLE "notes" ADD COLUMN "title" text NULL;
-- Add index for personal note queries (by creator)
CREATE INDEX "notes_createdById_createdAt_idx" ON "notes" ("createdById", "createdAt");
