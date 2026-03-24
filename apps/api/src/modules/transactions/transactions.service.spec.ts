import { Test, TestingModule } from '@nestjs/testing';
import { TransactionsService } from './transactions.service';
import { PrismaService } from '../../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { NotificationService } from '../notifications/notification.service';
import { ExchangeRateService } from '../exchange-rate/exchange-rate.service';
import {
  TransactionType,
  AssetCategory,
  TransactionStatus,
} from '../../generated/prisma/client';

const mockPrismaService = {
  transaction: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    groupBy: jest.fn(),
    count: jest.fn(),
  },
  transactionHistory: {
    create: jest.fn(),
  },
  witness: {
    updateMany: jest.fn(),
  },
  user: {
    findUnique: jest.fn(),
  },
  contact: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
  },
  project: {
    findMany: jest.fn(),
  },
  projectTransaction: {
    groupBy: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
  },
  $transaction: jest.fn((arg) => {
    if (Array.isArray(arg)) {
      return Promise.all(arg);
    }
    return arg(mockPrismaService);
  }),
};

const mockConfigService = {
  getOrThrow: jest.fn(),
};

const mockCacheManager = {
  set: jest.fn(),
  get: jest.fn(),
};

const mockNotificationService = {
  sendTransactionWitnessInvite: jest.fn(),
  sendWitnessUpdateNotification: jest.fn(),
};

const mockExchangeRateService = {
  convert: jest.fn((amount) => Promise.resolve(amount)),
};

describe('TransactionsService - Pagination', () => {
  let service: TransactionsService;
  let prisma: {
    transaction: {
      findUnique: jest.Mock;
      findMany: jest.Mock;
      count: jest.Mock;
      groupBy: jest.Mock;
    };
    user: { findUnique: jest.Mock };
    contact: { findMany: jest.Mock; findUnique: jest.Mock };
    project: { findMany: jest.Mock };
    projectTransaction: {
      groupBy: jest.Mock;
      findMany: jest.Mock;
      count: jest.Mock;
    };
    $transaction: jest.Mock;
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TransactionsService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: ConfigService, useValue: mockConfigService },
        { provide: CACHE_MANAGER, useValue: mockCacheManager },
        { provide: NotificationService, useValue: mockNotificationService },
        { provide: ExchangeRateService, useValue: mockExchangeRateService },
      ],
    }).compile();

    service = module.get<TransactionsService>(TransactionsService);
    prisma = module.get<PrismaService>(
      PrismaService,
    ) as unknown as typeof prisma;

    jest.clearAllMocks();
    prisma.project.findMany.mockResolvedValue([]);
    prisma.projectTransaction.groupBy.mockResolvedValue([]);
    prisma.projectTransaction.findMany.mockResolvedValue([]);
  });

  const userId = 'user-pagination-1';

  const makeTransaction = (id: string) => ({
    id,
    amount: { toNumber: () => 100 },
    type: TransactionType.GIVEN,
    category: AssetCategory.FUNDS,
    status: TransactionStatus.COMPLETED,
    currency: 'NGN',
    date: new Date('2024-01-15'),
    description: 'test',
    createdAt: new Date(),
    createdById: userId,
    contactId: 'contact-1',
    contact: { id: 'contact-1', firstName: 'John', lastName: 'Doe', linkedUserId: null },
    createdBy: {
      id: userId,
      firstName: 'Alice',
      lastName: 'Smith',
      email: 'alice@test.com',
    },
    witnesses: [],
    returnDirection: null,
    itemName: null,
    quantity: null,
    parentId: null,
    parent: null,
    conversions: [],
  });

  describe('findAll with pagination', () => {
    it('should return { items, summary, total, page, limit }', async () => {
      const totalCount = 50;
      const mockItems = [makeTransaction('tx-1'), makeTransaction('tx-2')];

      prisma.user.findUnique.mockResolvedValue({ preferredCurrency: 'NGN' });
      prisma.transaction.count.mockResolvedValue(totalCount);
      prisma.transaction.findMany.mockResolvedValue(mockItems);
      prisma.transaction.groupBy.mockResolvedValue([]);

      // $transaction mock returns [count, findMany] for array calls
      prisma.$transaction.mockImplementation((arg: unknown) => {
        if (Array.isArray(arg)) {
          return Promise.resolve([totalCount, mockItems]);
        }
        return (arg as (p: unknown) => Promise<unknown>)(prisma);
      });

      const result = await service.findAll(userId, { page: 1, limit: 25 });

      expect(result).toHaveProperty('items');
      expect(result).toHaveProperty('summary');
      expect(result).toHaveProperty('total');
      expect(result).toHaveProperty('page');
      expect(result).toHaveProperty('limit');
      expect(result.total).toBe(totalCount);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(25);
    });

    it('should correctly compute skip for page 2', async () => {
      const totalCount = 50;
      const mockItems = [makeTransaction('tx-26')];

      prisma.user.findUnique.mockResolvedValue({ preferredCurrency: 'NGN' });
      prisma.transaction.count.mockResolvedValue(totalCount);
      prisma.transaction.findMany.mockResolvedValue(mockItems);
      prisma.transaction.groupBy.mockResolvedValue([]);

      let capturedFindManyArgs: Record<string, unknown> | undefined;
      prisma.$transaction.mockImplementation((arg: unknown) => {
        if (Array.isArray(arg)) {
          return Promise.resolve([totalCount, mockItems]);
        }
        return (arg as (p: unknown) => Promise<unknown>)(prisma);
      });

      // Capture findMany args by spying
      prisma.transaction.findMany.mockImplementation(
        (args: Record<string, unknown>) => {
          capturedFindManyArgs = args;
          return Promise.resolve(mockItems);
        },
      );

      await service.findAll(userId, { page: 2, limit: 10 });

      // skip should be (2-1)*10 = 10
      expect(capturedFindManyArgs?.skip).toBe(10);
      expect(capturedFindManyArgs?.take).toBe(10);
    });
  });

  describe('findMyContactTransactions with pagination', () => {
    it('should return { items, total, page, limit }', async () => {
      const totalCount = 30;
      const mockItems = [makeTransaction('tx-c1')];

      prisma.transaction.count.mockResolvedValue(totalCount);
      prisma.transaction.findMany.mockResolvedValue(mockItems);

      const result = await service.findMyContactTransactions(userId, {
        page: 1,
        limit: 20,
      });

      expect(result).toHaveProperty('items');
      expect(result).toHaveProperty('total');
      expect(result).toHaveProperty('page');
      expect(result).toHaveProperty('limit');
      expect(result.total).toBe(totalCount);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(20);
    });

    it('should apply skip for page 3 in findMyContactTransactions', async () => {
      const totalCount = 100;
      const mockItems = [makeTransaction('tx-c2')];

      let capturedFindManyArgs: Record<string, unknown> | undefined;
      prisma.transaction.findMany.mockImplementation(
        (args: Record<string, unknown>) => {
          capturedFindManyArgs = args;
          return Promise.resolve(mockItems);
        },
      );
      prisma.transaction.count.mockResolvedValue(totalCount);

      await service.findMyContactTransactions(userId, { page: 3, limit: 15 });

      // skip = (3-1)*15 = 30
      expect(capturedFindManyArgs?.skip).toBe(30);
      expect(capturedFindManyArgs?.take).toBe(15);
    });
  });
});
