export interface EmailPayload {
  to: string;
  subject: string;
  html?: string;
  text?: string;
  templateId?: string;
  templateData?: Record<string, any>;
}

export abstract class EmailProvider {
  abstract sendEmail(payload: EmailPayload): Promise<void>;
}
