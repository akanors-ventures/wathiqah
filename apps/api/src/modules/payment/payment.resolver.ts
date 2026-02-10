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
  ) {
    const userId = context.req.user.id;
    return this.paymentService.createSubscriptionSession(
      userId,
      tier,
      currency,
      context.req.geoip,
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
}
