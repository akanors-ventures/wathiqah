import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException } from '@nestjs/common';
import { OrganisationsResolver } from './organisations.resolver';
import { OrganisationsService } from './organisations.service';
import { SubscriptionService } from '../subscription/subscription.service';
import { PrismaService } from '../../prisma/prisma.service';
import { User } from '../users/entities/user.entity';
import { SubscriptionTier } from '../../generated/prisma/client';

describe('OrganisationsResolver', () => {
  let resolver: OrganisationsResolver;

  const mockOrgsService = {
    create: jest.fn().mockResolvedValue({ id: 'org_1', slug: 'test-org' }),
  };

  const mockPrismaService = {};

  const mockSubscriptionService = {
    checkFeatureLimit: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrganisationsResolver,
        { provide: OrganisationsService, useValue: mockOrgsService },
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: SubscriptionService, useValue: mockSubscriptionService },
      ],
    }).compile();

    resolver = module.get<OrganisationsResolver>(OrganisationsResolver);
  });

  afterEach(() => {
    jest.restoreAllMocks();
    jest.clearAllMocks();
  });

  describe('createOrganisation', () => {
    const input = { name: 'Test Org', slug: 'test-org' } as Parameters<
      OrganisationsResolver['createOrganisation']
    >[0];

    const proUser = {
      id: 'user_pro',
      tier: SubscriptionTier.PRO,
    } as unknown as User;

    it('calls checkFeatureLimit with allowOrganisations', async () => {
      mockSubscriptionService.checkFeatureLimit.mockResolvedValue(true);
      await resolver.createOrganisation(input, proUser);
      expect(mockSubscriptionService.checkFeatureLimit).toHaveBeenCalledWith(
        proUser.id,
        'allowOrganisations',
      );
    });

    it('delegates to orgsService.create for PRO users', async () => {
      mockSubscriptionService.checkFeatureLimit.mockResolvedValue(true);
      const result = await resolver.createOrganisation(input, proUser);
      expect(mockOrgsService.create).toHaveBeenCalledWith(input, proUser.id);
      expect(result).toEqual({ id: 'org_1', slug: 'test-org' });
    });

    it('propagates ForbiddenException for FREE users', async () => {
      mockSubscriptionService.checkFeatureLimit.mockRejectedValue(
        new ForbiddenException(
          'The feature "allowOrganisations" is not available on your current plan.',
        ),
      );

      await expect(resolver.createOrganisation(input, proUser)).rejects.toThrow(
        ForbiddenException,
      );
      expect(mockOrgsService.create).not.toHaveBeenCalled();
    });
  });
});
