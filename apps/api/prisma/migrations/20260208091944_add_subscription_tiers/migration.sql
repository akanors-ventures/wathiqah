-- CreateEnum
CREATE TYPE "SubscriptionTier" AS ENUM ('FREE', 'PRO');

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "featureUsage" JSONB DEFAULT '{}',
ADD COLUMN     "isDonated" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "subscriptionId" TEXT,
ADD COLUMN     "subscriptionStatus" TEXT,
ADD COLUMN     "tier" "SubscriptionTier" NOT NULL DEFAULT 'FREE';
