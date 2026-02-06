import { TemplateVariables } from 'mailtrap';

export interface EmailPayload {
  to: string;
  subject: string;
  html?: string;
  text?: string;
  templateId?: string;
  templateData?: TemplateVariables;
}

export abstract class EmailProvider {
  abstract sendEmail(payload: EmailPayload): Promise<void>;
}
