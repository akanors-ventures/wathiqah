import { Injectable, Logger } from '@nestjs/common';
import { EmailProvider } from './providers/email-provider.interface';
import { SmsProvider } from './providers/sms-provider.interface';
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
  ) {}

  async sendEmail(options: EmailNotificationOptions): Promise<void> {
    await this.emailProvider.sendEmail(options);
  }

  async sendSms(options: SmsNotificationOptions): Promise<void> {
    await this.smsProvider.sendSms(options);
  }

  async sendMultiChannel(
    options: MultiChannelNotificationOptions,
  ): Promise<void> {
    const promises: Promise<void>[] = [];

    if (options.email) {
      promises.push(this.emailProvider.sendEmail(options.email));
    }

    if (options.sms) {
      promises.push(this.smsProvider.sendSms(options.sms));
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
