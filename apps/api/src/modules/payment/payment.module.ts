import { Module } from '@nestjs/common';
import { StripeService } from './stripe.service';
import { FlutterwaveService } from './flutterwave.service';
import { LemonSqueezyService } from './lemonsqueezy.service';
import { PaymentResolver } from './payment.resolver';
import { PaymentService } from './payment.service';
import { PaymentController } from './payment.controller';
import { SubscriptionModule } from '../subscription/subscription.module';
import { PrismaModule } from '../../prisma/prisma.module';
import { GeoIPModule } from '../geoip/geoip.module';

@Module({
  imports: [SubscriptionModule, PrismaModule, GeoIPModule],
  providers: [
    PaymentService,
    StripeService,
    FlutterwaveService,
    LemonSqueezyService,
    PaymentResolver,
  ],
  controllers: [PaymentController],
  exports: [PaymentService],
})
export class PaymentModule {}
