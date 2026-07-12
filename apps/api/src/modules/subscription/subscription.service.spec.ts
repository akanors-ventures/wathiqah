import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException } from '@nestjs/common';
import { SubscriptionService } from './subscription.service';
import { PrismaService } from '../../prisma/prisma.service';
import { SubscriptionTier } from '../../generated/prisma/client';
import { BillingInterval } from '../payment/dto/billing-interval.enum';

describe('SubscriptionService', () => {
  let service: SubscriptionService;

  const mockPrismaService = {
    user: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    contact: { count: jest.fn() },
    note: { count: jest.fn() },
    subscription: {
      upsert: jest.fn(),
      update: jest.fn(),
      findFirst: jest.fn(),
    },
    payment: { create: jest.fn() },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SubscriptionService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<SubscriptionService>(SubscriptionService);
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  describe('checkFeatureLimit — allowOrganisations (boolean gate)', () => {
    it('throws ForbiddenException for FREE tier users', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({
        id: 'user_free',
        tier: SubscriptionTier.FREE,
        featureUsage: {},
      });

      await expect(
        service.checkFeatureLimit('user_free', 'allowOrganisations'),
      ).rejects.toThrow(ForbiddenException);

      await expect(
        service.checkFeatureLimit('user_free', 'allowOrganisations'),
      ).rejects.toThrow(
        'The feature "allowOrganisations" is not available on your current plan.',
      );
    });

    it('resolves to true for PRO tier users', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({
        id: 'user_pro',
        tier: SubscriptionTier.PRO,
        featureUsage: {},
      });

      await expect(
        service.checkFeatureLimit('user_pro', 'allowOrganisations'),
      ).resolves.toBe(true);
    });

    it('throws ForbiddenException when user is not found', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(
        service.checkFeatureLimit('nonexistent', 'allowOrganisations'),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('handleSubscriptionSuccess', () => {
    beforeEach(() => {
      jest.useFakeTimers().setSystemTime(new Date('2026-01-15T00:00:00.000Z'));
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('defaults to a one-month period when no interval is given', async () => {
      await service.handleSubscriptionSuccess(
        'user_1',
        'ext_1',
        'flutterwave',
        SubscriptionTier.PRO,
      );

      expect(mockPrismaService.subscription.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          update: expect.objectContaining({
            currentPeriodEnd: new Date('2026-02-15T00:00:00.000Z'),
            planId: null,
          }),
          create: expect.objectContaining({
            currentPeriodEnd: new Date('2026-02-15T00:00:00.000Z'),
            planId: null,
          }),
        }),
      );
    });

    it('computes a one-year period for BillingInterval.ANNUAL', async () => {
      await service.handleSubscriptionSuccess(
        'user_1',
        'ext_1',
        'flutterwave',
        SubscriptionTier.PRO,
        undefined,
        BillingInterval.ANNUAL,
      );

      expect(mockPrismaService.subscription.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          update: expect.objectContaining({
            currentPeriodEnd: new Date('2027-01-15T00:00:00.000Z'),
          }),
        }),
      );
    });

    it('persists the linked planId when provided', async () => {
      await service.handleSubscriptionSuccess(
        'user_1',
        'ext_1',
        'flutterwave',
        SubscriptionTier.PRO,
        undefined,
        BillingInterval.MONTHLY,
        'plan_uuid_1',
      );

      expect(mockPrismaService.subscription.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          create: expect.objectContaining({ planId: 'plan_uuid_1' }),
        }),
      );
    });
  });

  describe('updateSubscriptionStatus', () => {
    beforeEach(() => {
      jest.useFakeTimers().setSystemTime(new Date('2026-03-01T00:00:00.000Z'));
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('does nothing when no subscription matches the externalId', async () => {
      mockPrismaService.subscription.findFirst.mockResolvedValue(null);

      await service.updateSubscriptionStatus({
        externalId: 'missing',
        status: 'active',
      });

      expect(mockPrismaService.subscription.update).not.toHaveBeenCalled();
    });

    it('persists providerSubscriptionId when provided', async () => {
      mockPrismaService.subscription.findFirst.mockResolvedValue({
        id: 'sub_1',
        userId: 'user_1',
        currentPeriodEnd: null,
        plan: null,
      });

      await service.updateSubscriptionStatus({
        externalId: 'ext_1',
        status: 'active',
        providerSubscriptionId: '999',
      });

      expect(mockPrismaService.subscription.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'sub_1' },
          data: expect.objectContaining({ providerSubscriptionId: '999' }),
        }),
      );
    });

    it('recomputes a lapsed currentPeriodEnd from the linked plan interval when refreshPeriodEnd is true (annual)', async () => {
      mockPrismaService.subscription.findFirst.mockResolvedValue({
        id: 'sub_1',
        userId: 'user_1',
        currentPeriodEnd: new Date('2026-01-01T00:00:00.000Z'), // already in the past
        plan: { interval: 'yearly' },
      });

      await service.updateSubscriptionStatus({
        externalId: 'ext_1',
        status: 'active',
        refreshPeriodEnd: true,
      });

      expect(mockPrismaService.subscription.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            currentPeriodEnd: new Date('2027-03-01T00:00:00.000Z'),
            currentPeriodStart: new Date('2026-03-01T00:00:00.000Z'),
          }),
        }),
      );
    });

    it('defaults to a monthly refresh when the lapsed subscription has no linked plan', async () => {
      mockPrismaService.subscription.findFirst.mockResolvedValue({
        id: 'sub_1',
        userId: 'user_1',
        currentPeriodEnd: null,
        plan: null,
      });

      await service.updateSubscriptionStatus({
        externalId: 'ext_1',
        status: 'active',
        refreshPeriodEnd: true,
      });

      expect(mockPrismaService.subscription.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            currentPeriodEnd: new Date('2026-04-01T00:00:00.000Z'),
          }),
        }),
      );
    });

    it('leaves a still-valid future currentPeriodEnd untouched on reactivate (cancelled but not yet lapsed)', async () => {
      const futureDate = new Date('2026-06-01T00:00:00.000Z');
      mockPrismaService.subscription.findFirst.mockResolvedValue({
        id: 'sub_1',
        userId: 'user_1',
        currentPeriodEnd: futureDate,
        plan: { interval: 'monthly' },
      });

      await service.updateSubscriptionStatus({
        externalId: 'ext_1',
        status: 'active',
        refreshPeriodEnd: true,
      });

      const call = mockPrismaService.subscription.update.mock.calls[0][0];
      expect(call.data).not.toHaveProperty('currentPeriodEnd');
      expect(call.data).not.toHaveProperty('currentPeriodStart');
    });

    it('does not touch currentPeriodEnd when refreshPeriodEnd is not set', async () => {
      mockPrismaService.subscription.findFirst.mockResolvedValue({
        id: 'sub_1',
        userId: 'user_1',
        currentPeriodEnd: null,
        plan: null,
      });

      await service.updateSubscriptionStatus({
        externalId: 'ext_1',
        status: 'active',
        cancelAtPeriodEnd: true,
      });

      const call = mockPrismaService.subscription.update.mock.calls[0][0];
      expect(call.data).not.toHaveProperty('currentPeriodEnd');
      expect(call.data).not.toHaveProperty('currentPeriodStart');
      expect(call.data.cancelAtPeriodEnd).toBe(true);
    });
  });
});
