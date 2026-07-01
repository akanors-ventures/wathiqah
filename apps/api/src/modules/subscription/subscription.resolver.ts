import { Resolver, Query } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { GqlAuthGuard } from '../../common/guards/gql-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';
import { SubscriptionInfo, ProPricing } from './entities/subscription.entity';
import {
  SUBSCRIPTION_LIMITS,
  SubscriptionTier,
  PRO_PRICING,
} from './subscription.constants';
import { UsersService } from '../users/users.service';
import { SubscriptionService } from './subscription.service';

@Resolver()
export class SubscriptionResolver {
  constructor(
    private readonly usersService: UsersService,
    private readonly subscriptionService: SubscriptionService,
  ) {}

  @Query(() => SubscriptionInfo, { name: 'mySubscription' })
  @UseGuards(GqlAuthGuard)
  async getMySubscription(
    @CurrentUser() user: User,
  ): Promise<SubscriptionInfo> {
    const fullUser = await this.usersService.findOne(user.id);
    const subscription = await this.subscriptionService.getSubscription(
      user.id,
    );

    const tier = fullUser?.tier || SubscriptionTier.FREE;
    return {
      tier,
      limits: SUBSCRIPTION_LIMITS[tier],
      featureUsage: fullUser?.featureUsage as Record<string, unknown>,
      subscriptionStatus: fullUser?.subscriptionStatus,
      cancelAtPeriodEnd: subscription?.cancelAtPeriodEnd,
      currentPeriodEnd: subscription?.currentPeriodEnd,
    };
  }

  // No auth guard — pricing page must work for logged-out visitors
  @Query(() => ProPricing, { name: 'proPricing' })
  getProPricing(): ProPricing {
    return {
      currencies: (
        Object.entries(PRO_PRICING) as [
          string,
          { monthly: number; annual: number },
        ][]
      ).map(([currency, prices]) => ({ currency, ...prices })),
      freeLimits: SUBSCRIPTION_LIMITS[SubscriptionTier.FREE],
      proLimits: SUBSCRIPTION_LIMITS[SubscriptionTier.PRO],
    };
  }
}
