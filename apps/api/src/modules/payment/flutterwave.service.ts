import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import {
  SubscriptionTier,
  SupportStatus,
  PaymentStatus,
  PaymentType,
  PlanStatus,
} from '../../generated/prisma/enums';
import { BillingInterval } from './dto/billing-interval.enum';
import { User, Prisma } from '../../generated/prisma/client';
import { SubscriptionService } from '../subscription/subscription.service';
import { PrismaService } from '../../prisma/prisma.service';

// Currencies with a dedicated Flutterwave plan. Anything else settles in USD
// under the DEFAULT bucket — Flutterwave plans are pinned to one currency,
// so we can't dynamically create one per arbitrary currency.
type FlutterwavePlanCurrency = 'NGN' | 'USD' | 'GBP';
const FLUTTERWAVE_PLAN_CURRENCIES: FlutterwavePlanCurrency[] = [
  'NGN',
  'USD',
  'GBP',
];

// Shape of a row returned by GET /v3/subscriptions — only the fields this
// service actually reads.
interface FlutterwaveSubscription {
  id: number | string;
  created_at?: string;
}

@Injectable()
export class FlutterwaveService {
  private readonly logger = new Logger(FlutterwaveService.name);

  constructor(
    private configService: ConfigService,
    private subscriptionService: SubscriptionService,
    private prisma: PrismaService,
  ) {}

  // Flutterwave's payment-plan interval vocabulary has no 'annual' value —
  // it's 'yearly'. Plan.interval always stores Flutterwave's raw string.
  private toFlutterwaveInterval(interval?: BillingInterval): string {
    return interval === BillingInterval.ANNUAL ? 'yearly' : 'monthly';
  }

  async createSubscriptionSession(
    user: User,
    tier: SubscriptionTier,
    interval?: BillingInterval,
    currency?: string,
  ) {
    const requestedCurrency = currency?.toUpperCase();
    const isKnownCurrency = FLUTTERWAVE_PLAN_CURRENCIES.includes(
      requestedCurrency as FlutterwavePlanCurrency,
    );
    // Any currency without its own plan bucket settles in USD under DEFAULT.
    const planBucket = isKnownCurrency ? requestedCurrency! : 'DEFAULT';
    const chargeCurrency = isKnownCurrency ? requestedCurrency! : 'USD';

    const successUrl = this.configService.get<string>('payment.successUrl');
    const separator = successUrl.includes('?') ? '&' : '?';

    const payload: Record<string, unknown> = {
      tx_ref: `sub_${user.id}_${Date.now()}`,
      amount: '0',
      currency: chargeCurrency,
      redirect_url: `${successUrl}${separator}type=subscription`,
      payment_options: 'card,banktransfer,ussd',
      customer: {
        email: user.email,
        phonenumber: user.phoneNumber || '',
        name: `${user.firstName} ${user.lastName}`,
      },
      meta: {
        userId: user.id,
        tier,
        interval: interval || BillingInterval.MONTHLY,
      },
      customizations: {
        title: 'Wathiqah Pro Subscription',
        description: 'Upgrade to Wathīqah Pro',
        logo: 'https://wathiqah.akanors.com/appLogo.png',
      },
    };

    if (tier === SubscriptionTier.PRO) {
      // Every interval requires its own active recurring plan for the
      // resolved currency bucket, sourced from the admin-managed Plan table
      // (the local mirror of Flutterwave's payment plans) — silently
      // omitting `payment_plan` would make Flutterwave accept this as a
      // one-time charge while our webhook still grants a full period of
      // PRO, so the user pays once and is never actually billed again.
      const flutterwaveInterval = this.toFlutterwaveInterval(interval);
      const plan = await this.prisma.plan.findFirst({
        where: {
          tier: SubscriptionTier.PRO,
          interval: flutterwaveInterval,
          currency: planBucket,
          status: PlanStatus.ACTIVE,
        },
        orderBy: { createdAt: 'desc' },
      });

      if (!plan) {
        throw new Error(
          `${interval === BillingInterval.ANNUAL ? 'Annual' : 'Monthly'} subscription plan is not configured for ${planBucket}. Contact support.`,
        );
      }

      payload.amount = plan.amount.toString();
      payload.payment_plan = plan.providerPlanId;
      (payload.meta as Record<string, unknown>).planId = plan.id;
    }

    try {
      const url = await this.initiatePayment(payload);
      return { url };
    } catch (error) {
      this.logger.error(
        `Flutterwave session creation failed: ${error.message}`,
      );
      throw new Error('Could not initiate payment with Flutterwave');
    }
  }

  async createSupportSession(
    user: User,
    amount?: number,
    currency: string = 'NGN',
  ) {
    const successUrl = this.configService.get<string>('payment.successUrl');
    const separator = successUrl.includes('?') ? '&' : '?';

    const payload: Record<string, unknown> = {
      tx_ref: `support_${user.id}_${Date.now()}`,
      amount: amount?.toString() || '0',
      currency,
      redirect_url: `${successUrl}${separator}type=support`,
      payment_options: 'card,banktransfer,ussd',
      customer: {
        email: user.email,
        phonenumber: user.phoneNumber || '',
        name: `${user.firstName} ${user.lastName}`,
      },
      meta: {
        userId: user.id,
        type: 'support',
      },
      customizations: {
        title: 'Wathiqah Support',
        description: 'Support the development of Wathīqah',
        logo: 'https://wathiqah.akanors.com/appLogo.png',
      },
    };

    try {
      const url = await this.initiatePayment(payload);
      return { url };
    } catch (error) {
      this.logger.error(
        `Flutterwave session creation failed: ${error.message}`,
      );
      throw new Error('Could not initiate payment with Flutterwave');
    }
  }

  private getAuthHeaders(): Record<string, string> {
    return {
      Authorization: `Bearer ${this.configService.get<string>(
        'payment.flutterwave.secretKey',
      )}`,
      'Content-Type': 'application/json',
    };
  }

  private async initiatePayment(
    payload: Record<string, unknown>,
  ): Promise<string> {
    try {
      const response = await axios.post(
        'https://api.flutterwave.com/v3/payments',
        payload,
        { headers: this.getAuthHeaders() },
      );
      return response.data.data.link;
    } catch (error) {
      this.logger.error(
        `Flutterwave payment request failed: ${error.message} - ${JSON.stringify(
          error.response?.data,
        )}`,
      );
      throw error;
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async handleWebhook(payload: any, signature?: string) {
    // Verify hash
    const secretHash = this.configService.get<string>(
      'payment.flutterwave.webhookHash',
    );

    if (secretHash && signature !== secretHash) {
      this.logger.warn('Invalid Flutterwave webhook signature');
      throw new Error('Invalid signature');
    }

    const { event, data } = payload;

    try {
      if (
        (event === 'charge.completed' || event === 'subscription.activated') &&
        data.status === 'successful'
      ) {
        await this.handlePaymentSuccessful(data);
      }
    } catch (err) {
      this.logger.error(
        `Error processing Flutterwave webhook event ${event}: ${err.message}`,
        err.stack,
      );
      throw err;
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private async handlePaymentSuccessful(data: any) {
    let userId = data.meta?.userId || data.customer?.meta?.userId;
    let type = data.meta?.type;

    // Fallback: Parse tx_ref if meta is missing
    // Format: type_userId_timestamp (e.g., support_123_456 or sub_123_456)
    if (!userId && data.tx_ref) {
      this.logger.warn(
        `Meta missing for payment ${data.id}, attempting to parse tx_ref: ${data.tx_ref}`,
      );
      const parts = data.tx_ref.split('_');
      if (parts.length >= 3) {
        const prefix = parts[0];
        if (prefix === 'support') {
          type = 'support';
        } else if (prefix === 'sub') {
          type = 'subscription';
        }
        userId = parts[1];
      }
    }

    // Default type if still unknown (legacy behavior assumed subscription)
    if (!type) {
      type = 'subscription';
    }

    if (!userId) {
      this.logger.warn('No userId found in Flutterwave webhook metadata');
      return;
    }

    const userExists = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true },
    });

    if (!userExists) {
      this.logger.warn(
        `User ${userId} not found for Flutterwave payment ${data.id}`,
      );
      return;
    }

    if (data.id == null && !data.tx_ref) {
      this.logger.error(
        `Flutterwave webhook payload for user ${userId} has neither id nor tx_ref; skipping payment record`,
      );
      return;
    }

    // Computed once and reused below so the Payment row and the subscription
    // activation call always agree on the same identifier. `data.id` here is
    // the charge/transaction id, not a Flutterwave *subscription* id — the
    // latter only exists as a separate resource fetched via
    // GET /v3/subscriptions (see findFlutterwaveSubscription below).
    const externalId = data.id != null ? data.id.toString() : data.tx_ref;

    await this.prisma.$transaction(async (tx) => {
      // Create Payment Record
      const amount = new Prisma.Decimal(data.amount);
      const currency = data.currency || 'NGN';

      await tx.payment.create({
        data: {
          userId,
          amount,
          currency,
          status: PaymentStatus.SUCCESSFUL,
          provider: 'flutterwave',
          externalId,
          txRef: data.tx_ref ?? null,
          type:
            type === 'support' ? PaymentType.SUPPORT : PaymentType.SUBSCRIPTION,
          metadata: data,
        },
      });

      if (type === 'support') {
        await this.handleSupportSuccessful(data, userId, tx);
        return;
      }

      await this.subscriptionService.handleSubscriptionSuccess(
        userId,
        externalId,
        'flutterwave',
        data.meta?.tier as SubscriptionTier,
        tx,
        data.meta?.interval as BillingInterval,
        data.meta?.planId as string | undefined,
      );
    });
  }

  private async handleSupportSuccessful(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    data: any,
    fallbackUserId?: string,
    tx?: Prisma.TransactionClient,
  ) {
    const prisma = tx || this.prisma;
    const userId = data.meta?.userId || fallbackUserId;
    const amount = data.amount;
    const currency = data.currency || 'NGN';
    const paymentRef = data.tx_ref;

    if (!userId) {
      this.logger.error(
        `Cannot handle support: No userId found for ref ${paymentRef}`,
      );
      return;
    }

    this.logger.log(
      `Handling Flutterwave support for user ${userId}: ${amount} ${currency}`,
    );

    await prisma.support.create({
      data: {
        amount,
        currency,
        status: SupportStatus.SUCCESSFUL,
        paymentProvider: 'flutterwave',
        paymentRef,
        supporterId: userId,
        supporterEmail: data.customer?.email,
        supporterName: data.customer?.name,
      },
    });

    if (userId) {
      await prisma.user.update({
        where: { id: userId },
        data: { isSupporter: true },
      });
    }
  }

  private async findFlutterwaveSubscription(
    email: string,
    status: 'active' | 'cancelled',
  ): Promise<FlutterwaveSubscription | null> {
    const response = await axios.get<{ data: FlutterwaveSubscription[] }>(
      'https://api.flutterwave.com/v3/subscriptions',
      {
        params: { email, status },
        headers: this.getAuthHeaders(),
      },
    );

    const subscriptions = response.data?.data ?? [];

    // A user only ever holds one plan at a time, so more than one match here
    // means cancel/resubscribe history — the most recently created one is
    // the one that matches the current local Subscription row's state.
    // `getTime` falls back to 0 (epoch) for a missing/unparseable `created_at`
    // instead of NaN, so a bad value can't silently disable the ordering.
    const getTime = (value?: string): number => {
      const time = value ? new Date(value).getTime() : NaN;
      return Number.isNaN(time) ? 0 : time;
    };

    return (
      [...subscriptions].sort(
        (a, b) => getTime(b.created_at) - getTime(a.created_at),
      )[0] ?? null
    );
  }

  // Resolves the Flutterwave subscription id to act on and performs the
  // cancel/activate call. Prefers the caller's stored id (skipping the live
  // lookup entirely); if that id is rejected by Flutterwave (e.g. stale
  // after a full cancel + resubscribe elsewhere), re-resolves live by
  // email+status and retries once before giving up.
  private async performSubscriptionAction(
    email: string,
    status: 'active' | 'cancelled',
    action: 'cancel' | 'activate',
    storedId?: string | null,
  ): Promise<string> {
    const errorMessage =
      action === 'cancel'
        ? 'Could not cancel subscription with Flutterwave'
        : 'Could not reactivate subscription with Flutterwave';

    const resolveLive = async (): Promise<string> => {
      const fwSubscription = await this.findFlutterwaveSubscription(
        email,
        status,
      ).catch((error) => {
        this.logger.error(
          `Failed to look up Flutterwave subscription for ${action}: ${error.message}`,
        );
        throw new Error(errorMessage);
      });

      if (!fwSubscription) {
        throw new Error(
          `No ${status} Flutterwave subscription found for this user`,
        );
      }

      return String(fwSubscription.id);
    };

    const put = (id: string) =>
      axios.put(
        `https://api.flutterwave.com/v3/subscriptions/${id}/${action}`,
        {},
        { headers: this.getAuthHeaders() },
      );

    let fwId = storedId || (await resolveLive());

    try {
      await put(fwId);
      return fwId;
    } catch (error) {
      if (!storedId) {
        this.logger.error(
          `Failed to ${action} Flutterwave subscription: ${error.message}`,
        );
        throw new Error(errorMessage);
      }

      this.logger.warn(
        `Stored Flutterwave subscription id ${fwId} rejected on ${action} for ${email}; re-resolving live`,
      );
      fwId = await resolveLive();

      try {
        await put(fwId);
        return fwId;
      } catch (retryError) {
        this.logger.error(
          `Failed to ${action} Flutterwave subscription after re-resolving: ${retryError.message}`,
        );
        throw new Error(errorMessage);
      }
    }
  }

  async cancelSubscription(
    email: string,
    localExternalId: string,
    storedProviderSubscriptionId?: string | null,
  ) {
    const fwId = await this.performSubscriptionAction(
      email,
      'active',
      'cancel',
      storedProviderSubscriptionId,
    );

    this.logger.log(
      `Cancelled Flutterwave subscription ${fwId} (user ${email})`,
    );

    // Update local subscription to reflect auto-renewal cancellation, and
    // persist the resolved id so the next cancel/reactivate skips the live
    // lookup entirely.
    await this.subscriptionService.updateSubscriptionStatus({
      externalId: localExternalId,
      status: 'active',
      cancelAtPeriodEnd: true,
      providerSubscriptionId: fwId,
    });

    this.logger.log(
      `Flutterwave subscription ${fwId} set to cancel at period end`,
    );
  }

  async reactivateSubscription(
    email: string,
    localExternalId: string,
    storedProviderSubscriptionId?: string | null,
  ) {
    const fwId = await this.performSubscriptionAction(
      email,
      'cancelled',
      'activate',
      storedProviderSubscriptionId,
    );

    this.logger.log(
      `Reactivated Flutterwave subscription ${fwId} (user ${email})`,
    );

    // Flutterwave's /activate response carries no new billing period, so
    // updateSubscriptionStatus recomputes currentPeriodEnd from the
    // subscription's linked Plan interval instead of leaving it stale at
    // whatever date triggered the original cancellation.
    await this.subscriptionService.updateSubscriptionStatus({
      externalId: localExternalId,
      status: 'active',
      cancelAtPeriodEnd: false,
      providerSubscriptionId: fwId,
      refreshPeriodEnd: true,
    });
  }
}
