import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Twilio } from 'twilio';
import { SmsProvider, SmsPayload } from './sms-provider.interface';

@Injectable()
export class TwilioSmsProvider implements SmsProvider {
  private readonly logger = new Logger(TwilioSmsProvider.name);
  private readonly client: Twilio;
  private readonly fromNumber: string;

  constructor(private readonly configService: ConfigService) {
    const accountSid = this.configService.get<string>('twilio.accountSid');
    const authToken = this.configService.get<string>('twilio.authToken');
    this.fromNumber = this.configService.get<string>('twilio.fromNumber') ?? '';

    if (!accountSid || !authToken || !this.fromNumber) {
      this.logger.warn(
        'Twilio configuration is incomplete. SMS sending will fail.',
      );
      // Initialize with dummy values to prevent crash, but sending will fail
      this.client = new Twilio('AC' + '0'.repeat(32), '0'.repeat(32));
    } else {
      this.client = new Twilio(accountSid, authToken);
    }
  }

  async sendSms(payload: SmsPayload): Promise<void> {
    const { to, body } = payload;

    try {
      await this.client.messages.create({
        from: this.fromNumber,
        to,
        body,
      });

      this.logger.log(`SMS sent to ${to}`);
    } catch (error) {
      this.logger.error(`Error sending SMS to ${to}`, error as Error);
      throw error;
    }
  }
}
