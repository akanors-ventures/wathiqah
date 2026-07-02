import { Injectable, Logger, Inject } from '@nestjs/common';
import type { PubSub } from 'graphql-subscriptions';
import { PrismaService } from '../../prisma/prisma.service';
import { PUB_SUB } from '../../common/pubsub/pubsub.module';
import { assertOwnership } from '../../common/utils/assert-ownership.util';
import { NotificationType } from '../../generated/prisma/client';
import type { NotificationContent } from './notification-templates';

const RECENT_NOTIFICATIONS_LIMIT = 30;

@Injectable()
export class InAppNotificationsService {
  private readonly logger = new Logger(InAppNotificationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject(PUB_SUB) private readonly pubSub: PubSub,
  ) {}

  async create(params: {
    userId: string;
    type: NotificationType;
    title: string;
    body: string;
    link?: string | null;
  }) {
    const notification = await this.prisma.notification.create({
      data: { ...params },
    });
    await this.pubSub.publish('notificationCreated', {
      notificationCreated: notification,
      userId: params.userId,
    });
    return notification;
  }

  /**
   * Fire-and-forget variant of `create()` for trigger points that must
   * never let a notification failure interrupt their primary flow (a
   * witness invite, a role change, etc.). Never throws — failures are
   * logged with `context` identifying which trigger point failed.
   */
  async createSafely(
    params: { userId: string } & NotificationContent,
    context: string,
  ): Promise<void> {
    try {
      await this.create(params);
    } catch (err) {
      this.logger.error(
        `Failed to create in-app notification (${context})`,
        err,
      );
    }
  }

  async findMine(userId: string) {
    return this.prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: RECENT_NOTIFICATIONS_LIMIT,
    });
  }

  async unreadCount(userId: string) {
    return this.prisma.notification.count({ where: { userId, read: false } });
  }

  async markRead(id: string, userId: string) {
    await this.assertOwnership(id, userId);
    return this.prisma.notification.update({
      where: { id },
      data: { read: true },
    });
  }

  async markAllRead(userId: string) {
    await this.prisma.notification.updateMany({
      where: { userId, read: false },
      data: { read: true },
    });
    return true;
  }

  private async assertOwnership(id: string, userId: string) {
    await assertOwnership(
      () => this.prisma.notification.findUnique({ where: { id } }),
      'userId',
      userId,
      'Notification not found',
      'Notification does not belong to this user',
    );
  }
}
