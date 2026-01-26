import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EmailProvider } from './providers/email-provider.interface';
import { SmsProvider } from './providers/sms-provider.interface';
import { TemplateService } from './template.service';
import {
  EmailNotificationOptions,
  MultiChannelNotificationOptions,
  SmsNotificationOptions,
} from './interfaces/notification-options.interface';

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  constructor(
    private readonly emailProvider: EmailProvider,
    private readonly smsProvider: SmsProvider,
    private readonly templateService: TemplateService,
    private readonly configService: ConfigService,
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
      'Invitation to Wathȋqah',
      'invite-user',
      {
        name,
        inviteUrl,
        subject: 'Invitation to Wathȋqah',
      },
    );
  }

  /**
   * Sends an invitation to a witness to verify a transaction.
   *
   * @param email - The witness's email address.
   * @param name - The witness's name.
   * @param token - The invitation token.
   * @param phoneNumber - Optional phone number for SMS notification.
   * @throws BadRequestException if any parameter is missing or empty.
   */
  async sendTransactionWitnessInvite(
    email: string,
    name: string,
    token: string,
    phoneNumber?: string,
  ): Promise<void> {
    this.validateParams({ email, name, token });

    const inviteUrl = `${this.configService.get('app.url')}/witnesses/invite/${token}`;
    const subject =
      'Witness Request: You have been requested to verify a transaction on Wathȋqah';

    const emailOptions = {
      to: email,
      subject,
      html: this.templateService.render(
        'transaction-witness-invite',
        'email',
        { name, inviteUrl, subject },
        'html',
      ),
      text: this.templateService.render(
        'transaction-witness-invite',
        'email',
        { name, inviteUrl, subject },
        'txt',
      ),
    };

    let smsOptions;
    if (phoneNumber) {
      const smsBody = this.templateService.render(
        'transaction-witness-invite',
        'sms',
        { name, inviteUrl },
        'txt',
      );
      smsOptions = {
        to: phoneNumber,
        body: smsBody,
      };
    }

    await this.sendMultiChannel({
      email: emailOptions,
      sms: smsOptions,
    });
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
    const subject = `${inviterName} has invited you to view documented transactions on Wathȋqah`;

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
   * Notifies a user that their transaction has been created.
   *
   * @param email - The user's email address.
   * @param name - The user's name.
   * @throws BadRequestException if any parameter is missing or empty.
   */
  async sendTransactionCreatedEmail(
    email: string,
    name: string,
  ): Promise<void> {
    this.validateParams({ email, name });

    await this.sendEmailWithTemplate(
      email,
      'Transaction Created',
      'transaction-created',
      {
        name,
        subject: 'Transaction Created',
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

  private async sendEmail(options: EmailNotificationOptions): Promise<void> {
    await this.emailProvider.sendEmail(options);
  }

  private async sendEmailWithTemplate(
    to: string,
    subject: string,
    templateName: string,
    data: Record<string, any>,
  ): Promise<void> {
    const templateData = {
      ...data,
      year: new Date().getFullYear(),
    };

    const html = this.templateService.render(
      templateName,
      'email',
      templateData,
      'html',
    );
    const text = this.templateService.render(
      templateName,
      'email',
      templateData,
      'txt',
    );

    await this.sendEmail({
      to,
      subject,
      html,
      text,
    });
  }

  private async sendSms(options: SmsNotificationOptions): Promise<void> {
    await this.smsProvider.sendSms(options);
  }

  private async sendMultiChannel(
    options: MultiChannelNotificationOptions,
  ): Promise<void> {
    const promises: Promise<void>[] = [];

    if (options.email) {
      promises.push(this.sendEmail(options.email));
    }

    if (options.sms) {
      promises.push(this.sendSms(options.sms));
    }

    if (promises.length === 0) {
      this.logger.warn('sendMultiChannel called with no channels specified');
      return;
    }

    const results = await Promise.allSettled(promises);
    const rejected = results.filter((r) => r.status === 'rejected');

    if (rejected.length > 0) {
      this.logger.error(
        `One or more notification channels failed: ${rejected.length}`,
      );
      // Optionally, throw a custom error or emit a monitoring event
    }
  }
}
