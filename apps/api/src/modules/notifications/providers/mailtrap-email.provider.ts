import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MailtrapClient } from 'mailtrap';
import { EmailProvider, EmailPayload } from './email-provider.interface';

@Injectable()
export class MailtrapEmailProvider implements EmailProvider {
  private readonly logger = new Logger(MailtrapEmailProvider.name);
  private readonly client: MailtrapClient;
  private readonly defaultFrom: { email: string; name: string };

  constructor(private readonly configService: ConfigService) {
    const token = this.configService.get<string>('mailtrap.token');
    const sandbox =
      this.configService.get<string>('mailtrap.useSandbox') === 'true';
    const testInboxId = sandbox
      ? Number(this.configService.get<string>('mailtrap.testInboxId'))
      : undefined;
    // Parse the defaultFrom email/name
    const fromEmail =
      this.configService.get<string>('app.emailFrom') ||
      'no-reply@wathiqah.akanors.com';
    const appName = this.configService.get<string>('app.name') || 'Wathiqah';

    this.defaultFrom = { email: fromEmail, name: appName };

    if (!token) {
      this.logger.warn('MAILTRAP_TOKEN is not set. Email sending will fail.');
      // We still initialize the client, but it will likely fail on send if used
      this.client = new MailtrapClient({ token: 'missing_token' });
    } else {
      this.client = new MailtrapClient({ token, sandbox, testInboxId });
    }
  }

  async sendEmail(payload: EmailPayload): Promise<void> {
    const { to, subject, html, text, templateId, templateData } = payload;

    try {
      // Note: Mailtrap expects specific structures.
      // If templateId is provided, we assume it's a Mailtrap Template UUID.
      if (templateId) {
        await this.client.send({
          from: this.defaultFrom,
          to: [{ email: to }],
          template_uuid: templateId,
          template_variables: templateData || {},
        });
      } else {
        await this.client.send({
          from: this.defaultFrom,
          to: [{ email: to }],
          subject,
          text: text || '',
          html: html || '',
        });
      }
      this.logger.log(
        `Email sent to ${to} with subject "${subject}" via Mailtrap`,
      );
    } catch (error) {
      this.logger.error(
        `Error sending email to ${to} via Mailtrap: ${(error as Error).message}`,
        (error as Error).stack,
      );
      throw error;
    }
  }
}
