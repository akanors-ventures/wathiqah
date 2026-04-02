import { Test, TestingModule } from '@nestjs/testing';
import { StripeService } from './stripe.service';
import { ConfigService } from '@nestjs/config';
import { SubscriptionService } from '../subscription/subscription.service';
import { PrismaService } from '../../prisma/prisma.service';
import {
  SupportStatus,
  PaymentStatus,
  PaymentType,
} from '../../generated/prisma/enums';
import { Prisma } from '../../generated/prisma/client';

// Mock Stripe library
jest.mock('stripe', () => {
  return {
    __esModule: true,
    default: jest.fn().mockImplementation(() => ({
      webhooks: {
        constructEvent: jest.fn(),
      },
      checkout: {
        sessions: {
          create: jest.fn(),
        },
      },
      subscriptions: {
        update: jest.fn(),
      },
    })),
  };
});

describe('StripeService', () => {
  let service: StripeService;
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
      if (key === 'payment.stripe.secretKey') return 'sk_test_123';
      if (key === 'payment.stripe.webhookSecret') return 'whsec_123';
      return null;
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StripeService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: SubscriptionService, useValue: mockSubscriptionService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<StripeService>(StripeService);
    prismaService = module.get<PrismaService>(PrismaService);
    subscriptionService = module.get<SubscriptionService>(SubscriptionService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('reactivateSubscription', () => {
    it('should call subscriptions.update with cancel_at_period_end: false', async () => {
      const mockStripe = service['stripe'] as unknown as {
        subscriptions: { update: jest.Mock };
      };
      mockStripe.subscriptions.update.mockResolvedValue({});

      await service.reactivateSubscription('sub_test123');

      expect(mockStripe.subscriptions.update).toHaveBeenCalledWith(
        'sub_test123',
        {
          cancel_at_period_end: false,
        },
      );
    });

    it('should throw a user-friendly error when Stripe throws', async () => {
      const mockStripe = service['stripe'] as unknown as {
        subscriptions: { update: jest.Mock };
      };
      mockStripe.subscriptions.update.mockRejectedValue(
        new Error('Stripe error'),
      );

      await expect(
        service.reactivateSubscription('sub_test123'),
      ).rejects.toThrow('Could not reactivate subscription with Stripe');
    });
  });

  describe('handleWebhook', () => {
    it('should create payment and subscription records on checkout.session.completed for subscription', async () => {
      const event = {
        type: 'checkout.session.completed',
        data: {
          object: {
            id: 'cs_test_123',
            client_reference_id: 'user_123',
            mode: 'subscription',
            subscription: 'sub_123',
            amount_total: 1000,
            currency: 'usd',
            metadata: {
              tier: 'PRO',
            },
            payment_intent: 'pi_123',
          },
        },
      };

      (service['stripe'].webhooks.constructEvent as jest.Mock).mockReturnValue(
        event,
      );

      await service.handleWebhook(Buffer.from('payload'), 'signature');

      expect(prismaService.$transaction).toHaveBeenCalled();
      expect(prismaService.payment.create).toHaveBeenCalledWith({
        data: {
          userId: 'user_123',
          amount: new Prisma.Decimal(10), // 1000 / 100
          currency: 'USD',
          status: PaymentStatus.SUCCESSFUL,
          provider: 'stripe',
          externalId: 'pi_123',
          type: PaymentType.SUBSCRIPTION,
          metadata: event.data.object.metadata,
        },
      });
      expect(
        subscriptionService.handleSubscriptionSuccess,
      ).toHaveBeenCalledWith(
        'user_123',
        'sub_123',
        'stripe',
        'PRO',
        prismaService, // Verify transaction client is passed
      );
    });

    it('should create payment and support records on checkout.session.completed for support', async () => {
      const event = {
        type: 'checkout.session.completed',
        data: {
          object: {
            id: 'cs_test_support',
            client_reference_id: 'user_123',
            mode: 'payment',
            amount_total: 5000,
            currency: 'usd',
            metadata: {
              type: 'support',
            },
            payment_intent: 'pi_support_123',
            customer_details: {
              email: 'test@example.com',
              name: 'Test User',
            },
          },
        },
      };

      (service['stripe'].webhooks.constructEvent as jest.Mock).mockReturnValue(
        event,
      );

      await service.handleWebhook(Buffer.from('payload'), 'signature');

      expect(prismaService.$transaction).toHaveBeenCalled();
      expect(prismaService.payment.create).toHaveBeenCalledWith({
        data: {
          userId: 'user_123',
          amount: new Prisma.Decimal(50), // 5000 / 100
          currency: 'USD',
          status: PaymentStatus.SUCCESSFUL,
          provider: 'stripe',
          externalId: 'pi_support_123',
          type: PaymentType.SUPPORT,
          metadata: event.data.object.metadata,
        },
      });
      expect(prismaService.support.create).toHaveBeenCalledWith({
        data: {
          amount: new Prisma.Decimal(50),
          currency: 'USD',
          status: SupportStatus.SUCCESSFUL,
          paymentProvider: 'stripe',
          paymentRef: 'pi_support_123',
          supporterId: 'user_123',
          supporterEmail: 'test@example.com',
          supporterName: 'Test User',
        },
      });
      expect(prismaService.user.update).toHaveBeenCalledWith({
        where: { id: 'user_123' },
        data: { isSupporter: true },
      });
    });
  });
});
