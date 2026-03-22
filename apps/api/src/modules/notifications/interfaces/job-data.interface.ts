export interface EmailJobData {
  to: string;
  subject: string;
  templateName: string;
  templateData: Record<string, unknown>;
}

export interface SmsJobData {
  to: string;
  body: string;
}

export interface ContactNotificationSmsJobData {
  type: 'contact-notification-sms';
  transactionId: string;
  contactPhoneNumber: string;
  contactFirstName: string | null;
  creatorId: string;
  creatorDisplayName: string;
  amount: number;
  currency: string;
}

export interface ContactNotificationEmailJobData {
  type: 'contact-notification-email';
  transactionId: string;
  contactEmail: string;
  contactFirstName: string | null;
  creatorDisplayName: string;
  amount: number;
  currency: string;
}

export type NotificationJobData =
  | EmailJobData
  | SmsJobData
  | ContactNotificationSmsJobData
  | ContactNotificationEmailJobData;
