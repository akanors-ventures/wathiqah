import { Test, TestingModule } from '@nestjs/testing';
import { MaintenanceProcessor } from './maintenance.processor';
import { ExchangeRateService } from '../exchange-rate/exchange-rate.service';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationService } from '../notifications/notification.service';
import { Job } from 'bullmq';
import { SubscriptionTier } from '../../generated/prisma/client';

const mockExchangeRateService = { updateRates: jest.fn() };
const mockNotificationService = { sendProvisioningNotification: jest.fn() };
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
    });

    it('does nothing when no subscriptions are expired', async () => {
      mockPrisma.subscription.findMany.mockResolvedValue([]);
      await processor.process(makeJob('check-provisioning-expiry'));
      expect(mockPrisma.subscription.update).not.toHaveBeenCalled();
    });
  });
});
