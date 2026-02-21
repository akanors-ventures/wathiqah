import { Injectable, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { SUBSCRIPTION_LIMITS, TierLimits } from './subscription.constants';
import { SubscriptionTier } from '../../generated/prisma/enums';

interface FeatureUsage {
  [key: string]: number;
}

@Injectable()
export class SubscriptionService {
  constructor(private prisma: PrismaService) {}

  async handleSubscriptionSuccess(
    userId: string,
    subscriptionId: string,
    provider: 'stripe' | 'flutterwave' | 'lemonsqueezy',
    tier: SubscriptionTier,
  ) {
    const now = new Date();
    const periodEnd = new Date(now);
    periodEnd.setMonth(periodEnd.getMonth() + 1); // Default to 1 month if not provided

    return this.activateSubscription({
      userId,
      externalId: subscriptionId,
      status: 'active',
      provider,
      tier: tier || SubscriptionTier.PRO,
      currentPeriodStart: now,
      currentPeriodEnd: periodEnd,
    });
  }

  private async activateSubscription(data: {
    userId: string;
    externalId: string;
    status: string;
    provider: 'stripe' | 'flutterwave' | 'lemonsqueezy';
    tier: SubscriptionTier;
    currentPeriodStart: Date;
    currentPeriodEnd: Date;
  }) {
    const {
      userId,
      externalId,
      status,
      provider,
      tier,
      currentPeriodStart,
      currentPeriodEnd,
    } = data;

    await this.prisma.subscription.upsert({
      where: { userId },
      update: {
        externalId,
        status,
        provider,
        tier,
        currentPeriodStart,
        currentPeriodEnd,
      },
      create: {
        userId,
        externalId,
        status,
        provider,
        tier,
        currentPeriodStart,
        currentPeriodEnd,
      },
    });

    return this.prisma.user.update({
      where: { id: userId },
      data: {
        tier,
        subscriptionStatus: status,
        subscriptionId: externalId,
      },
    });
  }

  async updateSubscriptionStatus(data: {
    externalId: string;
    status: string;
    currentPeriodStart?: Date;
    currentPeriodEnd?: Date;
    cancelAtPeriodEnd?: boolean;
  }) {
    const {
      externalId,
      status,
      currentPeriodStart,
      currentPeriodEnd,
      cancelAtPeriodEnd,
    } = data;

    const subscription = await this.prisma.subscription.findFirst({
      where: { externalId },
    });

    if (!subscription) return;

    await this.prisma.subscription.update({
      where: { id: subscription.id },
      data: {
        status,
        ...(currentPeriodStart && { currentPeriodStart }),
        ...(currentPeriodEnd && { currentPeriodEnd }),
        ...(cancelAtPeriodEnd !== undefined && { cancelAtPeriodEnd }),
      },
    });

    return this.prisma.user.update({
      where: { id: subscription.userId },
      data: {
        subscriptionStatus: status,
      },
    });
  }

  async deactivateSubscription(externalId: string) {
    const subscription = await this.prisma.subscription.findFirst({
      where: { externalId },
    });

    if (!subscription) return;

    await this.prisma.subscription.update({
      where: { id: subscription.id },
      data: {
        status: 'cancelled',
        tier: SubscriptionTier.FREE,
      },
    });

    return this.prisma.user.update({
      where: { id: subscription.userId },
      data: {
        tier: SubscriptionTier.FREE,
        subscriptionStatus: 'cancelled',
      },
    });
  }

  async checkFeatureLimit(
    userId: string,
    feature: keyof TierLimits,
    required = 1,
  ) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { tier: true, featureUsage: true },
    });

    if (!user) throw new ForbiddenException('User not found');

    const limits = SUBSCRIPTION_LIMITS[user.tier];
    const limitValue = limits[feature];

    if (typeof limitValue === 'boolean') {
      if (!limitValue) {
        throw new ForbiddenException(
          `The feature "${feature}" is not available on your current plan.`,
        );
      }
      return true;
    }

    if (typeof limitValue === 'number') {
      // Special handling for maxContacts which is a total count, not per month
      if (feature === 'maxContacts') {
        const contactCount = await this.prisma.contact.count({
          where: { userId },
        });

        if (contactCount + required > limitValue) {
          throw new ForbiddenException(
            `You have reached the maximum number of contacts (${limitValue}) allowed on your current plan.`,
          );
        }
        return true;
      }

      const now = new Date();
      const monthKey = `${feature}_${now.getFullYear()}_${now.getMonth() + 1}`;
      const usage = (user.featureUsage as FeatureUsage)?.[monthKey] || 0;

      if (usage + required > limitValue) {
        throw new ForbiddenException(
          `You have reached the monthly limit for "${feature}" on your current plan.`,
        );
      }
      return true;
    }

    return true;
  }

  async incrementFeatureUsage(
    userId: string,
    feature: keyof TierLimits,
    increment = 1,
  ) {
    // maxContacts doesn't need incrementing as it's checked by counting records
    if (feature === 'maxContacts') return;

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { tier: true, featureUsage: true },
    });

    if (!user) return;

    // Only increment for numerical features (like maxWitnessesPerMonth)
    const limits = SUBSCRIPTION_LIMITS[user.tier];
    const limitValue = limits[feature];

    if (typeof limitValue !== 'number') {
      return;
    }

    const currentUsage: FeatureUsage =
      (user.featureUsage as FeatureUsage) || {};
    const now = new Date();
    const monthKey = `${feature}_${now.getFullYear()}_${now.getMonth() + 1}`;

    const newUsage = {
      ...currentUsage,
      [monthKey]: (currentUsage[monthKey] || 0) + increment,
    };

    return this.prisma.user.update({
      where: { id: userId },
      data: { featureUsage: newUsage },
    });
  }

  async canUseFeature(
    userId: string,
    feature: keyof TierLimits,
    required = 1,
  ): Promise<boolean> {
    try {
      await this.checkFeatureLimit(userId, feature, required);
      return true;
    } catch {
      return false;
    }
  }
}
