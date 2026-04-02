import { Test } from '@nestjs/testing';
import { ContactsService } from './contacts.service';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationService } from '../notifications/notification.service';
import { ContactBalanceStanding } from './dto/filter-contact.input';

describe('ContactsService — findAll pagination', () => {
  let service: ContactsService;
  let prisma: {
    contact: {
      findMany: jest.Mock;
      count: jest.Mock;
    };
  };

  beforeEach(async () => {
    prisma = {
      contact: {
        findMany: jest.fn(),
        count: jest.fn(),
      },
    };

    const module = await Test.createTestingModule({
      providers: [
        ContactsService,
        { provide: PrismaService, useValue: prisma },
        {
          provide: NotificationService,
          useValue: {},
        },
      ],
    }).compile();

    service = module.get(ContactsService);
  });

  it('returns paginated contacts with total', async () => {
    prisma.contact.findMany.mockResolvedValue([
      { id: '1', firstName: 'Ali', lastName: 'B', transactions: [] },
    ]);
    prisma.contact.count.mockResolvedValue(1);

    const result = await service.findAll('user-1', { page: 1, limit: 10 });

    expect(result.total).toBe(1);
    expect(result.page).toBe(1);
    expect(result.limit).toBe(10);
    expect(result.items).toHaveLength(1);
  });

  it('uses default page and limit when not provided', async () => {
    prisma.contact.findMany.mockResolvedValue([]);
    prisma.contact.count.mockResolvedValue(0);

    const result = await service.findAll('user-1', {});

    expect(result.page).toBe(1);
    expect(result.limit).toBe(25);
  });

  it('filters by OWED_TO_ME — returns only positive-balance contacts', async () => {
    const contacts = [
      {
        id: '1',
        firstName: 'Ali',
        transactions: [
          {
            type: 'GIVEN',
            amount: { toNumber: () => 100 },
            status: 'COMPLETED',
            returnDirection: null,
          },
        ],
      },
      {
        id: '2',
        firstName: 'Ben',
        transactions: [
          {
            type: 'RECEIVED',
            amount: { toNumber: () => 50 },
            status: 'COMPLETED',
            returnDirection: null,
          },
        ],
      },
    ];
    prisma.contact.findMany.mockResolvedValue(contacts);

    const result = await service.findAll('user-1', {
      balanceStanding: ContactBalanceStanding.OWED_TO_ME,
    });

    expect(result.items.map((c: { id: string }) => c.id)).toEqual(['1']);
  });

  it('filters by I_OWE — returns only negative-balance contacts', async () => {
    const contacts = [
      {
        id: '1',
        firstName: 'Ali',
        transactions: [
          {
            type: 'GIVEN',
            amount: { toNumber: () => 100 },
            status: 'COMPLETED',
            returnDirection: null,
          },
        ],
      },
      {
        id: '2',
        firstName: 'Ben',
        transactions: [
          {
            type: 'RECEIVED',
            amount: { toNumber: () => 50 },
            status: 'COMPLETED',
            returnDirection: null,
          },
        ],
      },
    ];
    prisma.contact.findMany.mockResolvedValue(contacts);

    const result = await service.findAll('user-1', {
      balanceStanding: ContactBalanceStanding.I_OWE,
    });

    expect(result.items.map((c: { id: string }) => c.id)).toEqual(['2']);
  });

  it('excludes CANCELLED transactions from balance computation', async () => {
    const contacts = [
      {
        id: '1',
        firstName: 'Ali',
        transactions: [
          {
            type: 'GIVEN',
            amount: { toNumber: () => 100 },
            status: 'CANCELLED',
            returnDirection: null,
          },
        ],
      },
    ];
    prisma.contact.findMany.mockResolvedValue(contacts);

    // Balance is 0 (GIVEN is cancelled), so OWED_TO_ME should exclude it
    const result = await service.findAll('user-1', {
      balanceStanding: ContactBalanceStanding.OWED_TO_ME,
    });

    expect(result.items).toHaveLength(0);
  });

  it('applies pagination to balance-filtered results', async () => {
    const contacts = Array.from({ length: 5 }, (_, i) => ({
      id: `${i + 1}`,
      firstName: `Contact${i + 1}`,
      transactions: [
        {
          type: 'GIVEN',
          amount: { toNumber: () => 100 },
          status: 'COMPLETED',
          returnDirection: null,
        },
      ],
    }));
    prisma.contact.findMany.mockResolvedValue(contacts);

    const result = await service.findAll('user-1', {
      balanceStanding: ContactBalanceStanding.OWED_TO_ME,
      page: 1,
      limit: 3,
    });

    expect(result.total).toBe(5);
    expect(result.items).toHaveLength(3);
    expect(result.page).toBe(1);
    expect(result.limit).toBe(3);
  });
});
