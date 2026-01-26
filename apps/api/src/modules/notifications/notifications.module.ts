import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { NotificationService } from './notification.service';
import { TemplateService } from './template.service';
import { MailtrapEmailProvider } from './providers/mailtrap-email.provider';
import { TwilioSmsProvider } from './providers/twilio-sms.provider';
import { EmailProvider } from './providers/email-provider.interface';
import { SmsProvider } from './providers/sms-provider.interface';

@Module({
  imports: [ConfigModule],
  providers: [
    NotificationService,
    TemplateService,
    {
      provide: EmailProvider,
      useClass: MailtrapEmailProvider,
    },
    {
      provide: SmsProvider,
      useClass: TwilioSmsProvider,
    },
  ],
  exports: [NotificationService],
})
export class NotificationsModule {}
