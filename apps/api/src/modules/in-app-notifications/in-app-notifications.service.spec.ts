import { Test } from '@nestjs/testing';
import { InAppNotificationsService } from './in-app-notifications.service';
import { PrismaService } from '../../prisma/prisma.service';
import { PUB_SUB } from '../../common/pubsub/pubsub.module';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { NotificationType } from '../../generated/prisma/client';

describe('InAppNotificationsService', () => {
  let service: InAppNotificationsService;
  let prisma: {
    notification: {
      create: jest.Mock;
      findMany: jest.Mock;
      findUnique: jest.Mock;
      update: jest.Mock;
      updateMany: jest.Mock;
      count: jest.Mock;
    };
  };
  let pubSub: { publish: jest.Mock };

  beforeEach(async () => {
    prisma = {
      notification: {
        create: jest.fn(),
        findMany: jest.fn().mockResolvedValue([]),
        findUnique: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
        count: jest.fn().mockResolvedValue(0),
      },
    };
    pubSub = { publish: jest.fn().mockResolvedValue(undefined) };
    const module = await Test.createTestingModule({
      providers: [
        InAppNotificationsService,
        { provide: PrismaService, useValue: prisma },
        { provide: PUB_SUB, useValue: pubSub },
      ],
    }).compile();
    service = module.get(InAppNotificationsService);
  });

  it('creates a notification and publishes notificationCreated', async () => {
    const created = {
      id: 'n1',
      userId: 'user1',
      type: NotificationType.WITNESS_INVITED,
      title: 'Title',
      body: 'Body',
      link: '/witnesses',
      read: false,
      createdAt: new Date(),
    };
    prisma.notification.create.mockResolvedValue(created);

    const result = await service.create({
      userId: 'user1',
      type: NotificationType.WITNESS_INVITED,
      title: 'Title',
      body: 'Body',
      link: '/witnesses',
    });

    expect(prisma.notification.create).toHaveBeenCalledWith({
      data: {
        userId: 'user1',
        type: NotificationType.WITNESS_INVITED,
        title: 'Title',
        body: 'Body',
        link: '/witnesses',
      },
    });
    expect(result).toBe(created);
    expect(pubSub.publish).toHaveBeenCalledWith('notificationCreated', {
      notificationCreated: created,
      userId: 'user1',
    });
  });

  it('returns the most recent 30 notifications for a user', async () => {
    await service.findMine('user1');
    expect(prisma.notification.findMany).toHaveBeenCalledWith({
      where: { userId: 'user1' },
      orderBy: { createdAt: 'desc' },
      take: 30,
    });
  });

  it('counts unread notifications for a user', async () => {
    prisma.notification.count.mockResolvedValue(3);
    const count = await service.unreadCount('user1');
    expect(prisma.notification.count).toHaveBeenCalledWith({
      where: { userId: 'user1', read: false },
    });
    expect(count).toBe(3);
  });

  it('marks a notification read when owned by the user', async () => {
    prisma.notification.findUnique.mockResolvedValue({
      id: 'n1',
      userId: 'user1',
    });
    const updated = { id: 'n1', userId: 'user1', read: true };
    prisma.notification.update.mockResolvedValue(updated);

    const result = await service.markRead('n1', 'user1');

    expect(prisma.notification.update).toHaveBeenCalledWith({
      where: { id: 'n1' },
      data: { read: true },
    });
    expect(result).toBe(updated);
  });

  it('throws NotFoundException when marking a missing notification read', async () => {
    prisma.notification.findUnique.mockResolvedValue(null);
    await expect(service.markRead('missing', 'user1')).rejects.toThrow(
      NotFoundException,
    );
  });

  it('throws ForbiddenException when marking another users notification read', async () => {
    prisma.notification.findUnique.mockResolvedValue({
      id: 'n1',
      userId: 'other-user',
    });
    await expect(service.markRead('n1', 'user1')).rejects.toThrow(
      ForbiddenException,
    );
  });

  it('marks all unread notifications read for a user', async () => {
    const result = await service.markAllRead('user1');
    expect(prisma.notification.updateMany).toHaveBeenCalledWith({
      where: { userId: 'user1', read: false },
      data: { read: true },
    });
    expect(result).toBe(true);
  });

  describe('createSafely', () => {
    it('delegates to create() with the given params', async () => {
      const created = { id: 'n1' };
      prisma.notification.create.mockResolvedValue(created);

      await service.createSafely(
        {
          userId: 'user1',
          type: NotificationType.WITNESS_INVITED,
          title: 'Title',
          body: 'Body',
          link: '/witnesses',
        },
        'test context',
      );

      expect(prisma.notification.create).toHaveBeenCalledWith({
        data: {
          userId: 'user1',
          type: NotificationType.WITNESS_INVITED,
          title: 'Title',
          body: 'Body',
          link: '/witnesses',
        },
      });
    });

    it('never throws when create() rejects, and never rejects itself', async () => {
      prisma.notification.create.mockRejectedValue(new Error('db down'));

      await expect(
        service.createSafely(
          {
            userId: 'user1',
            type: NotificationType.WITNESS_INVITED,
            title: 'Title',
            body: 'Body',
            link: null,
          },
          'test context',
        ),
      ).resolves.toBeUndefined();
    });
  });
});
