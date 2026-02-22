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
  WitnessStatus,
} from '../../generated/prisma/client';

const mockPrismaService = {
  transaction: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    groupBy: jest.fn(),
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
  convert: jest.fn((amount) => Promise.resolve(amount)), // Default 1:1
};

describe('TransactionsService - Balance & Audit', () => {
  let service: TransactionsService;
  let prisma: PrismaService;
  let exchangeRateService: ExchangeRateService;

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
    prisma = module.get<PrismaService>(PrismaService);
    exchangeRateService = module.get<ExchangeRateService>(ExchangeRateService);

    jest.clearAllMocks();
    (prisma.project.findMany as jest.Mock).mockResolvedValue([]);
    (prisma.projectTransaction.groupBy as jest.Mock).mockResolvedValue([]);
    (prisma.projectTransaction.findMany as jest.Mock).mockResolvedValue([]);
  });

  describe('Balance Calculation (calculateConvertedSummary)', () => {
    const userId = 'user-1';

    it('should correctly calculate net balance with Income and Expense', async () => {
      // Mock user preferred currency
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        preferredCurrency: 'NGN',
      });

      // Mock findAll transactions (items) - irrelevant for summary but required
      (prisma.transaction.findMany as jest.Mock).mockResolvedValue([]);

      // Mock Aggregations
      // Own transactions: 1000 Income, 500 Expense
      (prisma.transaction.groupBy as jest.Mock)
        .mockResolvedValueOnce([
          {
            type: TransactionType.INCOME,
            returnDirection: null,
            currency: 'NGN',
            _sum: { amount: 1000 },
          },
          {
            type: TransactionType.EXPENSE,
            returnDirection: null,
            currency: 'NGN',
            _sum: { amount: 500 },
          },
        ]) // ownAggregations
        .mockResolvedValueOnce([]); // contactAggregations

      const result = await service.findAll(userId);

      expect(result.summary.totalIncome).toBe(1000);
      expect(result.summary.totalExpense).toBe(500);
      expect(result.summary.netBalance).toBe(1000 - 500); // 500
    });

    it('should correctly handle shared transactions (flipping perspective)', async () => {
      // Mock user preferred currency
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        preferredCurrency: 'NGN',
      });
      (prisma.transaction.findMany as jest.Mock).mockResolvedValue([]);

      // Mock Aggregations
      (prisma.transaction.groupBy as jest.Mock)
        .mockResolvedValueOnce([]) // ownAggregations
        .mockResolvedValueOnce([
          {
            type: TransactionType.GIVEN, // Contact GAVE me (so I RECEIVED)
            returnDirection: null,
            currency: 'NGN',
            _sum: { amount: 200 },
          },
          {
            type: TransactionType.RECEIVED, // Contact RECEIVED from me (so I GAVE)
            returnDirection: null,
            currency: 'NGN',
            _sum: { amount: 300 },
          },
        ]); // contactAggregations

      const result = await service.findAll(userId);

      // Flipped: GIVEN -> RECEIVED, RECEIVED -> GIVEN
      expect(result.summary.totalReceived).toBe(200);
      expect(result.summary.totalGiven).toBe(300);
      // Net Balance: Received - Given = 200 - 300 = -100
      expect(result.summary.netBalance).toBe(-100);
    });

    it('should handle currency conversion', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        preferredCurrency: 'NGN',
      });
      (prisma.transaction.findMany as jest.Mock).mockResolvedValue([]);

      // Mock conversion: 1 USD = 1500 NGN
      (exchangeRateService.convert as jest.Mock).mockImplementation(
        (amount, from, to) => {
          if (from === 'USD' && to === 'NGN')
            return Promise.resolve(amount * 1500);
          return Promise.resolve(amount);
        },
      );

      (prisma.transaction.groupBy as jest.Mock)
        .mockResolvedValueOnce([
          {
            type: TransactionType.INCOME,
            returnDirection: null,
            currency: 'USD',
            _sum: { amount: 10 }, // 10 USD
          },
        ])
        .mockResolvedValueOnce([]);

      const result = await service.findAll(userId);

      expect(result.summary.totalIncome).toBe(15000); // 10 * 1500
      expect(result.summary.netBalance).toBe(15000);
    });
    it('should exclude CANCELLED transactions from balance calculation', async () => {
      // Mock user preferred currency
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        preferredCurrency: 'NGN',
      });
      (prisma.transaction.findMany as jest.Mock).mockResolvedValue([]);

      // Mock groupBy to verify the where clause
      const groupByMock = prisma.transaction.groupBy as jest.Mock;
      groupByMock
        .mockResolvedValueOnce([]) // ownAggregations
        .mockResolvedValueOnce([]); // contactAggregations

      await service.findAll(userId);

      // Verify that the first call (ownAggregations) includes status: { not: CANCELLED }
      const firstCallArgs = groupByMock.mock.calls[0][0];
      expect(firstCallArgs.where.status).toEqual({
        not: TransactionStatus.CANCELLED,
      });
    });

    it('should include backdated transactions in balance', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        preferredCurrency: 'NGN',
      });
      (prisma.transaction.findMany as jest.Mock).mockResolvedValue([]);

      const groupByMock = prisma.transaction.groupBy as jest.Mock;
      groupByMock.mockResolvedValue([]);

      // Call findAll without date filters
      await service.findAll(userId);

      // Verify that the where clause DOES NOT have date constraints
      const firstCallArgs = groupByMock.mock.calls[0][0];
      expect(firstCallArgs.where.date).toBeUndefined();
    });

    it('should include project transactions in balance calculation', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        preferredCurrency: 'NGN',
      });
      (prisma.transaction.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.transaction.groupBy as jest.Mock)
        .mockResolvedValueOnce([]) // ownAggregations
        .mockResolvedValueOnce([]); // contactAggregations

      // Mock Projects
      const projectA = { id: 'proj-A', currency: 'NGN', userId };
      const projectB = { id: 'proj-B', currency: 'USD', userId };
      (prisma.project.findMany as jest.Mock).mockResolvedValue([
        projectA,
        projectB,
      ]);

      // Mock Project Transactions
      (prisma.projectTransaction.groupBy as jest.Mock).mockResolvedValue([
        {
          projectId: 'proj-A',
          type: 'INCOME',
          _sum: { amount: 2000 },
        },
        {
          projectId: 'proj-A',
          type: 'EXPENSE',
          _sum: { amount: 1000 },
        },
        {
          projectId: 'proj-B', // USD Project
          type: 'INCOME',
          _sum: { amount: 10 }, // 10 USD
        },
      ]);

      // Mock conversion: 1 USD = 1500 NGN
      (exchangeRateService.convert as jest.Mock).mockImplementation(
        (amount, from, to) => {
          if (from === 'USD' && to === 'NGN')
            return Promise.resolve(amount * 1500);
          return Promise.resolve(amount);
        },
      );

      const result = await service.findAll(userId);

      // Project A: +2000 -1000 = +1000 NGN
      // Project B: +10 USD = +15000 NGN
      // Total Income: 2000 + 15000 = 17000
      // Total Expense: 1000
      // Net Balance: 17000 - 1000 = 16000

      expect(result.summary.totalIncome).toBe(17000);
      expect(result.summary.totalExpense).toBe(1000);
      expect(result.summary.netBalance).toBe(16000);
    });

    it('should include project transactions in items list', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        preferredCurrency: 'NGN',
      });
      (prisma.transaction.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.transaction.groupBy as jest.Mock)
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);

      const projectA = {
        id: 'proj-A',
        currency: 'NGN',
        userId,
        name: 'Project A',
      };
      (prisma.project.findMany as jest.Mock).mockResolvedValue([projectA]);

      // Mock Project Transactions
      const ptDate = new Date();
      (prisma.projectTransaction.findMany as jest.Mock).mockResolvedValue([
        {
          id: 'pt-1',
          amount: 2000,
          type: 'INCOME',
          date: ptDate,
          projectId: 'proj-A',
          project: projectA,
          description: 'Project Income',
          createdAt: ptDate,
        },
      ]);
      (prisma.projectTransaction.groupBy as jest.Mock).mockResolvedValue([]); // Simplified for this test

      const result = await service.findAll(userId);

      expect(result.items).toHaveLength(1);
      expect(result.items[0].id).toBe('pt-1');
      expect(result.items[0].amount).toBe(2000);
      expect(result.items[0].currency).toBe('NGN');
      expect(result.items[0].type).toBe('INCOME');
      expect(result.items[0].description).toContain('Project Income');
    });
  });

  describe('Audit Trail & Edge Cases', () => {
    const userId = 'user-1';
    const transactionId = 'tx-1';

    it('should create audit history on update', async () => {
      const existingTx = {
        id: transactionId,
        createdById: userId,
        amount: 100,
        category: AssetCategory.FUNDS,
        type: TransactionType.GIVEN,
        currency: 'NGN',
        date: new Date(),
        witnesses: [],
      };

      (prisma.transaction.findUnique as jest.Mock).mockResolvedValue(
        existingTx,
      );
      (prisma.transaction.update as jest.Mock).mockResolvedValue({
        ...existingTx,
        amount: 200,
      });

      await service.update(
        transactionId,
        { id: transactionId, amount: 200 },
        userId,
      );

      expect(prisma.transactionHistory.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          transactionId,
          changeType: 'UPDATE',
          previousState: expect.objectContaining({ amount: 100 }),
          newState: expect.objectContaining({ amount: 200 }),
        }),
      });
    });

    it('should create audit history and mark CANCELLED on remove with witnesses', async () => {
      const existingTx = {
        id: transactionId,
        createdById: userId,
        status: TransactionStatus.PENDING,
        witnesses: [{ id: 'w-1', status: WitnessStatus.PENDING }], // Has witness
      };

      (prisma.transaction.findUnique as jest.Mock).mockResolvedValue(
        existingTx,
      );
      (prisma.transaction.update as jest.Mock).mockResolvedValue({
        ...existingTx,
        status: TransactionStatus.CANCELLED,
      });

      await service.remove(transactionId, userId);

      expect(prisma.transaction.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: transactionId },
          data: { status: TransactionStatus.CANCELLED },
        }),
      );

      expect(prisma.transactionHistory.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          transactionId,
          changeType: 'CANCELLED',
        }),
      });
    });

    it('should hard delete if no witnesses', async () => {
      const existingTx = {
        id: transactionId,
        createdById: userId,
        witnesses: [], // No witnesses
      };

      (prisma.transaction.findUnique as jest.Mock).mockResolvedValue(
        existingTx,
      );

      await service.remove(transactionId, userId);

      expect(prisma.transaction.delete).toHaveBeenCalledWith({
        where: { id: transactionId },
      });
      expect(prisma.transactionHistory.create).not.toHaveBeenCalled();
    });
  });
});
