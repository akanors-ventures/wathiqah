import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  lemonSqueezySetup,
  createCheckout,
  cancelSubscription,
} from '@lemonsqueezy/lemonsqueezy.js';
import { SubscriptionTier, SupportStatus } from '../../generated/prisma/enums';
import { User, Prisma } from '../../generated/prisma/client';
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

  async createSupportSession(user: User) {
    const storeId = this.configService.get<string>(
      'payment.lemonsqueezy.storeId',
    );
    // For support, we use a "Pay what you want" product or a default variant
    const variantId = this.configService.get<string>(
      'payment.lemonsqueezy.supportVariantId',
    );

    if (!storeId || !variantId) {
      throw new Error('Lemon Squeezy Support Variant ID not configured');
    }

    const { data, error } = await createCheckout(storeId, variantId, {
      checkoutData: {
        email: user.email,
        custom: {
          userId: user.id,
          type: 'support',
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

  async handleWebhook(body: Buffer, signature: string) {
    const secret = this.configService.get<string>(
      'payment.lemonsqueezy.webhookSecret',
    );

    if (!secret) {
      this.logger.warn('Lemon Squeezy webhook secret not configured');
      throw new Error('Webhook secret missing');
    }

    const hmac = crypto.createHmac('sha256', secret);
    const digest = Buffer.from(hmac.update(body).digest('hex'), 'utf8');
    const signatureBuffer = Buffer.from(signature, 'utf8');

    if (!crypto.timingSafeEqual(digest, signatureBuffer)) {
      throw new Error('Invalid signature');
    }

    const payload = JSON.parse(body.toString());
    const eventName = payload.meta.event_name;

    switch (eventName) {
      case 'subscription_created':
      case 'subscription_updated':
        await this.handleSubscriptionEvent(payload);
        break;
      case 'subscription_cancelled':
      case 'subscription_expired':
        await this.handleSubscriptionCancelled(payload.data);
        break;
      case 'order_created':
        const custom = payload.meta.custom_data;
        if (custom?.type === 'support') {
          await this.handleSupportEvent(payload);
        }
        break;
    }

    return { received: true };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private async handleSubscriptionEvent(payload: any) {
    const custom = payload.meta?.custom_data;
    const userId = custom?.userId || custom?.user_id;

    if (!userId) {
      this.logger.warn('No userId found in Lemon Squeezy subscription event');
      return;
    }

    await this.subscriptionService.handleSubscriptionSuccess(
      custom.userId,
      payload.data.id, // subscription ID
      'lemonsqueezy',
      custom.tier as SubscriptionTier,
    );
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private async handleSubscriptionCancelled(data: any) {
    await this.subscriptionService.deactivateSubscription(data.id);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private async handleSupportEvent(payload: any) {
    const attributes = payload.data.attributes;
    const custom = payload.meta.custom_data;
    const userId = custom?.userId || custom?.user_id;
    // Handle support payment
    await this.prisma.support.create({
      data: {
        amount: new Prisma.Decimal(attributes.total / 100),
        currency: attributes.currency.toUpperCase(),
        status: SupportStatus.SUCCESSFUL,
        paymentProvider: 'lemonsqueezy',
        paymentRef: payload.data.id,
        supporterId: custom.userId,
        supporterEmail: attributes.user_email,
        supporterName: attributes.user_name,
      },
    });

    if (userId) {
      await this.prisma.user.update({
        where: { id: userId },
        data: { isSupporter: true },
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
