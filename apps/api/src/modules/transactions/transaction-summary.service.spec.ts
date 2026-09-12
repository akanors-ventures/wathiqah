import { Test, TestingModule } from '@nestjs/testing';
import { TransactionSummaryService } from './transaction-summary.service';
import { PrismaService } from '../../prisma/prisma.service';
import { ExchangeRateService } from '../exchange-rate/exchange-rate.service';
import { TransactionType } from '../../generated/prisma/client';

const mockPrismaService = {
  transaction: {
    findMany: jest.fn(),
    groupBy: jest.fn(),
  },
  contact: {
    findMany: jest.fn(),
  },
  user: {
    findUnique: jest.fn(),
  },
};

const mockExchangeRateService = {
  convert: jest.fn((amount) => Promise.resolve(amount)), // Default 1:1
};

describe('TransactionSummaryService', () => {
  let service: TransactionSummaryService;
  let prisma: typeof mockPrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TransactionSummaryService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: ExchangeRateService, useValue: mockExchangeRateService },
      ],
    }).compile();

    service = module.get<TransactionSummaryService>(TransactionSummaryService);
    prisma = module.get(PrismaService);

    jest.clearAllMocks();
  });

  describe('calculateConvertedSummary', () => {
    const userId = 'user-1';
    const targetCurrency = 'NGN';
    const baseWhere = { createdById: userId, orgId: null };

    it("deducts a non-cancelled gift conversion from its parent loan's contribution to netBalance", async () => {
      prisma.transaction.groupBy
        .mockResolvedValueOnce([
          {
            type: TransactionType.LOAN_GIVEN,
            currency: 'NGN',
            _sum: { amount: 200 },
          },
        ]) // ownAggregations — raw, un-adjusted sum
        .mockResolvedValueOnce([]); // contactAggregations

      prisma.transaction.findMany
        .mockResolvedValueOnce([
          // A LOAN_GIVEN 200 with a non-cancelled GIFT_GIVEN 50 conversion
          // against it — groupBy above can't see this parent/child join.
          {
            type: TransactionType.LOAN_GIVEN,
            currency: 'NGN',
            amount: 200,
            conversions: [{ amount: 50 }],
            allocationsIn: [],
            allocationsOut: [],
          },
        ]) // ownLoans
        .mockResolvedValueOnce([]); // contactLoans

      const summary = await service.calculateConvertedSummary(
        userId,
        baseWhere,
        targetCurrency,
      );

      // Effective contribution (200 - 50 = 150), not the raw 200 groupBy
      // alone would produce — matches contacts.service.ts's
      // computeEffectiveObligationAmount.
      expect(summary.totalLoanGiven).toBe(150);
      expect(summary.netBalance).toBe(-150);
    });

    it('does not double-count a gift conversion when its own GIFT_GIVEN row is also present in the raw aggregation', async () => {
      // The gift-conversion child is a real Transaction row (type
      // GIFT_GIVEN, parentId set) with nothing excluding it from the
      // ownAggregations groupBy — a real DB call returns it as its own
      // bucket entry alongside the parent LOAN_GIVEN bucket.
      prisma.transaction.groupBy
        .mockResolvedValueOnce([
          {
            type: TransactionType.LOAN_GIVEN,
            currency: 'NGN',
            _sum: { amount: 200 },
          },
          {
            type: TransactionType.GIFT_GIVEN,
            currency: 'NGN',
            _sum: { amount: 50 },
          },
        ])
        .mockResolvedValueOnce([]);

      prisma.transaction.findMany
        .mockResolvedValueOnce([
          {
            type: TransactionType.LOAN_GIVEN,
            currency: 'NGN',
            amount: 200,
            conversions: [{ amount: 50 }],
            allocationsIn: [],
            allocationsOut: [],
          },
        ])
        .mockResolvedValueOnce([]);

      const summary = await service.calculateConvertedSummary(
        userId,
        baseWhere,
        targetCurrency,
      );

      // totalLoanGiven is gift-adjusted (150), and the conversion still
      // shows up as its own gift (50) — together they equal the original
      // loan (200), so netBalance reflects the total value transferred
      // exactly once, not twice (-250) and not zero-summed (-150).
      expect(summary.totalLoanGiven).toBe(150);
      expect(summary.totalGiftGiven).toBe(50);
      expect(summary.netBalance).toBe(-200);
    });

    it("deducts an ACTIVE allocation from its target loan's contribution to netBalance", async () => {
      // A LOAN_RECEIVED 100 discharged by a 40 allocation drawn onto it
      // (allocationsIn) — no gift conversion involved at all.
      prisma.transaction.groupBy
        .mockResolvedValueOnce([
          {
            type: TransactionType.LOAN_RECEIVED,
            currency: 'NGN',
            _sum: { amount: 100 },
          },
        ]) // ownAggregations — raw, un-adjusted sum
        .mockResolvedValueOnce([]); // contactAggregations

      prisma.transaction.findMany
        .mockResolvedValueOnce([
          {
            type: TransactionType.LOAN_RECEIVED,
            currency: 'NGN',
            amount: 100,
            conversions: [],
            allocationsIn: [{ amount: 40 }],
            allocationsOut: [],
          },
        ]) // ownLoans
        .mockResolvedValueOnce([]); // contactLoans

      const summary = await service.calculateConvertedSummary(
        userId,
        baseWhere,
        targetCurrency,
      );

      // Effective contribution (100 - 40 = 60), matching
      // computeEffectiveObligationAmount's allocation handling in
      // contacts.service.ts — an allocation discharges an obligation
      // without a signed row of its own, unlike a gift conversion, so
      // there is no separate bucket to double-count against here.
      expect(summary.totalLoanReceived).toBe(60);
      expect(summary.netBalance).toBe(60);
    });
  });

  describe('groupByContact', () => {
    const userId = 'user-1';

    beforeEach(() => {
      prisma.user.findUnique.mockResolvedValue({ preferredCurrency: 'NGN' });
    });

    it("deducts a non-cancelled gift conversion from its parent loan's contribution to that contact's netBalance", async () => {
      prisma.transaction.groupBy
        .mockResolvedValueOnce([
          {
            contactId: 'contact-1',
            type: TransactionType.LOAN_GIVEN,
            currency: 'NGN',
            _sum: { amount: 200 },
          },
        ]) // ownAggregations — raw, un-adjusted sum
        .mockResolvedValueOnce([]); // sharedAggregations

      prisma.transaction.findMany
        .mockResolvedValueOnce([
          {
            contactId: 'contact-1',
            type: TransactionType.LOAN_GIVEN,
            currency: 'NGN',
            amount: 200,
            conversions: [{ amount: 50 }],
            allocationsIn: [],
            allocationsOut: [],
          },
        ]) // ownLoans
        .mockResolvedValueOnce([]); // sharedLoans

      prisma.contact.findMany.mockResolvedValue([
        {
          id: 'contact-1',
          linkedUserId: null,
          firstName: 'Test',
          lastName: 'Contact',
        },
      ]);

      const result = await service.groupByContact(userId);

      expect(result).toHaveLength(1);
      const contactSummary = result[0].summary;
      expect(contactSummary.totalLoanGiven).toBe(150);
      expect(contactSummary.netBalance).toBe(-150);
    });

    it('does not let a gift conversion on one contact leak into another contact sharing the same (type, currency) bucket', async () => {
      prisma.transaction.groupBy
        .mockResolvedValueOnce([
          {
            contactId: 'contact-1',
            type: TransactionType.LOAN_GIVEN,
            currency: 'NGN',
            _sum: { amount: 200 },
          },
          {
            contactId: 'contact-2',
            type: TransactionType.LOAN_GIVEN,
            currency: 'NGN',
            _sum: { amount: 100 },
          },
        ]) // ownAggregations
        .mockResolvedValueOnce([]); // sharedAggregations

      prisma.transaction.findMany
        .mockResolvedValueOnce([
          // Only contact-1's loan has a gift conversion against it.
          {
            contactId: 'contact-1',
            type: TransactionType.LOAN_GIVEN,
            currency: 'NGN',
            amount: 200,
            conversions: [{ amount: 50 }],
            allocationsIn: [],
            allocationsOut: [],
          },
          {
            contactId: 'contact-2',
            type: TransactionType.LOAN_GIVEN,
            currency: 'NGN',
            amount: 100,
            conversions: [],
            allocationsIn: [],
            allocationsOut: [],
          },
        ]) // ownLoans
        .mockResolvedValueOnce([]); // sharedLoans

      prisma.contact.findMany.mockResolvedValue([
        { id: 'contact-1', linkedUserId: null },
        { id: 'contact-2', linkedUserId: null },
      ]);

      const result = await service.groupByContact(userId);

      const byContactId = new Map(
        result.map((r) => [r.contact?.id, r.summary]),
      );
      expect(byContactId.get('contact-1')?.totalLoanGiven).toBe(150);
      expect(byContactId.get('contact-2')?.totalLoanGiven).toBe(100);
    });

    it("deducts an ACTIVE allocation from its target loan's contribution to that contact's netBalance", async () => {
      prisma.transaction.groupBy
        .mockResolvedValueOnce([
          {
            contactId: 'contact-1',
            type: TransactionType.LOAN_RECEIVED,
            currency: 'NGN',
            _sum: { amount: 100 },
          },
        ]) // ownAggregations
        .mockResolvedValueOnce([]); // sharedAggregations

      prisma.transaction.findMany
        .mockResolvedValueOnce([
          {
            contactId: 'contact-1',
            type: TransactionType.LOAN_RECEIVED,
            currency: 'NGN',
            amount: 100,
            conversions: [],
            allocationsIn: [{ amount: 40 }],
            allocationsOut: [],
          },
        ]) // ownLoans
        .mockResolvedValueOnce([]); // sharedLoans

      prisma.contact.findMany.mockResolvedValue([
        { id: 'contact-1', linkedUserId: null },
      ]);

      const result = await service.groupByContact(userId);

      expect(result).toHaveLength(1);
      expect(result[0].summary.totalLoanReceived).toBe(60);
      expect(result[0].summary.netBalance).toBe(60);
    });
  });
});
