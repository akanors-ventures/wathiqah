import { Test, TestingModule } from '@nestjs/testing';
import { FlutterwaveService } from './flutterwave.service';
import { ConfigService } from '@nestjs/config';
import { SubscriptionService } from '../subscription/subscription.service';
import { PrismaService } from '../../prisma/prisma.service';
import {
  SupportStatus,
  PaymentStatus,
  PaymentType,
} from '../../generated/prisma/enums';
import { Prisma } from '../../generated/prisma/client';

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
  });
});
