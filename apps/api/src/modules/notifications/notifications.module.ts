import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { NotificationService } from './notification.service';
import { SendGridEmailProvider } from './providers/sendgrid-email.provider';
import { TwilioSmsProvider } from './providers/twilio-sms.provider';
import { EmailProvider } from './providers/email-provider.interface';
import { SmsProvider } from './providers/sms-provider.interface';

@Module({
  imports: [ConfigModule],
  providers: [
    NotificationService,
    {
      provide: EmailProvider,
      useClass: SendGridEmailProvider,
    },
    {
      provide: SmsProvider,
      useClass: TwilioSmsProvider,
    },
  ],
  exports: [NotificationService],
})
export class NotificationsModule {}
