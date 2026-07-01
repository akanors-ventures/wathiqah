import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException } from '@nestjs/common';
import { SubscriptionService } from './subscription.service';
import { PrismaService } from '../../prisma/prisma.service';
import { SubscriptionTier } from '../../generated/prisma/client';

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

  afterEach(() => jest.restoreAllMocks());

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
});
