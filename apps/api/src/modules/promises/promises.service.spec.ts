import { Test } from '@nestjs/testing';
import { PromisesService } from './promises.service';
import { PrismaService } from '../../prisma/prisma.service';
import { ForbiddenException } from '@nestjs/common';

describe('PromisesService', () => {
  let service: PromisesService;
  let prisma: {
    promise: {
      findMany: jest.Mock;
      findUnique: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
      updateMany: jest.Mock;
      delete: jest.Mock;
    };
  };

  beforeEach(async () => {
    prisma = {
      promise: {
        findMany: jest.fn().mockResolvedValue([]),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn().mockResolvedValue({ count: 0 }),
        delete: jest.fn(),
      },
    };
    const module = await Test.createTestingModule({
      providers: [
        PromisesService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();
    service = module.get(PromisesService);
  });

  describe('org scoping', () => {
    it('scopes findAll to orgId when org context is active', async () => {
      await service.findAll('user1', 'org1');
      expect(prisma.promise.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ orgId: 'org1' }),
        }),
      );
    });

    it('scopes findAll to personal when orgId is null', async () => {
      await service.findAll('user1', null);
      expect(prisma.promise.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ userId: 'user1', orgId: null }),
        }),
      );
    });

    it('allows org member to access an org promise via findOne', async () => {
      prisma.promise.findUnique.mockResolvedValue({
        id: 'p1',
        userId: 'other-user',
        orgId: 'org1',
      });
      await expect(
        service.findOne('p1', 'user1', 'org1'),
      ).resolves.toBeDefined();
    });

    it('throws ForbiddenException when user is not owner or org member', async () => {
      prisma.promise.findUnique.mockResolvedValue({
        id: 'p1',
        userId: 'other-user',
        orgId: 'other-org',
      });
      await expect(service.findOne('p1', 'user1', 'org1')).rejects.toThrow(
        ForbiddenException,
      );
    });
  });
});
