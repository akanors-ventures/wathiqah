import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EmailProvider } from './providers/email-provider.interface';
import { SmsProvider } from './providers/sms-provider.interface';
import { TemplateService } from './template.service';
import { SmsOptOutService } from './services/sms-optout.service';
import { SubscriptionService } from '../subscription/subscription.service';
import { getLocaleForCurrency } from '../../common/utils/currency.utils';
import type {
  EmailJobData,
  NotificationJobData,
  SmsJobData,
  ContactNotificationSmsJobData,
  ContactNotificationEmailJobData,
  ProvisioningNotificationJobData,
  RoleChangeNotificationJobData,
} from './interfaces/job-data.interface';

@Processor('notifications')
export class NotificationsProcessor extends WorkerHost {
  private readonly logger = new Logger(NotificationsProcessor.name);

  constructor(
    private readonly emailProvider: EmailProvider,
    private readonly smsProvider: SmsProvider,
    private readonly templateService: TemplateService,
    private readonly configService: ConfigService,
    private readonly smsOptOutService: SmsOptOutService,
    private readonly subscriptionService: SubscriptionService, // @Global() — no module import needed
  ) {
    super();
  }

  async process(job: Job<NotificationJobData, void, string>): Promise<void> {
    this.logger.debug(`Processing job ${job.name} (id: ${job.id})`);

    try {
      switch (job.name) {
        case 'send-email':
          await this.handleSendEmail(job.data as EmailJobData);
          break;
        case 'send-sms':
          await this.handleSendSms(job.data as SmsJobData);
          break;
        case 'contact-notification-sms':
          await this.handleContactNotificationSms(
            job.data as ContactNotificationSmsJobData,
          );
          break;
        case 'contact-notification-email':
          await this.handleContactNotificationEmail(
            job.data as ContactNotificationEmailJobData,
          );
          break;
        case 'provisioning-notification':
          await this.handleProvisioningNotification(
            job.data as ProvisioningNotificationJobData,
          );
          break;
        case 'role-change-notification':
          await this.handleRoleChangeNotification(
            job.data as RoleChangeNotificationJobData,
          );
          break;
        default:
          this.logger.warn(`Unknown job name: ${job.name}`);
      }
    } catch (error) {
      this.logger.error(
        `Failed to process job ${job.name}: ${error.message}`,
        error.stack,
      );
      throw error; // Rethrow to let BullMQ handle retries
    }
  }

  private async handleSendEmail(data: EmailJobData) {
    const { to, subject, templateName, templateData } = data;

    const appUrl = this.configService.get('app.url')?.replace(/\/$/, '');
    const fullTemplateData = {
      ...templateData,
      appUrl,
      logoUrl: `${appUrl}/appLogo.png`,
      year: new Date().getFullYear(),
    };

    const html = this.templateService.render(
      templateName,
      'email',
      fullTemplateData,
      'html',
    );
    const text = this.templateService.render(
      templateName,
      'email',
      fullTemplateData,
      'txt',
    );

    await this.emailProvider.sendEmail({
      to,
      subject,
      html,
      text,
    });

    this.logger.log(`Email sent to ${to} (template: ${templateName})`);
  }

  private async handleSendSms(data: SmsJobData) {
    await this.smsProvider.sendSms({
      to: data.to,
      body: data.body,
    });
    this.logger.log(`SMS sent to ${data.to}`);
  }

  private formatAmount(amount: number, currency: string): string {
    const locale = getLocaleForCurrency(currency);
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(amount);
  }

  private async handleContactNotificationSms(
    data: ContactNotificationSmsJobData,
  ): Promise<void> {
    const {
      contactPhoneNumber,
      contactFirstName,
      creatorDisplayName,
      amount,
      currency,
      creatorId,
      witnessDisplayName,
      transactionType,
    } = data;

    const optedOut = await this.smsOptOutService.isOptedOut(contactPhoneNumber);
    if (optedOut) {
      this.logger.log(`Skipping SMS to ${contactPhoneNumber} — opted out`);
      return;
    }

    const name = contactFirstName ?? 'Someone';
    const formattedAmount = this.formatAmount(amount, currency);
    const appUrl = this.configService
      .get<string>('app.url')
      ?.replace(/\/$/, '');

    const typeLabels: Record<string, string> = {
      LOAN_GIVEN: 'loan given',
      LOAN_RECEIVED: 'loan received',
      REPAYMENT_MADE: 'repayment made',
      REPAYMENT_RECEIVED: 'repayment received',
      ADVANCE_PAID: 'advance payment',
      ADVANCE_RECEIVED: 'advance received',
      DEPOSIT_PAID: 'deposit paid',
      DEPOSIT_RECEIVED: 'deposit received',
      ESCROWED: 'escrowed payment',
      REMITTED: 'remittance',
    };
    const typeLabel = typeLabels[transactionType] ?? 'transaction';

    const body = `${name}, ${creatorDisplayName} has recorded a ${typeLabel} of ${formattedAmount} in your name on Wathīqah. This has been witnessed and confirmed by ${witnessDisplayName}. View your record at ${appUrl}. Reply STOP to opt out.`;

    await this.smsProvider.sendSms({ to: contactPhoneNumber, body });
    await this.subscriptionService.incrementFeatureUsage(
      creatorId,
      'contactNotificationSms',
    );
    this.logger.log(`Contact notification SMS sent to ${contactPhoneNumber}`);
  }

  private async handleContactNotificationEmail(
    data: ContactNotificationEmailJobData,
  ): Promise<void> {
    const {
      contactEmail,
      contactFirstName,
      creatorDisplayName,
      amount,
      currency,
      witnessDisplayName,
      transactionType,
    } = data;

    const name = contactFirstName ?? 'Someone';
    const formattedAmount = this.formatAmount(amount, currency);
    const subject =
      'A witnessed transaction has been recorded in your name on Wathīqah';

    const typeLabels: Record<string, string> = {
      LOAN_GIVEN: 'loan given',
      LOAN_RECEIVED: 'loan received',
      REPAYMENT_MADE: 'repayment made',
      REPAYMENT_RECEIVED: 'repayment received',
      ADVANCE_PAID: 'advance payment',
      ADVANCE_RECEIVED: 'advance received',
      DEPOSIT_PAID: 'deposit paid',
      DEPOSIT_RECEIVED: 'deposit received',
      ESCROWED: 'escrowed payment',
      REMITTED: 'remittance',
    };
    const typeLabel = typeLabels[transactionType] ?? 'transaction';

    await this.handleSendEmail({
      to: contactEmail,
      subject,
      templateName: 'contact-transaction-notification',
      templateData: {
        name,
        creatorDisplayName,
        formattedAmount,
        witnessDisplayName,
        typeLabel,
        subject,
      },
    });

    this.logger.log(`Contact notification email sent to ${contactEmail}`);
  }

  private async handleProvisioningNotification(
    data: ProvisioningNotificationJobData,
  ): Promise<void> {
    const { notificationType, email, name, expiresAt, expiredAt } = data;

    let subject: string;
    let templateName: string;
    const templateData: Record<string, unknown> = { name };

    if (notificationType === 'granted') {
      subject = 'Your Wathīqah Pro access has been granted';
      templateName = 'provisioning-granted';
      if (expiresAt) {
        templateData.expiresAt = new Date(expiresAt).toLocaleDateString(
          'en-GB',
          { day: 'numeric', month: 'long', year: 'numeric' },
        );
      }
    } else if (notificationType === 'expired') {
      subject = 'Your Wathīqah Pro access has expired';
      templateName = 'provisioning-expired';
      if (expiredAt) {
        templateData.expiredAt = new Date(expiredAt).toLocaleDateString(
          'en-GB',
          { day: 'numeric', month: 'long', year: 'numeric' },
        );
      }
    } else {
      subject = 'Your Wathīqah Pro access has been revoked';
      templateName = 'provisioning-revoked';
    }

    templateData.subject = subject;

    await this.handleSendEmail({
      to: email,
      subject,
      templateName,
      templateData,
    });
    this.logger.log(
      `Provisioning notification (${notificationType}) sent to ${email}`,
    );
  }

  private async handleRoleChangeNotification(
    data: RoleChangeNotificationJobData,
  ): Promise<void> {
    const { notificationType, email, name } = data;

    const subject =
      notificationType === 'promoted'
        ? 'You have been promoted to Admin on Wathīqah'
        : 'Your Admin role on Wathīqah has been removed';

    const templateName =
      notificationType === 'promoted' ? 'admin-promotion' : 'admin-demotion';

    await this.handleSendEmail({
      to: email,
      subject,
      templateName,
      templateData: { name, subject },
    });

    this.logger.log(
      `Role change notification (${notificationType}) sent to ${email}`,
    );
  }
}
