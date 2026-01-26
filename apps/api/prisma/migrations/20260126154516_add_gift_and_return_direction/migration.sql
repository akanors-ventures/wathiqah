/*
  Warnings:

  - The values [COLLECTED] on the enum `TransactionType` will be removed. If these variants are still used in the database, this will fail.

*/
-- CreateEnum
CREATE TYPE "ReturnDirection" AS ENUM ('TO_ME', 'TO_CONTACT');

-- AlterEnum
BEGIN;
CREATE TYPE "TransactionType_new" AS ENUM ('GIVEN', 'RECEIVED', 'RETURNED', 'GIFT', 'EXPENSE', 'INCOME');
ALTER TABLE "transactions" ALTER COLUMN "type" TYPE "TransactionType_new" USING ("type"::text::"TransactionType_new");
ALTER TYPE "TransactionType" RENAME TO "TransactionType_old";
ALTER TYPE "TransactionType_new" RENAME TO "TransactionType";
DROP TYPE "public"."TransactionType_old";
COMMIT;

-- AlterTable
ALTER TABLE "transactions" ADD COLUMN     "returnDirection" "ReturnDirection";
