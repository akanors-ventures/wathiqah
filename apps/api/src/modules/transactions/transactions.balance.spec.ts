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
    count: jest.fn(),
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
    (prisma.transaction.count as jest.Mock).mockResolvedValue(0);
    (prisma.project.findMany as jest.Mock).mockResolvedValue([]);
    (prisma.projectTransaction.groupBy as jest.Mock).mockResolvedValue([]);
    (prisma.projectTransaction.findMany as jest.Mock).mockResolvedValue([]);
  });

  describe('Balance Calculation (calculateConvertedSummary)', () => {
    const userId = 'user-1';

    it('should ignore legacy INCOME and EXPENSE in net balance', async () => {
      // Mock user preferred currency
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        preferredCurrency: 'NGN',
      });

      // Mock findAll transactions (items) - irrelevant for summary but required
      (prisma.transaction.findMany as jest.Mock).mockResolvedValue([]);

      // Legacy INCOME/EXPENSE rows — should be ignored in the new summary
      (prisma.transaction.groupBy as jest.Mock)
        .mockResolvedValueOnce([
          {
            type: TransactionType.INCOME,
            currency: 'NGN',
            _sum: { amount: 1000 },
          },
          {
            type: TransactionType.EXPENSE,
            currency: 'NGN',
            _sum: { amount: 500 },
          },
        ]) // ownAggregations
        .mockResolvedValueOnce([]); // contactAggregations

      const result = await service.findAll(userId);

      expect(result.summary.netBalance).toBe(0); // INCOME/EXPENSE excluded
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
            type: TransactionType.LOAN_GIVEN, // Contact GAVE me → I LOAN_RECEIVED
            currency: 'NGN',
            _sum: { amount: 200 },
          },
          {
            type: TransactionType.LOAN_RECEIVED, // Contact RECEIVED from me → I LOAN_GIVEN
            currency: 'NGN',
            _sum: { amount: 300 },
          },
        ]); // contactAggregations

      const result = await service.findAll(userId);

      // Flipped: LOAN_GIVEN -> LOAN_RECEIVED, LOAN_RECEIVED -> LOAN_GIVEN
      expect(result.summary.totalLoanReceived).toBe(200);
      expect(result.summary.totalLoanGiven).toBe(300);
      // Net Balance: LoanReceived - LoanGiven = 200 - 300 = -100
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
            type: TransactionType.LOAN_RECEIVED,
            currency: 'USD',
            _sum: { amount: 10 }, // 10 USD
          },
        ])
        .mockResolvedValueOnce([]);

      const result = await service.findAll(userId);

      expect(result.summary.totalLoanReceived).toBe(15000); // 10 * 1500
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

    it('should exclude project transactions from the summary (they have their own resolver)', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        preferredCurrency: 'NGN',
      });
      (prisma.transaction.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.transaction.groupBy as jest.Mock)
        .mockResolvedValueOnce([]) // ownAggregations
        .mockResolvedValueOnce([]); // contactAggregations

      const result = await service.findAll(userId);

      // Project transactions are not aggregated into the contact-obligation summary
      expect(result.summary.netBalance).toBe(0);
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
        user: {
          id: userId,
          firstName: 'Test',
          lastName: 'User',
          email: 'test@example.com',
        },
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

  describe('TransactionSummary — new formal types', () => {
    const userId = 'user-1';

    beforeEach(() => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        preferredCurrency: 'NGN',
      });
      (prisma.transaction.findMany as jest.Mock).mockResolvedValue([]);
    });

    it('accumulates LOAN_GIVEN; netBalance negative', async () => {
      (prisma.transaction.groupBy as jest.Mock)
        .mockResolvedValueOnce([
          {
            type: TransactionType.LOAN_GIVEN,
            currency: 'NGN',
            _sum: { amount: 1000 },
          },
        ])
        .mockResolvedValueOnce([]);

      const result = await service.findAll(userId);
      expect(result.summary.totalLoanGiven).toBe(1000);
      expect(result.summary.netBalance).toBe(-1000);
    });

    it('accumulates LOAN_RECEIVED; netBalance positive', async () => {
      (prisma.transaction.groupBy as jest.Mock)
        .mockResolvedValueOnce([
          {
            type: TransactionType.LOAN_RECEIVED,
            currency: 'NGN',
            _sum: { amount: 500 },
          },
        ])
        .mockResolvedValueOnce([]);

      const result = await service.findAll(userId);
      expect(result.summary.totalLoanReceived).toBe(500);
      expect(result.summary.netBalance).toBe(500);
    });

    it('flips LOAN_GIVEN → LOAN_RECEIVED for shared transactions', async () => {
      (prisma.transaction.groupBy as jest.Mock)
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([
          {
            type: TransactionType.LOAN_GIVEN,
            currency: 'NGN',
            _sum: { amount: 200 },
          },
        ]);

      const result = await service.findAll(userId);
      expect(result.summary.totalLoanReceived).toBe(200);
      expect(result.summary.netBalance).toBe(200);
    });

    it('accumulates REPAYMENT_MADE and REPAYMENT_RECEIVED with correct signs', async () => {
      (prisma.transaction.groupBy as jest.Mock)
        .mockResolvedValueOnce([
          {
            type: TransactionType.REPAYMENT_MADE,
            currency: 'NGN',
            _sum: { amount: 300 },
          },
          {
            type: TransactionType.REPAYMENT_RECEIVED,
            currency: 'NGN',
            _sum: { amount: 150 },
          },
        ])
        .mockResolvedValueOnce([]);

      const result = await service.findAll(userId);
      expect(result.summary.totalRepaymentMade).toBe(300);
      expect(result.summary.totalRepaymentReceived).toBe(150);
      expect(result.summary.netBalance).toBe(150 - 300); // -150
    });

    it('ESCROWED increases netBalance, REMITTED decreases it', async () => {
      (prisma.transaction.groupBy as jest.Mock)
        .mockResolvedValueOnce([
          {
            type: TransactionType.ESCROWED,
            currency: 'NGN',
            _sum: { amount: 800 },
          },
          {
            type: TransactionType.REMITTED,
            currency: 'NGN',
            _sum: { amount: 600 },
          },
        ])
        .mockResolvedValueOnce([]);

      const result = await service.findAll(userId);
      expect(result.summary.totalEscrowed).toBe(800);
      expect(result.summary.totalRemitted).toBe(600);
      expect(result.summary.netBalance).toBe(800 - 600); // 200
    });

    it('ignores legacy EXPENSE and INCOME rows in summary', async () => {
      (prisma.transaction.groupBy as jest.Mock)
        .mockResolvedValueOnce([
          {
            type: TransactionType.EXPENSE,
            currency: 'NGN',
            _sum: { amount: 500 },
          },
          {
            type: TransactionType.INCOME,
            currency: 'NGN',
            _sum: { amount: 1000 },
          },
        ])
        .mockResolvedValueOnce([]);

      const result = await service.findAll(userId);
      expect(result.summary.netBalance).toBe(0);
    });
  });
});
