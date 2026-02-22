import { Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { AssetCategory } from '../../generated/prisma/enums';
import { SubscriptionService } from '../subscription/subscription.service';
import type { NotificationJobData } from './interfaces/job-data.interface';

@Injectable()
export class NotificationService {
  constructor(
    @InjectQueue('notifications')
    private readonly notificationsQueue: Queue<NotificationJobData>,
    private readonly configService: ConfigService,
    private readonly subscriptionService: SubscriptionService,
  ) {}

  /**
   * Sends an email verification link to a user.
   *
   * @param email - The recipient's email address.
   * @param name - The recipient's name.
   * @param token - The verification token.
   * @throws BadRequestException if any parameter is missing or empty.
   */
  async sendVerificationEmail(
    email: string,
    name: string,
    token: string,
  ): Promise<void> {
    this.validateParams({ email, name, token });

    const verificationUrl = `${this.configService.get('app.url')}/verify-email?token=${token}`;

    await this.sendEmailWithTemplate(
      email,
      'Verify your email address',
      'verify-email',
      {
        name,
        verificationUrl,
        subject: 'Verify your email address',
      },
    );
  }

  /**
   * Sends a password reset link to a user.
   *
   * @param email - The recipient's email address.
   * @param name - The recipient's name.
   * @param token - The password reset token.
   * @throws BadRequestException if any parameter is missing or empty.
   */
  async sendPasswordResetEmail(
    email: string,
    name: string,
    token: string,
  ): Promise<void> {
    this.validateParams({ email, name, token });

    const resetUrl = `${this.configService.get('app.url')}/reset-password?token=${token}`;

    await this.sendEmailWithTemplate(
      email,
      'Reset your password',
      'reset-password',
      {
        name,
        resetUrl,
        subject: 'Reset your password',
      },
    );
  }

  /**
   * Sends an invitation to a new user to join the platform.
   *
   * @param email - The recipient's email address.
   * @param name - The recipient's name.
   * @param token - The invitation token.
   * @throws BadRequestException if any parameter is missing or empty.
   */
  async sendUserInviteEmail(
    email: string,
    name: string,
    token: string,
  ): Promise<void> {
    this.validateParams({ email, name, token });

    const inviteUrl = `${this.configService.get('app.url')}/accept-invitation?token=${token}`;

    await this.sendEmailWithTemplate(
      email,
      'Invitation to Wathīqah',
      'invite-user',
      {
        name,
        inviteUrl,
        subject: 'Invitation to Wathīqah',
      },
    );
  }

  /**
   * Sends an invitation to a witness to verify a transaction.
   *
   * @param email - The witness's email address.
   * @param name - The witness's name.
   * @param token - The invitation token.
   * @param transactionDetails - Details about the transaction and parties.
   * @param senderId - The ID of the user sending the invite (for subscription checks).
   * @param phoneNumber - Optional phone number for SMS notification.
   * @throws BadRequestException if any parameter is missing or empty.
   */
  async sendTransactionWitnessInvite(
    email: string,
    name: string,
    token: string,
    transactionDetails: {
      creatorName: string;
      contactName: string;
      amount?: string;
      itemName?: string;
      currency?: string;
      category: AssetCategory;
      type: string;
    },
    senderId: string,
    phoneNumber?: string,
  ): Promise<void> {
    this.validateParams({ email, name, token });

    const inviteUrl = `${this.configService.get('app.url')}/witnesses/invite/${token}`;
    const subject = `Witness Request: ${transactionDetails.creatorName} requested you to witness a transaction with ${transactionDetails.contactName}`;

    // Format amount for email if category is FUNDS
    let formattedAmount = transactionDetails.amount;
    if (
      transactionDetails.category === AssetCategory.FUNDS &&
      transactionDetails.amount
    ) {
      const amount = parseFloat(transactionDetails.amount);
      const currency = transactionDetails.currency || 'NGN';
      formattedAmount = new Intl.NumberFormat('en-NG', {
        style: 'currency',
        currency: currency,
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
      }).format(amount);
    } else if (
      transactionDetails.category === AssetCategory.ITEM &&
      transactionDetails.amount
    ) {
      formattedAmount = `${transactionDetails.amount} ${transactionDetails.itemName || 'items'}`;
    }

    const appUrl = this.configService.get('app.url')?.replace(/\/$/, '');
    const templateData = {
      name,
      inviteUrl,
      subject,
      appUrl,
      logoUrl: `${appUrl}/appLogo.png`,
      year: new Date().getFullYear(),
      ...transactionDetails,
      amount: formattedAmount,
    };

    // Queue Email
    await this.notificationsQueue.add(
      'send-email',
      {
        to: email,
        subject,
        templateName: 'transaction-witness-invite',
        templateData,
      },
      {
        attempts: 5,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
        removeOnComplete: true,
      },
    );

    // Queue SMS if phone number provided and user has permission
    if (phoneNumber && senderId) {
      let canSendSMS = false;
      try {
        await this.subscriptionService.checkFeatureLimit(senderId, 'allowSMS');
        canSendSMS = true;
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
      } catch (_error) {
        // Limit reached or feature not available
        canSendSMS = false;
      }

      if (canSendSMS) {
        const smsBody = `Hello ${name}, you have been requested to witness a transaction on Wathīqah. View details: ${inviteUrl}`;

        await this.notificationsQueue.add(
          'send-sms',
          {
            to: phoneNumber,
            body: smsBody,
          },
          {
            attempts: 3,
            backoff: {
              type: 'fixed',
              delay: 5000,
            },
            removeOnComplete: true,
          },
        );
      }
    }
  }

  /**
   * Sends an invitation to view shared access.
   *
   * @param email - The recipient's email address.
   * @param granterName - The name of the user granting access.
   * @param token - The access token.
   * @throws BadRequestException if any parameter is missing or empty.
   */
  async sendSharedAccessInvite(
    email: string,
    granterName: string,
    token: string,
  ): Promise<void> {
    this.validateParams({ email, granterName, token });

    const accessUrl = `${this.configService.get('app.url')}/shared-access?token=${token}`;

    await this.sendEmailWithTemplate(
      email,
      'Invitation to view shared data',
      'shared-access-invite',
      {
        granterName,
        accessUrl,
        subject: 'Invitation to view shared data',
      },
    );
  }

  async sendContactInvitationEmail(
    email: string,
    name: string,
    inviterName: string,
    token: string,
  ): Promise<void> {
    this.validateParams({ email, name, inviterName, token });

    const inviteUrl = `${this.configService.get('app.url')}/signup?token=${token}&email=${encodeURIComponent(email)}`;
    const subject = `${inviterName} has invited you to view documented transactions on Wathīqah`;

    await this.sendEmailWithTemplate(
      email,
      subject,
      'invite-user', // Using existing invite-user template for now
      {
        name,
        inviterName,
        inviteUrl,
        subject,
      },
    );
  }

  /**
   * Notifies a witness that a transaction they witnessed has been updated.
   *
   * @param email - The witness's email address.
   * @param name - The witness's name.
   * @param updatedBy - The name of the user who updated the transaction.
   * @param changes - A list of descriptions of what changed.
   * @param transactionId - The ID of the transaction.
   */
  async sendWitnessUpdateNotification(
    email: string,
    name: string,
    updatedBy: string,
    changes: string[],
    transactionId: string,
  ): Promise<void> {
    this.validateParams({ email, name, updatedBy, transactionId });

    const actionUrl = `${this.configService.get('app.url')}/transactions/${transactionId}`;
    const subject = 'Action Required: Witnessed Transaction Updated';

    await this.sendEmailWithTemplate(
      email,
      subject,
      'transaction-witness-update',
      {
        name,
        updatedBy,
        changes,
        actionUrl,
        subject,
      },
    );
  }

  private validateParams(params: Record<string, string>): void {
    for (const [key, value] of Object.entries(params)) {
      if (!value || typeof value !== 'string' || value.trim() === '') {
        throw new BadRequestException(`${key} must be a non-empty string`);
      }
    }
  }

  private async sendEmailWithTemplate(
    to: string,
    subject: string,
    templateName: string,
    data: Record<string, unknown>,
  ): Promise<void> {
    await this.notificationsQueue.add(
      'send-email',
      {
        to,
        subject,
        templateName,
        templateData: data,
      },
      {
        attempts: 5,
        backoff: {
          type: 'exponential',
          delay: 1000,
        },
        removeOnComplete: true,
      },
    );
  }
}
