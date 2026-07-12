import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { PaymentService } from './payment.service';
import { PrismaService } from '../../prisma/prisma.service';
import { StripeService } from './stripe.service';
import { FlutterwaveService } from './flutterwave.service';
import { LemonSqueezyService } from './lemonsqueezy.service';
import { SubscriptionTier } from '../../generated/prisma/enums';
import { BillingInterval } from './dto/billing-interval.enum';

describe('PaymentService', () => {
  let service: PaymentService;
  let flutterwaveService: FlutterwaveService;
  let stripeService: StripeService;
  let lemonsqueezyService: LemonSqueezyService;

  const mockUser = {
    id: 'user_123',
    email: 'test@example.com',
    preferredCurrency: null,
  };

  const mockPrismaService = {
    user: { findUnique: jest.fn() },
    subscription: { findUnique: jest.fn(), update: jest.fn() },
    webhookLog: { create: jest.fn() },
  };

  const mockStripeService = {
    createSubscriptionSession: jest.fn(),
    createSupportSession: jest.fn(),
    handleWebhook: jest.fn(),
    cancelSubscription: jest.fn(),
    reactivateSubscription: jest.fn(),
  };

  const mockFlutterwaveService = {
    createSubscriptionSession: jest.fn(),
    createSupportSession: jest.fn(),
    handleWebhook: jest.fn(),
    cancelSubscription: jest.fn(),
    reactivateSubscription: jest.fn(),
  };

  const mockLemonsqueezyService = {
    createSubscriptionSession: jest.fn(),
    createSupportSession: jest.fn(),
    handleWebhook: jest.fn(),
    cancelSubscription: jest.fn(),
    reactivateSubscription: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: StripeService, useValue: mockStripeService },
        { provide: FlutterwaveService, useValue: mockFlutterwaveService },
        { provide: LemonSqueezyService, useValue: mockLemonsqueezyService },
      ],
    }).compile();

    service = module.get<PaymentService>(PaymentService);
    flutterwaveService = module.get<FlutterwaveService>(FlutterwaveService);
    stripeService = module.get<StripeService>(StripeService);
    lemonsqueezyService = module.get<LemonSqueezyService>(LemonSqueezyService);

    mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  describe('createSubscriptionSession', () => {
    it('always routes to Flutterwave, regardless of currency', async () => {
      mockFlutterwaveService.createSubscriptionSession.mockResolvedValue({
        url: 'https://flutterwave.com/checkout',
      });

      await service.createSubscriptionSession(
        'user_123',
        SubscriptionTier.PRO,
        'USD',
        undefined,
        BillingInterval.ANNUAL,
      );

      expect(flutterwaveService.createSubscriptionSession).toHaveBeenCalledWith(
        mockUser,
        SubscriptionTier.PRO,
        BillingInterval.ANNUAL,
        'USD',
      );
      expect(stripeService.createSubscriptionSession).not.toHaveBeenCalled();
      expect(
        lemonsqueezyService.createSubscriptionSession,
      ).not.toHaveBeenCalled();
    });

    it('resolves effective currency: explicit arg > preferredCurrency > geoip > USD', async () => {
      const userWithPreferredCurrency = {
        ...mockUser,
        preferredCurrency: 'GBP',
      };
      mockPrismaService.user.findUnique.mockResolvedValue(
        userWithPreferredCurrency,
      );
      mockFlutterwaveService.createSubscriptionSession.mockResolvedValue({
        url: 'https://flutterwave.com/checkout',
      });

      await service.createSubscriptionSession(
        'user_123',
        SubscriptionTier.PRO,
        undefined,
        { currencyCode: 'NGN' } as never,
        BillingInterval.MONTHLY,
      );

      // preferredCurrency wins over geoip when no explicit currency is passed
      expect(flutterwaveService.createSubscriptionSession).toHaveBeenCalledWith(
        userWithPreferredCurrency,
        SubscriptionTier.PRO,
        BillingInterval.MONTHLY,
        'GBP',
      );
    });

    it('falls back to USD when no currency signal is available', async () => {
      mockFlutterwaveService.createSubscriptionSession.mockResolvedValue({
        url: 'https://flutterwave.com/checkout',
      });

      await service.createSubscriptionSession('user_123', SubscriptionTier.PRO);

      expect(flutterwaveService.createSubscriptionSession).toHaveBeenCalledWith(
        mockUser,
        SubscriptionTier.PRO,
        undefined,
        'USD',
      );
    });

    it('throws NotFoundException when the user does not exist', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(
        service.createSubscriptionSession('missing_user', SubscriptionTier.PRO),
      ).rejects.toThrow(NotFoundException);
      expect(
        flutterwaveService.createSubscriptionSession,
      ).not.toHaveBeenCalled();
    });
  });

  describe('createSupportSession', () => {
    it('always routes to Flutterwave with the effective currency', async () => {
      mockFlutterwaveService.createSupportSession.mockResolvedValue({
        url: 'https://flutterwave.com/checkout',
      });

      await service.createSupportSession('user_123', 25, 'GBP');

      expect(flutterwaveService.createSupportSession).toHaveBeenCalledWith(
        mockUser,
        25,
        'GBP',
      );
      expect(stripeService.createSupportSession).not.toHaveBeenCalled();
      expect(lemonsqueezyService.createSupportSession).not.toHaveBeenCalled();
    });

    it('falls back to USD when no currency signal is available', async () => {
      mockFlutterwaveService.createSupportSession.mockResolvedValue({
        url: 'https://flutterwave.com/checkout',
      });

      await service.createSupportSession('user_123', 10);

      expect(flutterwaveService.createSupportSession).toHaveBeenCalledWith(
        mockUser,
        10,
        'USD',
      );
    });
  });

  describe('cancelSubscription / reactivateSubscription', () => {
    it('still dispatches to the original provider for legacy subscriptions', async () => {
      mockPrismaService.subscription.findUnique.mockResolvedValue({
        userId: 'user_123',
        provider: 'stripe',
        externalId: 'sub_stripe_123',
        providerSubscriptionId: null,
        user: { email: 'test@example.com' },
      });

      await service.cancelSubscription('user_123');

      expect(stripeService.cancelSubscription).toHaveBeenCalledWith(
        'sub_stripe_123',
      );
      expect(flutterwaveService.cancelSubscription).not.toHaveBeenCalled();
    });

    it('cancels a Flutterwave subscription using the user email, externalId, and stored providerSubscriptionId', async () => {
      mockPrismaService.subscription.findUnique.mockResolvedValue({
        userId: 'user_123',
        provider: 'flutterwave',
        externalId: 'txn_123',
        providerSubscriptionId: '999',
        user: { email: 'test@example.com' },
      });

      await service.cancelSubscription('user_123');

      expect(mockPrismaService.subscription.findUnique).toHaveBeenCalledWith({
        where: { userId: 'user_123' },
        select: {
          provider: true,
          externalId: true,
          providerSubscriptionId: true,
          user: { select: { email: true } },
        },
      });
      expect(flutterwaveService.cancelSubscription).toHaveBeenCalledWith(
        'test@example.com',
        'txn_123',
        '999',
      );
    });

    it('reactivates a Flutterwave subscription and does not separately update the local record', async () => {
      mockPrismaService.subscription.findUnique.mockResolvedValue({
        userId: 'user_123',
        provider: 'flutterwave',
        externalId: 'txn_123',
        providerSubscriptionId: '999',
        user: { email: 'test@example.com' },
      });

      await service.reactivateSubscription('user_123');

      expect(flutterwaveService.reactivateSubscription).toHaveBeenCalledWith(
        'test@example.com',
        'txn_123',
        '999',
      );
      expect(mockPrismaService.subscription.update).not.toHaveBeenCalled();
    });
  });
});
