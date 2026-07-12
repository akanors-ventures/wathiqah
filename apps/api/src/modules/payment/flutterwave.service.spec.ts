import { Test, TestingModule } from '@nestjs/testing';
import { FlutterwaveService } from './flutterwave.service';
import { ConfigService } from '@nestjs/config';
import { SubscriptionService } from '../subscription/subscription.service';
import { PrismaService } from '../../prisma/prisma.service';
import {
  SupportStatus,
  PaymentStatus,
  PaymentType,
  SubscriptionTier,
  PlanStatus,
} from '../../generated/prisma/enums';
import { Prisma } from '../../generated/prisma/client';
import { BillingInterval } from './dto/billing-interval.enum';
import * as axios from 'axios';

jest.mock('axios');

describe('FlutterwaveService', () => {
  let service: FlutterwaveService;
  let prismaService: PrismaService;
  let subscriptionService: SubscriptionService;

  const mockPrismaService = {
    $transaction: jest.fn(
      async (callback) => await callback(mockPrismaService),
    ),
    payment: {
      create: jest.fn(),
    },
    support: {
      create: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    plan: {
      findFirst: jest.fn(),
    },
  };

  const mockSubscriptionService = {
    handleSubscriptionSuccess: jest.fn(),
    updateSubscriptionStatus: jest.fn(),
    deactivateSubscription: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn((key) => {
      if (key === 'payment.flutterwave.webhookHash') return 'secret_hash';
      if (key === 'payment.flutterwave.secretKey') return 'secret_key';
      if (key === 'payment.successUrl')
        return 'http://localhost:3000/payment/success';
      return null;
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FlutterwaveService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: SubscriptionService, useValue: mockSubscriptionService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<FlutterwaveService>(FlutterwaveService);
    prismaService = module.get<PrismaService>(PrismaService);
    subscriptionService = module.get<SubscriptionService>(SubscriptionService);
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  describe('handleWebhook', () => {
    beforeEach(() => {
      // User existence check added in d329ad6 — must resolve to a user for the
      // transaction path to execute; resolves to null in the "user not found" test.
      mockPrismaService.user.findUnique.mockResolvedValue({ id: 'user_123' });
    });

    it('should create payment and subscription records on charge.completed for subscription', async () => {
      const payload = {
        event: 'charge.completed',
        data: {
          id: 12345,
          tx_ref: 'sub_user_123_timestamp',
          amount: 5000,
          currency: 'NGN',
          status: 'successful',
          meta: {
            userId: 'user_123',
            tier: 'PRO',
          },
          customer: {
            email: 'test@example.com',
          },
        },
      };

      await service.handleWebhook(payload, 'secret_hash');

      expect(prismaService.$transaction).toHaveBeenCalled();
      expect(prismaService.payment.create).toHaveBeenCalledWith({
        data: {
          userId: 'user_123',
          amount: new Prisma.Decimal(5000),
          currency: 'NGN',
          status: PaymentStatus.SUCCESSFUL,
          provider: 'flutterwave',
          externalId: '12345',
          txRef: 'sub_user_123_timestamp',
          type: PaymentType.SUBSCRIPTION,
          metadata: payload.data,
        },
      });
      expect(
        subscriptionService.handleSubscriptionSuccess,
      ).toHaveBeenCalledWith(
        'user_123',
        '12345', // data.id, not tx_ref — the charge/transaction id
        'flutterwave',
        'PRO',
        prismaService,
        undefined, // no interval in meta
        undefined, // no planId in meta
      );
    });

    it('passes the interval and planId from meta through to handleSubscriptionSuccess', async () => {
      const payload = {
        event: 'charge.completed',
        data: {
          id: 12345,
          tx_ref: 'sub_user_123_timestamp',
          amount: 25000,
          currency: 'NGN',
          status: 'successful',
          meta: {
            userId: 'user_123',
            tier: 'PRO',
            interval: BillingInterval.ANNUAL,
            planId: 'plan_internal_uuid',
          },
          customer: {
            email: 'test@example.com',
          },
        },
      };

      await service.handleWebhook(payload, 'secret_hash');

      expect(
        subscriptionService.handleSubscriptionSuccess,
      ).toHaveBeenCalledWith(
        'user_123',
        '12345',
        'flutterwave',
        'PRO',
        prismaService,
        BillingInterval.ANNUAL,
        'plan_internal_uuid',
      );
    });

    it('falls back to tx_ref as the externalId (and reuses it for the subscription) when id is missing', async () => {
      const payload = {
        event: 'charge.completed',
        data: {
          tx_ref: 'sub_user_123_timestamp',
          amount: 5000,
          currency: 'NGN',
          status: 'successful',
          meta: { userId: 'user_123', tier: 'PRO' },
          customer: { email: 'test@example.com' },
        },
      };

      await service.handleWebhook(payload, 'secret_hash');

      expect(prismaService.payment.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            externalId: 'sub_user_123_timestamp',
            txRef: 'sub_user_123_timestamp',
          }),
        }),
      );
      expect(
        subscriptionService.handleSubscriptionSuccess,
      ).toHaveBeenCalledWith(
        'user_123',
        'sub_user_123_timestamp',
        'flutterwave',
        'PRO',
        prismaService,
        undefined,
        undefined,
      );
    });

    it('skips the payment record instead of throwing when both id and tx_ref are missing', async () => {
      const payload = {
        event: 'charge.completed',
        data: {
          amount: 5000,
          currency: 'NGN',
          status: 'successful',
          meta: { userId: 'user_123', tier: 'PRO' },
          customer: { email: 'test@example.com' },
        },
      };

      await expect(
        service.handleWebhook(payload, 'secret_hash'),
      ).resolves.not.toThrow();

      expect(prismaService.$transaction).not.toHaveBeenCalled();
      expect(prismaService.payment.create).not.toHaveBeenCalled();
    });

    it('should create payment and support records on charge.completed for support', async () => {
      const payload = {
        event: 'charge.completed',
        data: {
          id: 67890,
          tx_ref: 'support_user_123_timestamp',
          amount: 1000,
          currency: 'NGN',
          status: 'successful',
          meta: {
            userId: 'user_123',
            type: 'support',
          },
          customer: {
            email: 'supporter@example.com',
            name: 'Supporter Name',
          },
        },
      };

      await service.handleWebhook(payload, 'secret_hash');

      expect(prismaService.$transaction).toHaveBeenCalled();
      expect(prismaService.payment.create).toHaveBeenCalledWith({
        data: {
          userId: 'user_123',
          amount: new Prisma.Decimal(1000),
          currency: 'NGN',
          status: PaymentStatus.SUCCESSFUL,
          provider: 'flutterwave',
          externalId: '67890',
          txRef: 'support_user_123_timestamp',
          type: PaymentType.SUPPORT,
          metadata: payload.data,
        },
      });
      expect(prismaService.support.create).toHaveBeenCalledWith({
        data: {
          amount: 1000,
          currency: 'NGN',
          status: SupportStatus.SUCCESSFUL,
          paymentProvider: 'flutterwave',
          paymentRef: 'support_user_123_timestamp',
          supporterId: 'user_123',
          supporterEmail: 'supporter@example.com',
          supporterName: 'Supporter Name',
        },
      });
      expect(prismaService.user.update).toHaveBeenCalledWith({
        where: { id: 'user_123' },
        data: { isSupporter: true },
      });
    });

    it('should do nothing when userId is not found in the database', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      const payload = {
        event: 'charge.completed',
        data: {
          id: 99999,
          tx_ref: 'sub_unknown_user_timestamp',
          amount: 5000,
          currency: 'NGN',
          status: 'successful',
          meta: { userId: 'unknown_user', tier: 'PRO' },
          customer: { email: 'ghost@example.com' },
        },
      };

      await service.handleWebhook(payload, 'secret_hash');

      expect(prismaService.$transaction).not.toHaveBeenCalled();
    });
  });

  describe('createSubscriptionSession', () => {
    const mockUser = {
      id: 'user_123',
      email: 'test@example.com',
      firstName: 'Test',
      lastName: 'User',
      phoneNumber: '+2341234567890',
    } as Parameters<FlutterwaveService['createSubscriptionSession']>[0];

    const mockPlan = {
      id: 'plan_uuid_1',
      tier: SubscriptionTier.PRO,
      interval: 'monthly',
      currency: 'NGN',
      amount: new Prisma.Decimal(2500),
      name: 'Monthly Wathiqah Pro',
      provider: 'flutterwave',
      providerPlanId: '163686',
      status: PlanStatus.ACTIVE,
    };

    it('throws when no active plan exists for the requested tier/interval/currency bucket', async () => {
      mockPrismaService.plan.findFirst.mockResolvedValue(null);

      await expect(
        service.createSubscriptionSession(
          mockUser,
          SubscriptionTier.PRO,
          undefined,
          'NGN',
        ),
      ).rejects.toThrow('Monthly subscription plan is not configured for NGN');

      expect(mockPrismaService.plan.findFirst).toHaveBeenCalledWith({
        where: {
          tier: SubscriptionTier.PRO,
          interval: 'monthly',
          currency: 'NGN',
          status: PlanStatus.ACTIVE,
        },
        orderBy: { createdAt: 'desc' },
      });
    });

    it('uses the resolved plan amount, provider plan id, and stamps planId into meta', async () => {
      mockPrismaService.plan.findFirst.mockResolvedValue(mockPlan);
      const axiosMock = axios as unknown as Record<string, jest.Mock>;
      axiosMock.post = jest.fn().mockResolvedValue({
        data: {
          status: 'success',
          data: { link: 'https://checkout.flutterwave.com/v3/hosted/pay/abc' },
        },
      });

      await service.createSubscriptionSession(
        mockUser,
        SubscriptionTier.PRO,
        undefined,
        'NGN',
      );

      const callArgs = axiosMock.post.mock.calls[0];
      const payload = callArgs[1] as Record<string, unknown>;
      expect(payload.amount).toBe('2500');
      expect(payload.currency).toBe('NGN');
      expect(payload.payment_plan).toBe('163686');
      expect((payload.meta as Record<string, unknown>).planId).toBe(
        'plan_uuid_1',
      );
    });

    it('maps BillingInterval.ANNUAL to Flutterwave\'s "yearly" interval when looking up the plan', async () => {
      mockPrismaService.plan.findFirst.mockResolvedValue({
        ...mockPlan,
        interval: 'yearly',
      });
      const axiosMock = axios as unknown as Record<string, jest.Mock>;
      axiosMock.post = jest.fn().mockResolvedValue({
        data: { data: { link: 'https://checkout.flutterwave.com/x' } },
      });

      await service.createSubscriptionSession(
        mockUser,
        SubscriptionTier.PRO,
        BillingInterval.ANNUAL,
        'NGN',
      );

      expect(mockPrismaService.plan.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ interval: 'yearly' }),
        }),
      );
    });

    it('settles an unmapped currency in the DEFAULT USD bucket', async () => {
      mockPrismaService.plan.findFirst.mockResolvedValue({
        ...mockPlan,
        currency: 'DEFAULT',
        providerPlanId: 'plan_default',
      });
      const axiosMock = axios as unknown as Record<string, jest.Mock>;
      axiosMock.post = jest.fn().mockResolvedValue({
        data: { data: { link: 'https://checkout.flutterwave.com/x' } },
      });

      await service.createSubscriptionSession(
        mockUser,
        SubscriptionTier.PRO,
        undefined,
        'EUR',
      );

      expect(mockPrismaService.plan.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ currency: 'DEFAULT' }),
        }),
      );
      const callArgs = axiosMock.post.mock.calls[0];
      const payload = callArgs[1] as Record<string, unknown>;
      expect(payload.currency).toBe('USD');
    });

    it('does not look up a plan for a non-PRO tier and charges 0', async () => {
      const axiosMock = axios as unknown as Record<string, jest.Mock>;
      axiosMock.post = jest.fn().mockResolvedValue({
        data: { data: { link: 'https://checkout.flutterwave.com/x' } },
      });

      await service.createSubscriptionSession(
        mockUser,
        SubscriptionTier.FREE,
        undefined,
        'NGN',
      );

      expect(mockPrismaService.plan.findFirst).not.toHaveBeenCalled();
      const callArgs = axiosMock.post.mock.calls[0];
      const payload = callArgs[1] as Record<string, unknown>;
      expect(payload.amount).toBe('0');
      expect(payload.payment_plan).toBeUndefined();
    });
  });

  describe('cancelSubscription', () => {
    const axiosMock = axios as unknown as {
      get: jest.Mock;
      put: jest.Mock;
    };

    beforeEach(() => {
      axiosMock.get = jest.fn();
      axiosMock.put = jest.fn().mockResolvedValue({ data: {} });
    });

    it('uses the stored providerSubscriptionId directly, skipping the live lookup', async () => {
      await service.cancelSubscription('test@example.com', 'txn_123', '999');

      expect(axiosMock.get).not.toHaveBeenCalled();
      expect(axiosMock.put).toHaveBeenCalledWith(
        'https://api.flutterwave.com/v3/subscriptions/999/cancel',
        {},
        expect.anything(),
      );
      expect(subscriptionService.updateSubscriptionStatus).toHaveBeenCalledWith(
        {
          externalId: 'txn_123',
          status: 'active',
          cancelAtPeriodEnd: true,
          providerSubscriptionId: '999',
        },
      );
    });

    it('looks up the active Flutterwave subscription by email when no stored id exists, and persists the resolved id', async () => {
      axiosMock.get.mockResolvedValue({
        data: { data: [{ id: 999, status: 'active' }] },
      });

      await service.cancelSubscription('test@example.com', 'txn_123');

      expect(axiosMock.get).toHaveBeenCalledWith(
        'https://api.flutterwave.com/v3/subscriptions',
        expect.objectContaining({
          params: { email: 'test@example.com', status: 'active' },
        }),
      );
      expect(axiosMock.put).toHaveBeenCalledWith(
        'https://api.flutterwave.com/v3/subscriptions/999/cancel',
        {},
        expect.anything(),
      );
      expect(subscriptionService.updateSubscriptionStatus).toHaveBeenCalledWith(
        {
          externalId: 'txn_123',
          status: 'active',
          cancelAtPeriodEnd: true,
          providerSubscriptionId: '999',
        },
      );
    });

    it('falls back to a live lookup and retries once when the stored id is rejected (stale id)', async () => {
      axiosMock.put
        .mockRejectedValueOnce(new Error('400 Bad Request'))
        .mockResolvedValueOnce({ data: {} });
      axiosMock.get.mockResolvedValue({
        data: { data: [{ id: 777, status: 'active' }] },
      });

      await service.cancelSubscription(
        'test@example.com',
        'txn_123',
        'stale_id',
      );

      expect(axiosMock.put).toHaveBeenNthCalledWith(
        1,
        'https://api.flutterwave.com/v3/subscriptions/stale_id/cancel',
        {},
        expect.anything(),
      );
      expect(axiosMock.get).toHaveBeenCalledWith(
        'https://api.flutterwave.com/v3/subscriptions',
        expect.objectContaining({
          params: { email: 'test@example.com', status: 'active' },
        }),
      );
      expect(axiosMock.put).toHaveBeenNthCalledWith(
        2,
        'https://api.flutterwave.com/v3/subscriptions/777/cancel',
        {},
        expect.anything(),
      );
      expect(subscriptionService.updateSubscriptionStatus).toHaveBeenCalledWith(
        expect.objectContaining({ providerSubscriptionId: '777' }),
      );
    });

    it('picks the most recently created subscription when more than one is returned', async () => {
      axiosMock.get.mockResolvedValue({
        data: {
          data: [
            { id: 111, created_at: '2026-01-01T00:00:00.000Z' },
            { id: 222, created_at: '2026-06-01T00:00:00.000Z' },
            { id: 333, created_at: '2026-03-01T00:00:00.000Z' },
          ],
        },
      });

      await service.cancelSubscription('test@example.com', 'txn_123');

      expect(axiosMock.put).toHaveBeenCalledWith(
        'https://api.flutterwave.com/v3/subscriptions/222/cancel',
        {},
        expect.anything(),
      );
    });

    it('throws when no active Flutterwave subscription is found for the email', async () => {
      axiosMock.get.mockResolvedValue({ data: { data: [] } });

      await expect(
        service.cancelSubscription('test@example.com', 'txn_123'),
      ).rejects.toThrow(
        'No active Flutterwave subscription found for this user',
      );

      expect(axiosMock.put).not.toHaveBeenCalled();
      expect(
        subscriptionService.updateSubscriptionStatus,
      ).not.toHaveBeenCalled();
    });

    it('throws the generic error (not the "no subscription" message) when the lookup itself fails', async () => {
      axiosMock.get.mockRejectedValue(new Error('Network timeout'));

      await expect(
        service.cancelSubscription('test@example.com', 'txn_123'),
      ).rejects.toThrow('Could not cancel subscription with Flutterwave');

      expect(axiosMock.put).not.toHaveBeenCalled();
      expect(
        subscriptionService.updateSubscriptionStatus,
      ).not.toHaveBeenCalled();
    });
  });

  describe('reactivateSubscription', () => {
    const axiosMock = axios as unknown as {
      get: jest.Mock;
      put: jest.Mock;
    };

    beforeEach(() => {
      axiosMock.get = jest.fn();
      axiosMock.put = jest.fn().mockResolvedValue({ data: {} });
    });

    it('uses the stored providerSubscriptionId directly and asks for a period-end refresh', async () => {
      await service.reactivateSubscription(
        'test@example.com',
        'txn_123',
        '999',
      );

      expect(axiosMock.get).not.toHaveBeenCalled();
      expect(axiosMock.put).toHaveBeenCalledWith(
        'https://api.flutterwave.com/v3/subscriptions/999/activate',
        {},
        expect.anything(),
      );
      expect(subscriptionService.updateSubscriptionStatus).toHaveBeenCalledWith(
        {
          externalId: 'txn_123',
          status: 'active',
          cancelAtPeriodEnd: false,
          providerSubscriptionId: '999',
          refreshPeriodEnd: true,
        },
      );
    });

    it('looks up the cancelled Flutterwave subscription by email when no stored id exists', async () => {
      axiosMock.get.mockResolvedValue({
        data: { data: [{ id: 999, status: 'cancelled' }] },
      });

      await service.reactivateSubscription('test@example.com', 'txn_123');

      expect(axiosMock.get).toHaveBeenCalledWith(
        'https://api.flutterwave.com/v3/subscriptions',
        expect.objectContaining({
          params: { email: 'test@example.com', status: 'cancelled' },
        }),
      );
      expect(axiosMock.put).toHaveBeenCalledWith(
        'https://api.flutterwave.com/v3/subscriptions/999/activate',
        {},
        expect.anything(),
      );
      expect(subscriptionService.updateSubscriptionStatus).toHaveBeenCalledWith(
        {
          externalId: 'txn_123',
          status: 'active',
          cancelAtPeriodEnd: false,
          providerSubscriptionId: '999',
          refreshPeriodEnd: true,
        },
      );
    });

    it('falls back to a live lookup and retries once when the stored id is stale', async () => {
      axiosMock.put
        .mockRejectedValueOnce(new Error('400 Bad Request'))
        .mockResolvedValueOnce({ data: {} });
      axiosMock.get.mockResolvedValue({
        data: { data: [{ id: 555, status: 'cancelled' }] },
      });

      await service.reactivateSubscription(
        'test@example.com',
        'txn_123',
        'stale_id',
      );

      expect(axiosMock.put).toHaveBeenNthCalledWith(
        2,
        'https://api.flutterwave.com/v3/subscriptions/555/activate',
        {},
        expect.anything(),
      );
      expect(subscriptionService.updateSubscriptionStatus).toHaveBeenCalledWith(
        expect.objectContaining({ providerSubscriptionId: '555' }),
      );
    });

    it('throws when no cancelled Flutterwave subscription is found for the email', async () => {
      axiosMock.get.mockResolvedValue({ data: { data: [] } });

      await expect(
        service.reactivateSubscription('test@example.com', 'txn_123'),
      ).rejects.toThrow(
        'No cancelled Flutterwave subscription found for this user',
      );

      expect(axiosMock.put).not.toHaveBeenCalled();
      expect(
        subscriptionService.updateSubscriptionStatus,
      ).not.toHaveBeenCalled();
    });

    it('throws the generic error (not the "no subscription" message) when the lookup itself fails', async () => {
      axiosMock.get.mockRejectedValue(new Error('Network timeout'));

      await expect(
        service.reactivateSubscription('test@example.com', 'txn_123'),
      ).rejects.toThrow('Could not reactivate subscription with Flutterwave');

      expect(axiosMock.put).not.toHaveBeenCalled();
      expect(
        subscriptionService.updateSubscriptionStatus,
      ).not.toHaveBeenCalled();
    });
  });
});
