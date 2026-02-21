import { Test, TestingModule } from '@nestjs/testing';
import { LemonSqueezyService } from './lemonsqueezy.service';
import { ConfigService } from '@nestjs/config';
import { SubscriptionService } from '../subscription/subscription.service';
import { PrismaService } from '../../prisma/prisma.service';
import {
  SupportStatus,
  PaymentStatus,
  PaymentType,
} from '../../generated/prisma/enums';
import { Prisma } from '../../generated/prisma/client';
import * as crypto from 'node:crypto';

// Mock Lemon Squeezy library
jest.mock('@lemonsqueezy/lemonsqueezy.js', () => ({
  lemonSqueezySetup: jest.fn(),
  createCheckout: jest.fn(),
  cancelSubscription: jest.fn(),
}));

describe('LemonSqueezyService', () => {
  let service: LemonSqueezyService;
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
      if (key === 'payment.lemonsqueezy.webhookSecret') return 'secret';
      if (key === 'payment.lemonsqueezy.apiKey') return 'api_key';
      return null;
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LemonSqueezyService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: SubscriptionService, useValue: mockSubscriptionService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<LemonSqueezyService>(LemonSqueezyService);
    prismaService = module.get<PrismaService>(PrismaService);
    subscriptionService = module.get<SubscriptionService>(SubscriptionService);
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks(); // Restore crypto mocks
  });

  describe('handleWebhook', () => {
    const validSignature = 'valid_digest';

    beforeEach(() => {
      // Mock crypto.createHmac to return a predictable digest
      jest.spyOn(crypto, 'createHmac').mockImplementation(
        () =>
          ({
            update: jest.fn().mockReturnThis(),
            digest: jest.fn().mockReturnValue('valid_digest'),
          }) as unknown as crypto.Hmac,
      );

      // Mock timingSafeEqual to just return true if we want to bypass check,
      // or rely on real implementation if we match inputs.
      // Let's rely on real implementation but ensure inputs match.
      // Actually, let's mock it to be safe against environment differences.
      jest.spyOn(crypto, 'timingSafeEqual').mockReturnValue(true);
    });

    it('should create payment and subscription records on subscription_created', async () => {
      const payload = {
        meta: {
          event_name: 'subscription_created',
          custom_data: {
            userId: 'user_123',
            tier: 'PRO',
          },
        },
        data: {
          id: 'sub_123',
          attributes: {
            total: 5000,
            currency: 'USD',
          },
        },
      };

      const body = Buffer.from(JSON.stringify(payload));

      await service.handleWebhook(body, validSignature);

      expect(prismaService.$transaction).toHaveBeenCalled();
      expect(prismaService.payment.create).toHaveBeenCalledWith({
        data: {
          userId: 'user_123',
          amount: new Prisma.Decimal(50), // 5000 / 100
          currency: 'USD',
          status: PaymentStatus.SUCCESSFUL,
          provider: 'lemonsqueezy',
          externalId: 'sub_123',
          type: PaymentType.SUBSCRIPTION,
          metadata: payload,
        },
      });
      expect(
        subscriptionService.handleSubscriptionSuccess,
      ).toHaveBeenCalledWith(
        'user_123',
        'sub_123',
        'lemonsqueezy',
        'PRO',
        prismaService,
      );
    });

    it('should create payment and support records on order_created for support', async () => {
      const payload = {
        meta: {
          event_name: 'order_created',
          custom_data: {
            userId: 'user_123',
            type: 'support',
          },
        },
        data: {
          id: 'order_123',
          attributes: {
            total: 2000,
            currency: 'USD',
            user_email: 'support@example.com',
            user_name: 'Supporter Name',
          },
        },
      };

      const body = Buffer.from(JSON.stringify(payload));

      await service.handleWebhook(body, validSignature);

      expect(prismaService.$transaction).toHaveBeenCalled();
      expect(prismaService.payment.create).toHaveBeenCalledWith({
        data: {
          userId: 'user_123',
          amount: new Prisma.Decimal(20), // 2000 / 100
          currency: 'USD',
          status: PaymentStatus.SUCCESSFUL,
          provider: 'lemonsqueezy',
          externalId: 'order_123',
          type: PaymentType.SUPPORT,
          metadata: payload,
        },
      });
      expect(prismaService.support.create).toHaveBeenCalledWith({
        data: {
          amount: new Prisma.Decimal(20),
          currency: 'USD',
          status: SupportStatus.SUCCESSFUL,
          paymentProvider: 'lemonsqueezy',
          paymentRef: 'order_123',
          supporterId: 'user_123',
          supporterEmail: 'support@example.com',
          supporterName: 'Supporter Name',
        },
      });
      expect(prismaService.user.update).toHaveBeenCalledWith({
        where: { id: 'user_123' },
        data: { isSupporter: true },
      });
    });
  });
});
