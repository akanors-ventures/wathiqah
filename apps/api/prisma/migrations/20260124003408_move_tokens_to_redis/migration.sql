/*
  Warnings:

  - You are about to drop the column `resetTokenExpiry` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `resetTokenHash` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `inviteToken` on the `witnesses` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "witnesses_inviteToken_key";

-- AlterTable
ALTER TABLE "users" DROP COLUMN "resetTokenExpiry",
DROP COLUMN "resetTokenHash";

-- AlterTable
ALTER TABLE "witnesses" DROP COLUMN "inviteToken";
