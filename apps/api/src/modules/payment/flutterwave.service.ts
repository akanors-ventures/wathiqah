import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import {
  SubscriptionTier,
  ContributionStatus,
} from '../../generated/prisma/enums';
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
        title: 'Wathīqah Pro Subscription',
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

  async createContributionSession(
    user: User,
    amount?: number,
    currency: string = 'NGN',
  ) {
    const successUrl = this.configService.get<string>('payment.successUrl');
    const separator = successUrl.includes('?') ? '&' : '?';

    const payload: Record<string, unknown> = {
      tx_ref: `contrib_${user.id}_${Date.now()}`,
      amount: amount?.toString() || '0',
      currency,
      redirect_url: `${successUrl}${separator}type=contribution`,
      payment_options: 'card,banktransfer,ussd',
      customer: {
        email: user.email,
        phonenumber: user.phoneNumber || '',
        name: `${user.firstName} ${user.lastName}`,
      },
      meta: {
        userId: user.id,
        type: 'contribution',
      },
      customizations: {
        title: 'Wathīqah Contribution',
        description: 'Support the development of Wathīqah',
        logo: 'https://wathiqah.akanors.com/appLogo.png',
      },
    };

    try {
      const url = await this.initiatePayment(payload);
      return { url };
    } catch (error) {
      this.logger.error(
        `Flutterwave contribution session failed: ${error.message}`,
      );
      throw new Error('Could not initiate contribution with Flutterwave');
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
    const userId = data.meta?.userId || data.customer?.meta?.userId;
    const type = data.meta?.type || 'subscription';

    if (type === 'contribution') {
      await this.handleContributionSuccessful(data);
      return;
    }

    if (!userId) {
      this.logger.warn('No userId found in Flutterwave webhook metadata');
      return;
    }

    await this.subscriptionService.activateSubscription({
      userId,
      externalId: data.id.toString(),
      status: 'active',
      provider: 'flutterwave',
      tier: data.meta?.tier || SubscriptionTier.PRO,
      currentPeriodStart: new Date(),
      currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
    });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private async handleContributionSuccessful(data: any) {
    const userId = data.meta?.userId;
    const amount = data.amount;
    const currency = data.currency || 'NGN';
    const paymentRef = data.tx_ref;

    this.logger.log(
      `Handling Flutterwave contribution for user ${userId}: ${amount} ${currency}`,
    );

    await this.prisma.contribution.create({
      data: {
        amount,
        currency,
        status: ContributionStatus.SUCCESSFUL,
        paymentProvider: 'flutterwave',
        paymentRef,
        donorId: userId,
        donorEmail: data.customer?.email,
        donorName: data.customer?.name,
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
