-- CreateEnum
CREATE TYPE "OptOutSource" AS ENUM ('REPLY_STOP', 'MANUAL');

-- CreateTable
CREATE TABLE "sms_opt_outs" (
    "id" TEXT NOT NULL,
    "phoneNumber" TEXT NOT NULL,
    "source" "OptOutSource" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sms_opt_outs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "sms_opt_outs_phoneNumber_key" ON "sms_opt_outs"("phoneNumber");
