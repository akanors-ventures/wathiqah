import { Resolver, Mutation, Args, Context } from '@nestjs/graphql';
import { UseGuards, UseInterceptors } from '@nestjs/common';
import { Request } from 'express';
import { GqlAuthGuard } from '../../common/guards/gql-auth.guard';
import { GeoIPInterceptor } from '../../common/interceptors/geoip.interceptor';
import { PaymentService } from './payment.service';
import { SubscriptionTier } from '../../generated/prisma/enums';
import { CheckoutSession } from '../subscription/entities/subscription.entity';
import { User } from '../users/entities/user.entity';
import { GeoIPInfo } from '../geoip/entities/geoip-info.entity';
import { BillingInterval } from './dto/billing-interval.enum';

@Resolver()
export class PaymentResolver {
  constructor(private paymentService: PaymentService) {}

  @Mutation(() => CheckoutSession)
  @UseGuards(GqlAuthGuard)
  @UseInterceptors(GeoIPInterceptor)
  async createCheckoutSession(
    @Context() context: { req: Request & { user: User; geoip?: GeoIPInfo } },
    @Args('tier', { type: () => SubscriptionTier }) tier: SubscriptionTier,
    @Args('currency', { nullable: true }) currency?: string,
    @Args('interval', {
      type: () => BillingInterval,
      nullable: true,
      defaultValue: BillingInterval.MONTHLY,
    })
    interval?: BillingInterval,
  ) {
    const userId = context.req.user.id;
    return this.paymentService.createSubscriptionSession(
      userId,
      tier,
      currency,
      context.req.geoip,
      interval,
    );
  }

  @Mutation(() => Boolean)
  @UseGuards(GqlAuthGuard)
  async cancelSubscription(
    @Context() context: { req: Request & { user: User } },
  ) {
    const userId = context.req.user.id;
    await this.paymentService.cancelSubscription(userId);
    return true;
  }

  @Mutation(() => Boolean)
  @UseGuards(GqlAuthGuard)
  async reactivateSubscription(
    @Context() context: { req: Request & { user: User } },
  ) {
    const userId = context.req.user.id;
    await this.paymentService.reactivateSubscription(userId);
    return true;
  }
}
