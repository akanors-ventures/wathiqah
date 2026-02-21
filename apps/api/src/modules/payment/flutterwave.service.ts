import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { SubscriptionTier, SupportStatus } from '../../generated/prisma/enums';
import { User } from '../../generated/prisma/client';
import { SubscriptionService } from '../subscription/subscription.service';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class FlutterwaveService {
  private readonly logger = new Logger(FlutterwaveService.name);

  constructor(
    private configService: ConfigService,
    private subscriptionService: SubscriptionService,
    private prisma: PrismaService,
  ) {}

  async createSubscriptionSession(user: User, tier: SubscriptionTier) {
    const proPlanId = this.configService.get<string>(
      'payment.flutterwave.proPlanId',
    );
    const successUrl = this.configService.get<string>('payment.successUrl');
    const separator = successUrl.includes('?') ? '&' : '?';

    const payload: Record<string, unknown> = {
      tx_ref: `sub_${user.id}_${Date.now()}`,
      amount: tier === SubscriptionTier.PRO ? '5000' : '0', // Fallback amount if no plan
      currency: 'NGN',
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
      },
      customizations: {
        title: 'Wathiqah Pro Subscription',
        description: 'Upgrade to Wathīqah Pro',
        logo: 'https://wathiqah.akanors.com/appLogo.png',
      },
    };

    // If a plan ID is configured, use it for recurring billing
    if (proPlanId && tier === SubscriptionTier.PRO) {
      payload.payment_plan = proPlanId;
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

  private async initiatePayment(
    payload: Record<string, unknown>,
  ): Promise<string> {
    try {
      const response = await axios.post(
        'https://api.flutterwave.com/v3/payments',
        payload,
        {
          headers: {
            Authorization: `Bearer ${this.configService.get<string>(
              'payment.flutterwave.secretKey',
            )}`,
            'Content-Type': 'application/json',
          },
        },
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

    if (
      (event === 'charge.completed' || event === 'subscription.activated') &&
      data.status === 'successful'
    ) {
      await this.handlePaymentSuccessful(data);
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

    if (type === 'support') {
      await this.handleSupportSuccessful(data, userId);
      return;
    }

    if (!userId) {
      this.logger.warn('No userId found in Flutterwave webhook metadata');
      return;
    }

    await this.subscriptionService.handleSubscriptionSuccess(
      userId,
      data.id.toString(),
      'flutterwave',
      data.meta?.tier as SubscriptionTier,
    );
  }

  private async handleSupportSuccessful(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    data: any,
    fallbackUserId?: string,
  ) {
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

    await this.prisma.support.create({
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
      await this.prisma.user.update({
        where: { id: userId },
        data: { isSupporter: true },
      });
    }
  }

  async cancelSubscription(subscriptionId: string) {
    try {
      await axios.put(
        `https://api.flutterwave.com/v3/subscriptions/${subscriptionId}/cancel`,
        {},
        {
          headers: {
            Authorization: `Bearer ${this.configService.get<string>(
              'payment.flutterwave.secretKey',
            )}`,
            'Content-Type': 'application/json',
          },
        },
      );
      this.logger.log(`Flutterwave subscription ${subscriptionId} cancelled`);
    } catch (error) {
      this.logger.error(
        `Failed to cancel Flutterwave subscription: ${error.message}`,
      );
      throw new Error('Could not cancel subscription with Flutterwave');
    }
  }
}
