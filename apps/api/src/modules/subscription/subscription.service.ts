import { Injectable, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { SUBSCRIPTION_LIMITS, TierLimits } from './subscription.constants';
import { SubscriptionTier } from '../../generated/prisma/enums';
import { Prisma } from '../../generated/prisma/client';
import { BillingInterval } from '../payment/dto/billing-interval.enum';

interface FeatureUsage {
  [key: string]: number;
}

@Injectable()
export class SubscriptionService {
  constructor(private prisma: PrismaService) {}

  async getSubscription(userId: string) {
    return this.prisma.subscription.findUnique({
      where: { userId },
    });
  }

  // Shared by handleSubscriptionSuccess (new period on signup/renewal) and
  // updateSubscriptionStatus (recomputed period on reactivate) so both stay
  // in sync on how an interval maps to a period length. Accepts both our
  // BillingInterval enum ('annual') and a linked Plan's raw Flutterwave
  // interval string ('yearly') — the latter is what a reactivated
  // subscription's plan relation actually stores.
  private computePeriodEnd(
    interval: BillingInterval | string | null | undefined,
    from: Date,
  ): Date {
    const periodEnd = new Date(from);
    const isAnnual =
      interval === BillingInterval.ANNUAL || interval === 'yearly';
    if (isAnnual) {
      periodEnd.setFullYear(periodEnd.getFullYear() + 1);
    } else {
      periodEnd.setMonth(periodEnd.getMonth() + 1);
    }
    return periodEnd;
  }

  async handleSubscriptionSuccess(
    userId: string,
    subscriptionId: string,
    provider: 'stripe' | 'flutterwave' | 'lemonsqueezy',
    tier: SubscriptionTier,
    tx?: Prisma.TransactionClient,
    interval?: BillingInterval,
    planId?: string,
  ) {
    const now = new Date();
    const periodEnd = this.computePeriodEnd(interval, now);

    return this.activateSubscription(
      {
        userId,
        externalId: subscriptionId,
        status: 'active',
        provider,
        tier: tier || SubscriptionTier.PRO,
        currentPeriodStart: now,
        currentPeriodEnd: periodEnd,
        planId: planId ?? null,
      },
      tx,
    );
  }

  private async activateSubscription(
    data: {
      userId: string;
      externalId: string;
      status: string;
      provider: 'stripe' | 'flutterwave' | 'lemonsqueezy';
      tier: SubscriptionTier;
      currentPeriodStart: Date;
      currentPeriodEnd: Date;
      planId: string | null;
    },
    tx?: Prisma.TransactionClient,
  ) {
    const prisma = tx || this.prisma;
    const {
      userId,
      externalId,
      status,
      provider,
      tier,
      currentPeriodStart,
      currentPeriodEnd,
      planId,
    } = data;

    await prisma.subscription.upsert({
      where: { userId },
      update: {
        externalId,
        status,
        provider,
        tier,
        currentPeriodStart,
        currentPeriodEnd,
        planId,
      },
      create: {
        userId,
        externalId,
        status,
        provider,
        tier,
        currentPeriodStart,
        currentPeriodEnd,
        planId,
      },
    });

    return prisma.user.update({
      where: { id: userId },
      data: {
        tier,
        subscriptionStatus: status,
        subscriptionId: externalId,
      },
    });
  }

  async updateSubscriptionStatus(
    data: {
      externalId: string;
      status: string;
      currentPeriodStart?: Date;
      currentPeriodEnd?: Date;
      cancelAtPeriodEnd?: boolean;
      providerSubscriptionId?: string;
      // On reactivate, Flutterwave's /activate response carries no new
      // billing period. If the subscription's existing currentPeriodEnd is
      // still in the future (cancelled but not yet lapsed — cancelAtPeriodEnd
      // just meant "don't auto-renew"), it's left untouched so the user keeps
      // the time they already paid for. Only a lapsed/missing period gets
      // recomputed from the linked Plan interval, starting now.
      refreshPeriodEnd?: boolean;
    },
    tx?: Prisma.TransactionClient,
  ) {
    const prisma = tx || this.prisma;
    const {
      externalId,
      status,
      currentPeriodStart,
      currentPeriodEnd,
      cancelAtPeriodEnd,
      providerSubscriptionId,
      refreshPeriodEnd,
    } = data;

    const subscription = await prisma.subscription.findFirst({
      where: { externalId },
      include: { plan: true },
    });

    if (!subscription) return;

    const now = new Date();
    const periodHasLapsed =
      !subscription.currentPeriodEnd || subscription.currentPeriodEnd <= now;
    const shouldRecomputePeriod = refreshPeriodEnd && periodHasLapsed;

    const resolvedPeriodEnd =
      currentPeriodEnd ??
      (shouldRecomputePeriod
        ? this.computePeriodEnd(subscription.plan?.interval, now)
        : undefined);

    await prisma.subscription.update({
      where: { id: subscription.id },
      data: {
        status,
        ...(currentPeriodStart && { currentPeriodStart }),
        ...(resolvedPeriodEnd && { currentPeriodEnd: resolvedPeriodEnd }),
        ...(shouldRecomputePeriod &&
          !currentPeriodStart && { currentPeriodStart: now }),
        ...(cancelAtPeriodEnd !== undefined && { cancelAtPeriodEnd }),
        ...(providerSubscriptionId && { providerSubscriptionId }),
      },
    });

    return prisma.user.update({
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
      // Special handling for features checked against actual DB record counts
      if (feature === 'maxContacts') {
        if (limitValue === -1) return true;

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

      if (feature === 'maxNotes') {
        if (limitValue === -1) return true;

        const noteCount = await this.prisma.note.count({
          where: { createdById: userId, orgId: null },
        });

        if (noteCount + required > limitValue) {
          throw new ForbiddenException(
            `You have reached the maximum number of personal notes (${limitValue}) allowed on your current plan. Upgrade to Pro for unlimited notes.`,
          );
        }
        return true;
      }

      const now = new Date();
      const monthKey = `${feature}_${now.getFullYear()}_${now.getMonth() + 1}`;
      const usage = (user.featureUsage as FeatureUsage)?.[monthKey] || 0;

      // -1 means unlimited
      if (limitValue === -1) return true;

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
    // DB-count features don't need incrementing — they're checked against live record counts
    if (feature === 'maxContacts' || feature === 'maxNotes') return;

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
