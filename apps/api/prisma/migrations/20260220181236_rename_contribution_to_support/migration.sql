/*
  Warnings:

  - The values [CONTRIBUTION] on the enum `PaymentType` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `isContributor` on the `users` table. All the data in the column will be lost.
  - You are about to drop the `contributions` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "SupportStatus" AS ENUM ('PENDING', 'SUCCESSFUL', 'FAILED');

-- AlterEnum
BEGIN;
CREATE TYPE "PaymentType_new" AS ENUM ('SUBSCRIPTION', 'SUPPORT');
ALTER TABLE "payments" ALTER COLUMN "type" TYPE "PaymentType_new" USING ("type"::text::"PaymentType_new");
ALTER TYPE "PaymentType" RENAME TO "PaymentType_old";
ALTER TYPE "PaymentType_new" RENAME TO "PaymentType";
DROP TYPE "public"."PaymentType_old";
COMMIT;

-- DropForeignKey
ALTER TABLE "contributions" DROP CONSTRAINT "contributions_donorId_fkey";

-- AlterTable
ALTER TABLE "users" DROP COLUMN "isContributor",
ADD COLUMN     "isSupporter" BOOLEAN NOT NULL DEFAULT false;

-- DropTable
DROP TABLE "contributions";

-- DropEnum
DROP TYPE "ContributionStatus";

-- CreateTable
CREATE TABLE "supports" (
    "id" TEXT NOT NULL,
    "amount" DECIMAL(20,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'NGN',
    "status" "SupportStatus" NOT NULL DEFAULT 'PENDING',
    "paymentProvider" TEXT,
    "paymentRef" TEXT,
    "supporterId" TEXT,
    "supporterName" TEXT,
    "supporterEmail" TEXT,
    "message" TEXT,
    "isAnonymous" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "supports_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "supports_paymentRef_key" ON "supports"("paymentRef");

-- AddForeignKey
ALTER TABLE "supports" ADD CONSTRAINT "supports_supporterId_fkey" FOREIGN KEY ("supporterId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
