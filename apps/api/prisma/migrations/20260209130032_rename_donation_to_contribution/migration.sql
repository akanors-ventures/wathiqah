/*
  Warnings:

  - The values [DONATION] on the enum `PaymentType` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `isDonated` on the `users` table. All the data in the column will be lost.
  - You are about to drop the `donations` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "ContributionStatus" AS ENUM ('PENDING', 'SUCCESSFUL', 'FAILED');

-- AlterEnum
BEGIN;
CREATE TYPE "PaymentType_new" AS ENUM ('SUBSCRIPTION', 'CONTRIBUTION');
ALTER TABLE "payments" ALTER COLUMN "type" TYPE "PaymentType_new" USING ("type"::text::"PaymentType_new");
ALTER TYPE "PaymentType" RENAME TO "PaymentType_old";
ALTER TYPE "PaymentType_new" RENAME TO "PaymentType";
DROP TYPE "public"."PaymentType_old";
COMMIT;

-- DropForeignKey
ALTER TABLE "donations" DROP CONSTRAINT "donations_donorId_fkey";

-- AlterTable
ALTER TABLE "users" DROP COLUMN "isDonated",
ADD COLUMN     "isContributor" BOOLEAN NOT NULL DEFAULT false;

-- DropTable
DROP TABLE "donations";

-- DropEnum
DROP TYPE "DonationStatus";

-- CreateTable
CREATE TABLE "contributions" (
    "id" TEXT NOT NULL,
    "amount" DECIMAL(20,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'NGN',
    "status" "ContributionStatus" NOT NULL DEFAULT 'PENDING',
    "paymentProvider" TEXT,
    "paymentRef" TEXT,
    "donorId" TEXT,
    "donorName" TEXT,
    "donorEmail" TEXT,
    "message" TEXT,
    "isAnonymous" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "contributions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "contributions_paymentRef_key" ON "contributions"("paymentRef");

-- AddForeignKey
ALTER TABLE "contributions" ADD CONSTRAINT "contributions_donorId_fkey" FOREIGN KEY ("donorId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
