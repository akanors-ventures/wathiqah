-- Add CASCADE delete to notes_createdById_fkey so that deleting a user
-- automatically removes their notes (personal and org-scoped).
ALTER TABLE "public"."notes" DROP CONSTRAINT "notes_createdById_fkey";
ALTER TABLE "public"."notes" ADD CONSTRAINT "notes_createdById_fkey"
  FOREIGN KEY ("createdById") REFERENCES "public"."users" ("id")
  ON UPDATE CASCADE ON DELETE CASCADE NOT VALID;
ALTER TABLE "public"."notes" VALIDATE CONSTRAINT "notes_createdById_fkey";
