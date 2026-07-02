import { Test, TestingModule } from '@nestjs/testing';
import { MaintenanceProcessor } from './maintenance.processor';
import { ExchangeRateService } from '../exchange-rate/exchange-rate.service';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationService } from '../notifications/notification.service';
import { InAppNotificationsService } from '../in-app-notifications/in-app-notifications.service';
import { Job } from 'bullmq';
import {
  SubscriptionTier,
  NotificationType,
} from '../../generated/prisma/client';

const mockExchangeRateService = { updateRates: jest.fn() };
const mockNotificationService = { sendProvisioningNotification: jest.fn() };
const mockInAppNotificationsService = {
  create: jest.fn().mockResolvedValue({}),
  createSafely: jest.fn().mockResolvedValue(undefined),
};
const mockPrisma = {
  subscription: { findMany: jest.fn(), update: jest.fn() },
  user: { update: jest.fn() },
  $transaction: jest.fn((ops: unknown[]) => Promise.all(ops)),
};

const makeJob = (name: string) => ({ name, data: {} }) as unknown as Job;

describe('MaintenanceProcessor', () => {
  let processor: MaintenanceProcessor;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MaintenanceProcessor,
        { provide: ExchangeRateService, useValue: mockExchangeRateService },
        { provide: PrismaService, useValue: mockPrisma },
        { provide: NotificationService, useValue: mockNotificationService },
        {
          provide: InAppNotificationsService,
          useValue: mockInAppNotificationsService,
        },
      ],
    }).compile();

    processor = module.get(MaintenanceProcessor);
    jest.clearAllMocks();
  });

  describe('exchange-rate-update', () => {
    it('calls exchangeRateService.updateRates()', async () => {
      mockExchangeRateService.updateRates.mockResolvedValue(undefined);
      await processor.process(makeJob('exchange-rate-update'));
      expect(mockExchangeRateService.updateRates).toHaveBeenCalledTimes(1);
    });
  });

  describe('check-provisioning-expiry', () => {
    it('downgrades and notifies each expired provisioned subscription', async () => {
      const expiredSub = {
        id: 'sub-1',
        userId: 'user-1',
        currentPeriodEnd: new Date('2026-01-01'),
        user: { email: 'user@example.com', firstName: 'Amina' },
      };
      mockPrisma.subscription.findMany.mockResolvedValue([expiredSub]);
      mockPrisma.subscription.update.mockResolvedValue({});
      mockPrisma.user.update.mockResolvedValue({});
      mockNotificationService.sendProvisioningNotification.mockResolvedValue(
        undefined,
      );

      await processor.process(makeJob('check-provisioning-expiry'));

      expect(mockPrisma.subscription.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'sub-1' },
          data: expect.objectContaining({
            tier: SubscriptionTier.FREE,
            status: 'canceled',
            isProvisioned: false,
          }),
        }),
      );
      expect(
        mockNotificationService.sendProvisioningNotification,
      ).toHaveBeenCalledWith(
        expect.objectContaining({
          notificationType: 'expired',
          email: 'user@example.com',
        }),
      );
      expect(mockInAppNotificationsService.createSafely).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-1',
          type: NotificationType.PROVISIONING_EXPIRED,
        }),
        expect.any(String),
      );
    });

    it('does nothing when no subscriptions are expired', async () => {
      mockPrisma.subscription.findMany.mockResolvedValue([]);
      await processor.process(makeJob('check-provisioning-expiry'));
      expect(mockPrisma.subscription.update).not.toHaveBeenCalled();
    });

    it('processes remaining subscriptions even when one fails', async () => {
      const subs = [
        {
          id: 'sub-1',
          userId: 'user-1',
          currentPeriodEnd: new Date('2026-01-01'),
          user: { email: 'user1@example.com', firstName: 'Amina' },
        },
        {
          id: 'sub-2',
          userId: 'user-2',
          currentPeriodEnd: new Date('2026-01-01'),
          user: { email: 'user2@example.com', firstName: 'Bilal' },
        },
      ];
      mockPrisma.subscription.findMany.mockResolvedValue(subs);
      mockPrisma.user.update.mockResolvedValue({});
      mockNotificationService.sendProvisioningNotification.mockResolvedValue(
        undefined,
      );
      // sub-1's transaction fails; sub-2's should still complete.
      mockPrisma.subscription.update.mockImplementation((args) => {
        if (args.where.id === 'sub-1') {
          return Promise.reject(new Error('db error'));
        }
        return Promise.resolve({});
      });

      await processor.process(makeJob('check-provisioning-expiry'));

      expect(
        mockNotificationService.sendProvisioningNotification,
      ).toHaveBeenCalledWith(
        expect.objectContaining({ email: 'user2@example.com' }),
      );
      expect(
        mockNotificationService.sendProvisioningNotification,
      ).not.toHaveBeenCalledWith(
        expect.objectContaining({ email: 'user1@example.com' }),
      );
    });
  });
});
