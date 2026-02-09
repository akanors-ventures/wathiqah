import { Resolver, Query, Mutation, Args } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { GqlAuthGuard } from '../../common/guards/gql-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';
import {
  SubscriptionInfo,
  CheckoutSession,
} from './entities/subscription.entity';
import {
  SUBSCRIPTION_LIMITS,
  SubscriptionTier,
} from './subscription.constants';
import { UsersService } from '../users/users.service';

@Resolver()
export class SubscriptionResolver {
  constructor(private readonly usersService: UsersService) {}

  @Query(() => SubscriptionInfo, { name: 'mySubscription' })
  @UseGuards(GqlAuthGuard)
  async getMySubscription(
    @CurrentUser() user: User,
  ): Promise<SubscriptionInfo> {
    const fullUser = await this.usersService.findOne(user.id);
    const tier = fullUser?.tier || SubscriptionTier.FREE;
    return {
      tier,
      limits: SUBSCRIPTION_LIMITS[tier],
      featureUsage: fullUser?.featureUsage as Record<string, unknown>,
      subscriptionStatus: fullUser?.subscriptionStatus,
    };
  }

  @Mutation(() => CheckoutSession, { name: 'createSubscriptionSession' })
  @UseGuards(GqlAuthGuard)
  async createSubscriptionSession(
    @Args('tier', { type: () => SubscriptionTier }) tier: SubscriptionTier,
    @CurrentUser() user: User,
  ): Promise<CheckoutSession> {
    // Placeholder for Stripe/LemonSqueezy integration
    return {
      url: `https://checkout.example.com/subscribe?tier=${tier}&user=${user.id}`,
      sessionId: 'placeholder_session_id',
    };
  }
}
