import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EmailProvider } from './providers/email-provider.interface';
import { SmsProvider } from './providers/sms-provider.interface';
import { TemplateService } from './template.service';
import type {
  EmailJobData,
  NotificationJobData,
  SmsJobData,
} from './interfaces/job-data.interface';

@Processor('notifications')
export class NotificationsProcessor extends WorkerHost {
  private readonly logger = new Logger(NotificationsProcessor.name);

  constructor(
    private readonly emailProvider: EmailProvider,
    private readonly smsProvider: SmsProvider,
    private readonly templateService: TemplateService,
    private readonly configService: ConfigService,
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
}
