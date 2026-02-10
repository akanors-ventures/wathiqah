import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  lemonSqueezySetup,
  createCheckout,
  cancelSubscription,
} from '@lemonsqueezy/lemonsqueezy.js';
import {
  SubscriptionTier,
  ContributionStatus,
} from '../../generated/prisma/enums';
import { User } from '../../generated/prisma/client';
import { SubscriptionService } from '../subscription/subscription.service';
import { PrismaService } from '../../prisma/prisma.service';
import * as crypto from 'crypto';

@Injectable()
export class LemonSqueezyService {
  private readonly logger = new Logger(LemonSqueezyService.name);

  constructor(
    private configService: ConfigService,
    private subscriptionService: SubscriptionService,
    private prisma: PrismaService,
  ) {
    const apiKey = this.configService.get<string>(
      'payment.lemonsqueezy.apiKey',
    );
    if (apiKey) {
      lemonSqueezySetup({ apiKey });
    }
  }

  async createSubscriptionSession(user: User, tier: SubscriptionTier) {
    const storeId = this.configService.get<string>(
      'payment.lemonsqueezy.storeId',
    );
    const variantId = this.configService.get<string>(
      'payment.lemonsqueezy.proVariantId',
    );

    if (!storeId || !variantId) {
      throw new Error('Lemon Squeezy Store ID or Variant ID not configured');
    }

    const { data, error } = await createCheckout(storeId, variantId, {
      checkoutData: {
        email: user.email,
        custom: {
          userId: user.id,
          tier,
        },
      },
      productOptions: {
        redirectUrl: this.configService.get<string>('payment.successUrl'),
      },
    });

    if (error) {
      this.logger.error(`Lemon Squeezy checkout error: ${error.message}`);
      throw new Error(error.message);
    }

    return { url: data?.data.attributes.url };
  }

  async createContributionSession(user: User) {
    const storeId = this.configService.get<string>(
      'payment.lemonsqueezy.storeId',
    );
    // For contributions, we use a "Pay what you want" product or a default variant
    const variantId = this.configService.get<string>(
      'payment.lemonsqueezy.contributionVariantId',
    );

    if (!storeId || !variantId) {
      throw new Error('Lemon Squeezy Contribution Variant ID not configured');
    }

    const { data, error } = await createCheckout(storeId, variantId, {
      checkoutData: {
        email: user.email,
        custom: {
          userId: user.id,
          type: 'contribution',
        },
      },
      productOptions: {
        redirectUrl: this.configService.get<string>('payment.successUrl'),
      },
    });

    if (error) {
      this.logger.error(`Lemon Squeezy checkout error: ${error.message}`);
      throw new Error(error.message);
    }

    return { url: data?.data.attributes.url };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async handleWebhook(payload: any, signature: string): Promise<void> {
    const secret = this.configService.get<string>(
      'payment.lemonsqueezy.webhookSecret',
    );

    if (!secret) {
      this.logger.warn('Lemon Squeezy webhook secret not configured');
      throw new Error('Webhook secret missing');
    }

    const hmac = crypto.createHmac('sha256', secret);
    const digest = hmac.update(JSON.stringify(payload)).digest('hex');

    if (signature !== digest) {
      this.logger.warn('Invalid Lemon Squeezy webhook signature');
      throw new Error('Invalid signature');
    }

    const eventName = payload.meta.event_name;
    const data = payload.data;

    switch (eventName) {
      case 'subscription_created':
      case 'subscription_updated':
        await this.handleSubscriptionEvent(data);
        break;
      case 'subscription_cancelled':
      case 'subscription_expired':
        await this.handleSubscriptionCancelled(data);
        break;
      case 'order_created':
        if (payload.meta.custom_data?.type === 'contribution') {
          await this.handleContributionEvent(payload);
        }
        break;
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private async handleSubscriptionEvent(data: any) {
    const attributes = data.attributes;
    const customData = data.meta?.custom_data || attributes.custom_data;
    const userId = customData?.userId;

    if (!userId) {
      this.logger.warn('No userId found in Lemon Squeezy subscription event');
      return;
    }

    await this.subscriptionService.activateSubscription({
      userId,
      externalId: data.id,
      status: attributes.status,
      provider: 'lemonsqueezy',
      tier: customData?.tier || SubscriptionTier.PRO,
      currentPeriodStart: new Date(attributes.renews_at || Date.now()),
      currentPeriodEnd: new Date(
        attributes.ends_at || Date.now() + 30 * 24 * 60 * 60 * 1000,
      ),
    });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private async handleSubscriptionCancelled(data: any) {
    await this.subscriptionService.deactivateSubscription(data.id);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private async handleContributionEvent(payload: any) {
    const data = payload.data;
    const attributes = data.attributes;
    const customData = payload.meta.custom_data;
    const userId = customData?.userId;

    const amount = attributes.total / 100;
    const currency = attributes.currency;
    const paymentRef = data.id;

    this.logger.log(
      `Handling Lemon Squeezy contribution for user ${userId}: ${amount} ${currency}`,
    );

    await this.prisma.contribution.create({
      data: {
        amount,
        currency,
        status: ContributionStatus.SUCCESSFUL,
        paymentProvider: 'lemonsqueezy',
        paymentRef,
        donorId: userId,
        donorEmail: attributes.user_email,
        donorName: attributes.user_name,
      },
    });

    if (userId) {
      await this.prisma.user.update({
        where: { id: userId },
        data: { isContributor: true },
      });
    }
  }

  async cancelSubscription(subscriptionId: string) {
    try {
      const { data, error } = await cancelSubscription(subscriptionId);
      if (error) throw new Error(error.message);
      this.logger.log(`Lemon Squeezy subscription ${subscriptionId} cancelled`);
      return data;
    } catch (error) {
      this.logger.error(`Failed to cancel LS subscription: ${error.message}`);
      throw new Error('Could not cancel subscription with Lemon Squeezy');
    }
  }
}
