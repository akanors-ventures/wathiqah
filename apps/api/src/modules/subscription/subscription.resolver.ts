import { Resolver, Query } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { GqlAuthGuard } from '../../common/guards/gql-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';
import { SubscriptionInfo } from './entities/subscription.entity';
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
}
