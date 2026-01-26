import { EmailPayload } from '../providers/email-provider.interface';
import { SmsPayload } from '../providers/sms-provider.interface';

export type EmailNotificationOptions = EmailPayload;

export type SmsNotificationOptions = SmsPayload;

export interface MultiChannelNotificationOptions {
  email?: EmailNotificationOptions;
  sms?: SmsNotificationOptions;
  // place to add push/webhook later
}
