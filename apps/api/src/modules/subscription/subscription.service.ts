import { Injectable, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { SUBSCRIPTION_LIMITS, TierLimits } from './subscription.constants';

interface FeatureUsage {
  [key: string]: number;
}

@Injectable()
export class SubscriptionService {
  constructor(private prisma: PrismaService) {}

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
