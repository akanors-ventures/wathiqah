import { Controller, Post, Req, Res, HttpStatus, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request, Response } from 'express';
import * as twilio from 'twilio';
import { SmsOptOutService } from './services/sms-optout.service';
import { OptOutSource } from '../../generated/prisma/client';

@Controller('notifications')
export class NotificationsController {
  private readonly logger = new Logger(NotificationsController.name);

  constructor(
    private readonly smsOptOutService: SmsOptOutService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Receives Twilio STOP reply webhooks and persists the opt-out.
   * This endpoint is intentionally public — HTTP controllers in this
   * project are unauthenticated by default (auth is GraphQL-only via GqlAuthGuard).
   * Security is provided by Twilio signature validation.
   */
  @Post('sms/optout')
  async handleSmsOptOut(@Req() req: Request, @Res() res: Response) {
    const authToken = this.configService.get<string>('twilio.authToken');
    const signature = (req.headers['x-twilio-signature'] as string) ?? '';
    const appUrl = this.configService
      .get<string>('app.url')
      ?.replace(/\/$/, '');
    const webhookUrl = `${appUrl}/api/notifications/sms/optout`;

    const isValid = twilio.validateRequest(
      authToken,
      signature,
      webhookUrl,
      req.body as Record<string, string>,
    );

    if (!isValid) {
      this.logger.warn(
        `Invalid Twilio signature on opt-out webhook from ${req.ip}`,
      );
      return res.status(HttpStatus.FORBIDDEN).send('Invalid signature');
    }

    const phoneNumber = (req.body as Record<string, string>)?.From;
    if (phoneNumber) {
      await this.smsOptOutService.addOptOut(
        phoneNumber,
        OptOutSource.REPLY_STOP,
      );
      this.logger.log(`SMS opt-out recorded for ${phoneNumber}`);
    }

    return res
      .status(HttpStatus.OK)
      .type('text/xml')
      .send('<Response></Response>');
  }
}
