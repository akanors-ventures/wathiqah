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

export type NotificationJobData = EmailJobData | SmsJobData;
