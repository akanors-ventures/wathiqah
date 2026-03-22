import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EmailProvider } from './providers/email-provider.interface';
import { SmsProvider } from './providers/sms-provider.interface';
import { TemplateService } from './template.service';
import { SmsOptOutService } from './services/sms-optout.service';
import { SubscriptionService } from '../subscription/subscription.service';
import type {
  EmailJobData,
  NotificationJobData,
  SmsJobData,
  ContactNotificationSmsJobData,
  ContactNotificationEmailJobData,
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
          await this.handleContactNotificationSms(job.data as ContactNotificationSmsJobData);
          break;
        case 'contact-notification-email':
          await this.handleContactNotificationEmail(job.data as ContactNotificationEmailJobData);
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

  private async handleContactNotificationSms(data: ContactNotificationSmsJobData): Promise<void> {
    const { contactPhoneNumber, contactFirstName, creatorDisplayName, amount, currency, creatorId } = data;

    const optedOut = await this.smsOptOutService.isOptedOut(contactPhoneNumber);
    if (optedOut) {
      this.logger.log(`Skipping SMS to ${contactPhoneNumber} — opted out`);
      return;
    }

    const name = contactFirstName ?? 'Someone';
    const body = `${name}, a transaction of ${amount} ${currency} has been recorded in your name by ${creatorDisplayName} on Wathīqah. View your record at wathiqah.akanors.com. Reply STOP to opt out.`;

    await this.smsProvider.sendSms({ to: contactPhoneNumber, body });
    await this.subscriptionService.incrementFeatureUsage(creatorId, 'contactNotificationSms');
    this.logger.log(`Contact notification SMS sent to ${contactPhoneNumber}`);
  }

  private async handleContactNotificationEmail(data: ContactNotificationEmailJobData): Promise<void> {
    const { contactEmail, contactFirstName, creatorDisplayName, amount, currency } = data;

    const name = contactFirstName ?? 'Someone';
    const subject = 'A transaction has been recorded in your name on Wathīqah';

    // Note: map contactFirstName → name for the template variable
    await this.handleSendEmail({
      to: contactEmail,
      subject,
      templateName: 'contact-transaction-notification',
      templateData: { name, creatorDisplayName, amount, currency, subject },
    });

    this.logger.log(`Contact notification email sent to ${contactEmail}`);
  }
}
