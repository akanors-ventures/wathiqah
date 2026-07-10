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
} from '../../generated/prisma/enums';
import { Prisma } from '../../generated/prisma/client';
import { PRO_PRICING } from '../subscription/subscription.constants';
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
  };

  const mockSubscriptionService = {
    handleSubscriptionSuccess: jest.fn(),
    updateSubscriptionStatus: jest.fn(),
    deactivateSubscription: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn((key) => {
      if (key === 'payment.flutterwave.webhookHash') return 'secret_hash';
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
          externalId: 'sub_user_123_timestamp',
          type: PaymentType.SUBSCRIPTION,
          metadata: payload.data,
        },
      });
      expect(
        subscriptionService.handleSubscriptionSuccess,
      ).toHaveBeenCalledWith(
        'user_123',
        '12345', // Converted to string in logic? logic uses data.id.toString() or data.tx_ref
        'flutterwave',
        'PRO',
        prismaService,
        undefined, // no interval in meta
      );
    });

    it('passes the interval from meta through to handleSubscriptionSuccess', async () => {
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
      );
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
          externalId: 'support_user_123_timestamp',
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

    beforeEach(() => {
      // A monthly NGN plan is configured by default; annual/other buckets stay
      // null so the "not configured" guard tests can exercise the throw path.
      (mockConfigService.get as jest.Mock).mockImplementation(
        (key: string): unknown => {
          if (key === 'payment.flutterwave.webhookHash') return 'secret_hash';
          if (key === 'payment.successUrl')
            return 'http://localhost:3000/payment/success';
          if (key === 'payment.flutterwave.proPlanId')
            return { NGN: 'plan_monthly_ngn' };
          return null;
        },
      );
    });

    it('throws when monthly is requested but no monthly plan ID is configured for the currency', async () => {
      (mockConfigService.get as jest.Mock).mockImplementation(
        (key: string): unknown => {
          if (key === 'payment.flutterwave.webhookHash') return 'secret_hash';
          if (key === 'payment.successUrl')
            return 'http://localhost:3000/payment/success';
          return null;
        },
      );

      await expect(
        service.createSubscriptionSession(
          mockUser,
          SubscriptionTier.PRO,
          undefined,
          'NGN',
        ),
      ).rejects.toThrow('Monthly subscription plan is not configured');
    });

    it('uses PRO_PRICING.NGN.monthly (2500) as the NGN amount', async () => {
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
      expect(payload.amount).toBe(String(PRO_PRICING.NGN.monthly));
      expect(payload.amount).toBe('2500');
    });

    it('throws when annual is requested but no annual plan ID is configured', async () => {
      // beforeEach only configures a monthly NGN plan — annual stays unset
      await expect(
        service.createSubscriptionSession(
          mockUser,
          SubscriptionTier.PRO,
          BillingInterval.ANNUAL,
          'NGN',
        ),
      ).rejects.toThrow('Annual subscription plan is not configured');
    });

    it('charges PRO_PRICING.NGN.annual (25000) and uses the annual plan ID when configured', async () => {
      (mockConfigService.get as jest.Mock).mockImplementation(
        (key: string): unknown => {
          if (key === 'payment.flutterwave.webhookHash') return 'secret_hash';
          if (key === 'payment.successUrl')
            return 'http://localhost:3000/payment/success';
          if (key === 'payment.flutterwave.proPlanId')
            return { NGN: 'plan_monthly_ngn' };
          if (key === 'payment.flutterwave.proAnnualPlanId')
            return { NGN: 'plan_annual_ngn' };
          return null;
        },
      );

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
        BillingInterval.ANNUAL,
        'NGN',
      );

      const callArgs = axiosMock.post.mock.calls[0];
      const payload = callArgs[1] as Record<string, unknown>;
      expect(payload.amount).toBe(String(PRO_PRICING.NGN.annual));
      expect(payload.amount).toBe('25000');
      expect(payload.currency).toBe('NGN');
      expect(payload.payment_plan).toBe('plan_annual_ngn');
      expect((payload.meta as Record<string, unknown>).interval).toBe(
        BillingInterval.ANNUAL,
      );
    });

    it('charges PRO_PRICING.USD when currency is USD', async () => {
      (mockConfigService.get as jest.Mock).mockImplementation(
        (key: string): unknown => {
          if (key === 'payment.flutterwave.webhookHash') return 'secret_hash';
          if (key === 'payment.successUrl')
            return 'http://localhost:3000/payment/success';
          if (key === 'payment.flutterwave.proPlanId')
            return { USD: 'plan_monthly_usd' };
          if (key === 'payment.flutterwave.proAnnualPlanId') return {};
          return null;
        },
      );

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
        'USD',
      );

      const callArgs = axiosMock.post.mock.calls[0];
      const payload = callArgs[1] as Record<string, unknown>;
      expect(payload.amount).toBe(String(PRO_PRICING.USD.monthly));
      expect(payload.currency).toBe('USD');
      expect(payload.payment_plan).toBe('plan_monthly_usd');
    });

    it('falls back to the DEFAULT plan bucket, charged in USD, for an unmapped currency', async () => {
      (mockConfigService.get as jest.Mock).mockImplementation(
        (key: string): unknown => {
          if (key === 'payment.flutterwave.webhookHash') return 'secret_hash';
          if (key === 'payment.successUrl')
            return 'http://localhost:3000/payment/success';
          if (key === 'payment.flutterwave.proPlanId')
            return { DEFAULT: 'plan_monthly_default' };
          if (key === 'payment.flutterwave.proAnnualPlanId') return {};
          return null;
        },
      );

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
        'EUR',
      );

      const callArgs = axiosMock.post.mock.calls[0];
      const payload = callArgs[1] as Record<string, unknown>;
      expect(payload.amount).toBe(String(PRO_PRICING.USD.monthly));
      expect(payload.currency).toBe('USD');
      expect(payload.payment_plan).toBe('plan_monthly_default');
    });
  });
});
