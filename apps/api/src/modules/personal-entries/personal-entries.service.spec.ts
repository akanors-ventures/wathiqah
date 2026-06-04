import { Test } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { PersonalEntriesService } from './personal-entries.service';
import { PrismaService } from '../../prisma/prisma.service';
import { PersonalEntryType } from '../../generated/prisma/enums';

describe('PersonalEntriesService', () => {
  let service: PersonalEntriesService;
  let prisma: {
    personalEntry: {
      create: jest.Mock;
      findMany: jest.Mock;
      count: jest.Mock;
      findUnique: jest.Mock;
      update: jest.Mock;
      delete: jest.Mock;
      groupBy: jest.Mock;
    };
  };

  beforeEach(async () => {
    prisma = {
      personalEntry: {
        create: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        groupBy: jest.fn(),
      },
    };
    const module = await Test.createTestingModule({
      providers: [
        PersonalEntriesService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();
    service = module.get(PersonalEntriesService);
  });

  it('create attaches createdById', async () => {
    prisma.personalEntry.create.mockResolvedValue({ id: 'e1' });
    await service.create('user-1', {
      type: PersonalEntryType.INCOME,
      amount: 500,
      currency: 'NGN',
      date: new Date('2026-05-01'),
    });
    expect(prisma.personalEntry.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ createdById: 'user-1', amount: 500 }),
    });
  });

  it('findAll returns paginated results scoped to the user', async () => {
    prisma.personalEntry.findMany.mockResolvedValue([{ id: 'e1' }]);
    prisma.personalEntry.count.mockResolvedValue(1);
    const result = await service.findAll('user-1', { page: 1, limit: 10 });
    expect(prisma.personalEntry.count).toHaveBeenCalledWith({
      where: { createdById: 'user-1' },
    });
    expect(result.total).toBe(1);
    expect(result.items).toHaveLength(1);
  });

  it('findOne throws when the entry belongs to another user', async () => {
    prisma.personalEntry.findUnique.mockResolvedValue({
      id: 'e1',
      createdById: 'someone-else',
    });
    await expect(service.findOne('e1', 'user-1')).rejects.toThrow(
      NotFoundException,
    );
  });

  it('getSummary computes netCashPosition = income - expenses', async () => {
    prisma.personalEntry.groupBy.mockResolvedValue([
      {
        type: PersonalEntryType.INCOME,
        _sum: { amount: { toNumber: () => 1000 } },
      },
      {
        type: PersonalEntryType.EXPENSE,
        _sum: { amount: { toNumber: () => 300 } },
      },
    ]);
    const summary = await service.getSummary('user-1');
    expect(summary.totalIncome).toBe(1000);
    expect(summary.totalExpenses).toBe(300);
    expect(summary.netCashPosition).toBe(700);
  });
});
