import { Test } from '@nestjs/testing';
import { WitnessesService } from './witnesses.service';
import { PrismaService } from '../../prisma/prisma.service';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { NotificationService } from '../notifications/notification.service';
import { ConfigService } from '@nestjs/config';

describe('WitnessesService — findMyRequests pagination', () => {
  let service: WitnessesService;
  let prisma: {
    witness: { findMany: jest.Mock; count: jest.Mock };
  };

  beforeEach(async () => {
    prisma = {
      witness: { findMany: jest.fn(), count: jest.fn() },
    };

    const module = await Test.createTestingModule({
      providers: [
        WitnessesService,
        { provide: PrismaService, useValue: prisma },
        {
          provide: CACHE_MANAGER,
          useValue: { get: jest.fn(), set: jest.fn() },
        },
        {
          provide: NotificationService,
          useValue: { sendTransactionWitnessInvite: jest.fn() },
        },
        {
          provide: ConfigService,
          useValue: { getOrThrow: jest.fn() },
        },
      ],
    }).compile();

    service = module.get(WitnessesService);
  });

  it('returns paginated witnesses with total', async () => {
    prisma.witness.findMany.mockResolvedValue([{ id: 'w1' }]);
    prisma.witness.count.mockResolvedValue(1);

    const result = await service.findMyRequests('user-1', {
      page: 1,
      limit: 10,
    });

    expect(result.total).toBe(1);
    expect(result.items).toHaveLength(1);
    expect(result.page).toBe(1);
    expect(result.limit).toBe(10);
  });
});
