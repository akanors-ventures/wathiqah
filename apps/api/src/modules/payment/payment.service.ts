import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { StripeService } from './stripe.service';
import { FlutterwaveService } from './flutterwave.service';
import { LemonSqueezyService } from './lemonsqueezy.service';
import { SubscriptionTier } from '../../generated/prisma/enums';
import { GeoIPInfo } from '../geoip/entities/geoip-info.entity';
import { BillingInterval } from './dto/billing-interval.enum';

@Injectable()
export class PaymentService {
  private readonly logger = new Logger(PaymentService.name);

  constructor(
    private prisma: PrismaService,
    private stripeService: StripeService,
    private flutterwaveService: FlutterwaveService,
    private lemonsqueezyService: LemonSqueezyService,
  ) {}

  async createSubscriptionSession(
    userId: string,
    tier: SubscriptionTier,
    currency?: string,
    geoip?: GeoIPInfo,
    interval?: BillingInterval,
  ) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Priority: Explicit currency > User preferred currency > GeoIP currency > Default (USD)
    const effectiveCurrency = (
      currency ||
      user.preferredCurrency ||
      geoip?.currencyCode ||
      'USD'
    ).toUpperCase();

    this.logger.log(
      `Creating subscription session for user ${userId} with currency ${effectiveCurrency} (detected via ${currency ? 'args' : geoip ? 'GeoIP' : 'profile'})`,
    );

    // Flutterwave is the sole provider for new subscriptions, across every
    // currency — Stripe/LemonSqueezy remain only to service existing
    // subscribers (webhooks, cancel, reactivate).
    return this.flutterwaveService.createSubscriptionSession(
      user,
      tier,
      interval,
      effectiveCurrency,
    );
  }

  async createSupportSession(
    userId: string,
    amount?: number,
    currency?: string,
    geoip?: GeoIPInfo,
  ) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const effectiveCurrency = (
      currency ||
      user.preferredCurrency ||
      geoip?.currencyCode ||
      'USD'
    ).toUpperCase();

    this.logger.log(
      `Creating support session for user ${userId} with amount ${amount} ${effectiveCurrency}`,
    );

    // One-time support payments need no recurring plan, so Flutterwave can
    // take any currency directly — same "Flutterwave for everything" move as
    // subscriptions above.
    return this.flutterwaveService.createSupportSession(
      user,
      amount,
      effectiveCurrency,
    );
  }

  async handleWebhook(
    provider: string,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    body: Buffer | any,
    signature?: string,
  ) {
    this.logger.log(`Handling ${provider} webhook`);

    let payload = body;
    if (typeof body !== 'object') {
      payload = JSON.parse(body);
    }
    // Log the webhook first
    await this.prisma.webhookLog.create({
      data: {
        provider,
        type: payload.data?.type || payload.meta?.event_name || 'unknown',
        payload,
        status: 'pending',
      },
    });

    if (provider === 'stripe') {
      return this.stripeService.handleWebhook(body, signature);
    } else if (provider === 'flutterwave') {
      return this.flutterwaveService.handleWebhook(payload, signature);
    } else if (provider === 'lemonsqueezy') {
      return this.lemonsqueezyService.handleWebhook(body, signature!);
    }
  }

  async cancelSubscription(userId: string) {
    const subscription = await this.prisma.subscription.findUnique({
      where: { userId },
    });

    if (!subscription) {
      throw new NotFoundException('No active subscription found');
    }

    if (subscription.provider === 'stripe') {
      return this.stripeService.cancelSubscription(subscription.externalId!);
    } else if (subscription.provider === 'flutterwave') {
      return this.flutterwaveService.cancelSubscription(
        subscription.externalId!,
      );
    } else if (subscription.provider === 'lemonsqueezy') {
      return this.lemonsqueezyService.cancelSubscription(
        subscription.externalId!,
      );
    }
  }

  async reactivateSubscription(userId: string) {
    const subscription = await this.prisma.subscription.findUnique({
      where: { userId },
    });

    if (!subscription) {
      throw new NotFoundException('No active subscription found');
    }

    if (subscription.provider === 'stripe') {
      await this.stripeService.reactivateSubscription(subscription.externalId!);
      await this.prisma.subscription.update({
        where: { userId },
        data: { cancelAtPeriodEnd: false },
      });
    } else if (subscription.provider === 'flutterwave') {
      await this.flutterwaveService.reactivateSubscription(
        subscription.externalId!,
      );
      // Flutterwave always throws above — no DB update needed here
    } else if (subscription.provider === 'lemonsqueezy') {
      await this.lemonsqueezyService.reactivateSubscription(
        subscription.externalId!,
      );
      await this.prisma.subscription.update({
        where: { userId },
        data: { cancelAtPeriodEnd: false },
      });
    }
  }
}
