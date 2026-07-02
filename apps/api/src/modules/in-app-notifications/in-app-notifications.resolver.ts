import {
  Resolver,
  Query,
  Mutation,
  Subscription,
  Args,
  ID,
  Int,
} from '@nestjs/graphql';
import { UseGuards, Inject } from '@nestjs/common';
import type { PubSub } from 'graphql-subscriptions';
import { GqlAuthGuard } from '../../common/guards/gql-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { PUB_SUB } from '../../common/pubsub/pubsub.module';
import { sameFieldFilter } from '../../common/utils/same-field-filter.util';
import { InAppNotificationsService } from './in-app-notifications.service';
import { Notification } from './entities/notification.entity';
import { User } from '../users/entities/user.entity';

const sameUserFilter = sameFieldFilter<'userId', 'id'>('userId', 'id');

@Resolver(() => Notification)
@UseGuards(GqlAuthGuard)
export class InAppNotificationsResolver {
  constructor(
    private readonly service: InAppNotificationsService,
    @Inject(PUB_SUB) private readonly pubSub: PubSub,
  ) {}

  // ── Notification live updates ───────────────────────────────────────────
  // Personal-only (no org scoping) — a user's notification inbox doesn't
  // change based on which org they're currently viewing, same bucket as
  // Witness requests and Personal Notes. Filtered to the subscriber's own
  // userId so a user only ever receives their own notifications.

  @Subscription(() => Notification, { filter: sameUserFilter })
  notificationCreated() {
    return this.pubSub.asyncIterableIterator('notificationCreated');
  }

  @Query(() => [Notification], { name: 'myNotifications' })
  myNotifications(@CurrentUser() user: User) {
    return this.service.findMine(user.id);
  }

  @Query(() => Int, { name: 'myUnreadNotificationCount' })
  myUnreadNotificationCount(@CurrentUser() user: User) {
    return this.service.unreadCount(user.id);
  }

  @Mutation(() => Notification)
  markNotificationRead(
    @Args('id', { type: () => ID }) id: string,
    @CurrentUser() user: User,
  ) {
    return this.service.markRead(id, user.id);
  }

  @Mutation(() => Boolean)
  markAllNotificationsRead(@CurrentUser() user: User) {
    return this.service.markAllRead(user.id);
  }
}
