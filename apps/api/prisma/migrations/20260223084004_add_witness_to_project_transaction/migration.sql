/*
  Warnings:

  - A unique constraint covering the columns `[projectTransactionId,userId]` on the table `witnesses` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "witnesses" ADD COLUMN     "projectTransactionId" TEXT,
ALTER COLUMN "transactionId" DROP NOT NULL;

-- CreateIndex
CREATE INDEX "payments_userId_idx" ON "payments"("userId");

-- CreateIndex
CREATE INDEX "payments_provider_idx" ON "payments"("provider");

-- CreateIndex
CREATE INDEX "payments_status_idx" ON "payments"("status");

-- CreateIndex
CREATE INDEX "payments_createdAt_idx" ON "payments"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "witnesses_projectTransactionId_userId_key" ON "witnesses"("projectTransactionId", "userId");

-- AddForeignKey
ALTER TABLE "witnesses" ADD CONSTRAINT "witnesses_projectTransactionId_fkey" FOREIGN KEY ("projectTransactionId") REFERENCES "project_transactions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
