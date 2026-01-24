import { EmailPayload } from '../providers/email-provider.interface';
import { SmsPayload } from '../providers/sms-provider.interface';

export interface EmailNotificationOptions extends EmailPayload {}

export interface SmsNotificationOptions extends SmsPayload {}

export interface MultiChannelNotificationOptions {
  email?: EmailNotificationOptions;
  sms?: SmsNotificationOptions;
  // place to add push/webhook later
}
