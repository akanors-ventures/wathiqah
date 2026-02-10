import {
  Controller,
  Post,
  Body,
  Headers,
  Req,
  Res,
  HttpStatus,
  RawBodyRequest,
} from '@nestjs/common';
import { PaymentService } from './payment.service';
import { Request, Response } from 'express';

@Controller('payment')
export class PaymentController {
  constructor(private paymentService: PaymentService) {}

  @Post('webhook/stripe')
  async handleStripeWebhook(
    @Req() req: RawBodyRequest<Request>,
    @Headers('stripe-signature') signature: string,
    @Res() res: Response,
  ) {
    try {
      await this.paymentService.handleWebhook('stripe', req.rawBody, signature);
      return res.status(HttpStatus.OK).send();
    } catch (error) {
      return res
        .status(HttpStatus.BAD_REQUEST)
        .send(`Webhook Error: ${error.message}`);
    }
  }

  @Post('webhook/flutterwave')
  async handleFlutterwaveWebhook(
    @Body() payload: Record<string, unknown>,
    @Headers('verif-hash') signature: string,
    @Res() res: Response,
  ) {
    try {
      await this.paymentService.handleWebhook(
        'flutterwave',
        payload,
        signature,
      );
      return res.status(HttpStatus.OK).send();
    } catch (error) {
      return res
        .status(HttpStatus.BAD_REQUEST)
        .send(`Webhook Error: ${error.message}`);
    }
  }

  @Post('webhook/lemonsqueezy')
  async handleLemonSqueezyWebhook(
    @Body() payload: Record<string, unknown>,
    @Headers('x-signature') signature: string,
    @Res() res: Response,
  ) {
    try {
      await this.paymentService.handleWebhook(
        'lemonsqueezy',
        payload,
        signature,
      );
      return res.status(HttpStatus.OK).send();
    } catch (error) {
      return res
        .status(HttpStatus.BAD_REQUEST)
        .send(`Webhook Error: ${error.message}`);
    }
  }
}
