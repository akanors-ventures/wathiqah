import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import { SubscriptionTier, SupportStatus } from '../../generated/prisma/enums';
import { User, Prisma } from '../../generated/prisma/client';
import { SubscriptionService } from '../subscription/subscription.service';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class StripeService {
  private stripe: Stripe;
  private readonly logger = new Logger(StripeService.name);

  constructor(
    private configService: ConfigService,
    private subscriptionService: SubscriptionService,
    private prisma: PrismaService,
  ) {
    const secretKey = this.configService.get<string>(
      'payment.stripe.secretKey',
    );
    this.stripe = new Stripe(secretKey || 'sk_test_placeholder', {
      apiVersion: '2025-01-27.acacia' as Stripe.LatestApiVersion,
    });
  }

  async createSubscriptionSession(user: User, tier: SubscriptionTier) {
    const proPlanId = this.configService.get<string>(
      'payment.stripe.proPlanId',
    );
    const successUrl = this.configService.get<string>('payment.successUrl');
    const cancelUrl = this.configService.get<string>('payment.cancelUrl');

    if (!proPlanId) {
      throw new Error('Stripe Pro Plan ID not configured');
    }

    const session = await this.stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price: proPlanId,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      customer_email: user.email,
      client_reference_id: user.id,
      success_url: `${successUrl}?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: cancelUrl,
      metadata: {
        userId: user.id,
        tier,
      },
    });

    return { url: session.url };
  }

  async createSupportSession(user: User, amount?: number, currency?: string) {
    const successUrl = this.configService.get<string>('payment.successUrl');
    const cancelUrl = this.configService.get<string>('payment.cancelUrl');
    const effectiveAmount = amount || 10;
    const effectiveCurrency = (currency || 'USD').toLowerCase();

    const session = await this.stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: effectiveCurrency,
            product_data: {
              name: 'Wathīqah Support',
              description: 'Support the development of Wathīqah',
            },
            unit_amount: effectiveAmount * 100, // Stripe expects amount in cents
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      customer_email: user.email,
      client_reference_id: user.id,
      success_url: `${successUrl}?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: cancelUrl,
      metadata: {
        userId: user.id,
        type: 'support',
      },
    });

    return { url: session.url };
  }

  async handleWebhook(body: string | Buffer, signature: string) {
    let event: Stripe.Event;
    const webhookSecret = this.configService.get<string>(
      'payment.stripe.webhookSecret',
    );

    try {
      event = this.stripe.webhooks.constructEvent(
        body,
        signature,
        webhookSecret!,
      );
    } catch (err) {
      this.logger.error(
        `Webhook signature verification failed: ${err.message}`,
      );
      throw new Error(`Webhook Error: ${err.message}`);
    }

    switch (event.type) {
      case 'checkout.session.completed':
        await this.handleCheckoutSessionCompleted(
          event.data.object as Stripe.Checkout.Session,
        );
        break;
      case 'customer.subscription.updated':
        await this.handleSubscriptionUpdated(
          event.data.object as Stripe.Subscription,
        );
        break;
      case 'customer.subscription.deleted':
        await this.handleSubscriptionDeleted(
          event.data.object as Stripe.Subscription,
        );
        break;
      default:
        this.logger.log(`Unhandled Stripe event type: ${event.type}`);
    }
  }

  private async handleCheckoutSessionCompleted(
    session: Stripe.Checkout.Session,
  ) {
    const userId = session.client_reference_id;

    if (!userId) {
      this.logger.warn('No userId found in Stripe session');
      return;
    }
    if (session.mode === 'subscription') {
      await this.subscriptionService.handleSubscriptionSuccess(
        session.client_reference_id!,
        session.subscription as string,
        'stripe',
        session.metadata?.tier as SubscriptionTier,
      );
    } else if (
      session.mode === 'payment' &&
      session.metadata?.type === 'support'
    ) {
      await this.handleSupportCompleted(session);
    }
  }

  private async handleSupportCompleted(session: Stripe.Checkout.Session) {
    const userId = session.client_reference_id;
    const amount = new Prisma.Decimal(session.amount_total! / 100);
    const currency = session.currency?.toUpperCase() || 'USD';

    this.logger.log(
      `Handling Stripe support for user ${userId}: ${amount} ${currency}`,
    );

    // Handle one-time support payment
    await this.prisma.support.create({
      data: {
        amount,
        currency,
        status: SupportStatus.SUCCESSFUL,
        paymentProvider: 'stripe',
        paymentRef: session.payment_intent as string,
        supporterId: session.client_reference_id,
        supporterEmail: session.customer_details?.email || undefined,
        supporterName: session.customer_details?.name || undefined,
      },
    });

    if (userId) {
      await this.prisma.user.update({
        where: { id: userId },
        data: { isSupporter: true },
      });
    }
  }

  private async handleSubscriptionUpdated(subscription: Stripe.Subscription) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sub = subscription as any;
    await this.subscriptionService.updateSubscriptionStatus({
      externalId: sub.id,
      status: sub.status,
      currentPeriodStart: sub.current_period_start
        ? new Date(sub.current_period_start * 1000)
        : undefined,
      currentPeriodEnd: sub.current_period_end
        ? new Date(sub.current_period_end * 1000)
        : undefined,
      cancelAtPeriodEnd: sub.cancel_at_period_end,
    });
  }

  private async handleSubscriptionDeleted(subscription: Stripe.Subscription) {
    await this.subscriptionService.deactivateSubscription(subscription.id);
  }

  async cancelSubscription(subscriptionId: string) {
    try {
      await this.stripe.subscriptions.cancel(subscriptionId);
      this.logger.log(`Stripe subscription ${subscriptionId} cancelled`);
    } catch (error) {
      this.logger.error(
        `Failed to cancel Stripe subscription: ${error.message}`,
      );
      throw new Error('Could not cancel subscription with Stripe');
    }
  }
}
