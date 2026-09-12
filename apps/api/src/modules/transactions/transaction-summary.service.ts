import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ExchangeRateService } from '../exchange-rate/exchange-rate.service';
import {
  TransactionStatus,
  TransactionType,
  Prisma,
} from '../../generated/prisma/client';
import { FilterTransactionInput } from './dto/filter-transaction.input';
import { computeEffectiveObligationAmount } from './settlement.util';
import {
  PERSPECTIVE_FLIP_MAP,
  TransactionSummary,
  computeNetBalance,
} from './summary.util';

/**
 * Balance/summary aggregation, split out of TransactionsService (see
 * .claude/plans/crispy-brewing-swan.md, Phase 2). Depends only on Prisma and
 * ExchangeRateService — it never needed the rest of TransactionsService's
 * witness/mirror/CRUD machinery.
 */
@Injectable()
export class TransactionSummaryService {
  /** Only LOAN_GIVEN/LOAN_RECEIVED can carry gift conversions or allocations. */
  private static readonly LOAN_TYPES_FILTER: Prisma.TransactionWhereInput = {
    type: { in: [TransactionType.LOAN_GIVEN, TransactionType.LOAN_RECEIVED] },
  };

  /**
   * Nested-relation select for a loan's non-cancelled gift-conversion
   * children — shared by calculateConvertedSummary and groupByContact so the
   * two stay in lockstep (mirrors `conversionsSelect` in contacts.service.ts).
   */
  private static readonly GIFT_CONVERSIONS_SELECT = {
    where: {
      type: {
        in: [TransactionType.GIFT_GIVEN, TransactionType.GIFT_RECEIVED],
      } as Prisma.EnumTransactionTypeFilter,
      status: {
        not: TransactionStatus.CANCELLED,
      } as Prisma.EnumTransactionStatusFilter,
    },
    select: { amount: true },
  };

  /**
   * Nested-relation select for a loan's ACTIVE allocations on either leg —
   * mirrors `allocationsSelect` in contacts.service.ts. An allocation
   * discharges an obligation without a signed row of its own, so it must be
   * subtracted from the effective principal the same way a gift conversion is.
   */
  private static readonly ALLOCATIONS_SELECT = {
    where: { status: 'ACTIVE' } as Prisma.TransactionAllocationWhereInput,
    select: { amount: true },
  };

  constructor(
    private readonly prisma: PrismaService,
    private readonly exchangeRateService: ExchangeRateService,
  ) {}

  async calculateConvertedSummary(
    userId: string,
    where: Prisma.TransactionWhereInput,
    targetCurrency: string,
  ) {
    // groupBy sums the raw loan amount, but a non-cancelled gift conversion
    // or ACTIVE allocation extinguishes part of its parent loan (see
    // `computeEffectiveObligationAmount` in settlement.util.ts). Fetch
    // loans-with-conversions-and-allocations separately — groupBy can't
    // express the parent/child join — and net the discharged portion out of
    // the matching (type, currency) bucket below. All four queries are
    // independent of each other, so run them concurrently instead of
    // round-tripping to the DB one at a time.
    const [ownAggregations, contactAggregations, ownLoans, contactLoans] =
      await Promise.all([
        // 1. Aggregations for transactions created by the user
        this.prisma.transaction.groupBy({
          by: ['type', 'currency'],
          where: { ...where, createdById: userId },
          _sum: {
            amount: true,
          },
        }),
        // 2. Aggregations for transactions where user is the contact (flip required)
        this.prisma.transaction.groupBy({
          by: ['type', 'currency'],
          where: {
            ...where,
            createdById: { not: userId },
            contact: { linkedUserId: userId },
          },
          _sum: {
            amount: true,
          },
        }),
        this.prisma.transaction.findMany({
          where: {
            ...where,
            createdById: userId,
            ...TransactionSummaryService.LOAN_TYPES_FILTER,
          },
          select: {
            type: true,
            currency: true,
            amount: true,
            conversions: TransactionSummaryService.GIFT_CONVERSIONS_SELECT,
            allocationsIn: TransactionSummaryService.ALLOCATIONS_SELECT,
            allocationsOut: TransactionSummaryService.ALLOCATIONS_SELECT,
          },
        }),
        this.prisma.transaction.findMany({
          where: {
            ...where,
            createdById: { not: userId },
            contact: { linkedUserId: userId },
            ...TransactionSummaryService.LOAN_TYPES_FILTER,
          },
          select: {
            type: true,
            currency: true,
            amount: true,
            conversions: TransactionSummaryService.GIFT_CONVERSIONS_SELECT,
            allocationsIn: TransactionSummaryService.ALLOCATIONS_SELECT,
            allocationsOut: TransactionSummaryService.ALLOCATIONS_SELECT,
          },
        }),
      ]);

    const ownDeductions = this.sumObligationDeductions(ownLoans);
    const contactDeductions = this.sumObligationDeductions(contactLoans);

    const summary: TransactionSummary = {
      totalLoanGiven: 0,
      totalLoanReceived: 0,
      totalRepaymentMade: 0,
      totalRepaymentReceived: 0,
      totalGiftGiven: 0,
      totalGiftReceived: 0,
      totalAdvancePaid: 0,
      totalAdvanceReceived: 0,
      totalDepositPaid: 0,
      totalDepositReceived: 0,
      totalEscrowed: 0,
      totalRemitted: 0,
      netBalance: 0,
      currency: targetCurrency,
    };

    // Process own transactions
    for (const agg of ownAggregations) {
      const amount =
        (Number(agg._sum.amount) || 0) -
        (ownDeductions.get(`${agg.type}::${agg.currency}`) ?? 0);
      if (amount === 0) continue;

      const convertedAmount = await this.exchangeRateService.convert(
        amount,
        agg.currency,
        targetCurrency,
      );

      this.updateSummaryWithTransaction(summary, agg.type, convertedAmount);
    }

    // Process contact transactions (with flip)
    for (const agg of contactAggregations) {
      const amount =
        (Number(agg._sum.amount) || 0) -
        (contactDeductions.get(`${agg.type}::${agg.currency}`) ?? 0);
      if (amount === 0) continue;

      const convertedAmount = await this.exchangeRateService.convert(
        amount,
        agg.currency,
        targetCurrency,
      );

      const flippedType = (PERSPECTIVE_FLIP_MAP[agg.type] ??
        agg.type) as TransactionType;
      this.updateSummaryWithTransaction(summary, flippedType, convertedAmount);
    }

    summary.netBalance = computeNetBalance(summary);

    return summary;
  }

  /**
   * Sums, per bucket, how much of each loan's raw amount has been discharged
   * by a gift conversion and/or an allocation on either leg — via the same
   * `computeEffectiveObligationAmount` contacts.service.ts uses for contact
   * standing, so the two can never diverge again. Buckets by (type, currency)
   * by default; pass `keyOf` to add a further grouping dimension (e.g.
   * contactId, to match `groupByContact`'s per-contact aggregation).
   */
  private sumObligationDeductions<
    T extends {
      type: TransactionType;
      currency: string;
      amount: Prisma.Decimal | null;
      conversions: Array<{ amount: Prisma.Decimal | null }>;
      allocationsIn: Array<{ amount: Prisma.Decimal | null }>;
      allocationsOut: Array<{ amount: Prisma.Decimal | null }>;
    },
  >(
    loans: T[],
    keyOf: (loan: T) => string = (loan) => `${loan.type}::${loan.currency}`,
  ): Map<string, number> {
    const deductions = new Map<string, number>();
    for (const loan of loans) {
      if (
        loan.conversions.length === 0 &&
        loan.allocationsIn.length === 0 &&
        loan.allocationsOut.length === 0
      ) {
        continue;
      }

      const rawAmount = loan.amount ? Number(loan.amount) : 0;
      const effectiveAmount = computeEffectiveObligationAmount({
        amount: loan.amount,
        giftConversions: loan.conversions,
        allocationsIn: loan.allocationsIn,
        allocationsOut: loan.allocationsOut,
      });
      const deduction = rawAmount - effectiveAmount;
      if (deduction <= 0) continue;

      const key = keyOf(loan);
      deductions.set(key, (deductions.get(key) ?? 0) + deduction);
    }
    return deductions;
  }

  private updateSummaryWithTransaction(
    summary: TransactionSummary,
    type: TransactionType,
    amount: number,
  ) {
    const fieldMap: Partial<Record<string, keyof TransactionSummary>> = {
      LOAN_GIVEN: 'totalLoanGiven',
      LOAN_RECEIVED: 'totalLoanReceived',
      REPAYMENT_MADE: 'totalRepaymentMade',
      REPAYMENT_RECEIVED: 'totalRepaymentReceived',
      GIFT_GIVEN: 'totalGiftGiven',
      GIFT_RECEIVED: 'totalGiftReceived',
      ADVANCE_PAID: 'totalAdvancePaid',
      ADVANCE_RECEIVED: 'totalAdvanceReceived',
      DEPOSIT_PAID: 'totalDepositPaid',
      DEPOSIT_RECEIVED: 'totalDepositReceived',
      ESCROWED: 'totalEscrowed',
      REMITTED: 'totalRemitted',
    };
    const field = fieldMap[type];
    if (field) (summary[field] as number) += amount;
  }

  async groupByContact(userId: string, filter?: FilterTransactionInput) {
    const baseWhere: Prisma.TransactionWhereInput = {
      status: { not: TransactionStatus.CANCELLED },
    };

    if (filter?.types && filter.types.length > 0) {
      baseWhere.type = { in: filter.types };
    }
    if (filter?.startDate || filter?.endDate) {
      baseWhere.date = {
        ...(filter.startDate && { gte: filter.startDate }),
        ...(filter.endDate && { lte: filter.endDate }),
      };
    }
    if (filter?.minAmount !== undefined || filter?.maxAmount !== undefined) {
      baseWhere.amount = {
        ...(filter.minAmount !== undefined && { gte: filter.minAmount }),
        ...(filter.maxAmount !== undefined && { lte: filter.maxAmount }),
      };
    }
    if (filter?.search) {
      baseWhere.OR = [
        { description: { contains: filter.search, mode: 'insensitive' } },
        { itemName: { contains: filter.search, mode: 'insensitive' } },
      ];
    }

    // Determine target currency for summary
    let targetCurrency = filter?.summaryCurrency || filter?.currency;
    if (!targetCurrency) {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { preferredCurrency: true },
      });
      targetCurrency = user?.preferredCurrency || 'NGN';
    }

    // groupBy sums the raw loan amount, but a non-cancelled gift conversion
    // or ACTIVE allocation extinguishes part of its parent loan (see
    // `computeEffectiveObligationAmount` in settlement.util.ts, and the
    // identical fix in calculateConvertedSummary above). Fetch
    // loans-with-conversions-and-allocations separately, bucketed the same
    // way as each aggregation above (own: by contactId; shared: by
    // createdById), and net the discharged portion out before it's added to
    // a contact's summary below. All five queries here are independent, so
    // run them concurrently instead of round-tripping to the DB one at a time.
    const [
      ownAggregations,
      sharedAggregations,
      ownLoans,
      sharedLoans,
      contacts,
    ] = await Promise.all([
      // 1. Aggregations for transactions created by the user
      this.prisma.transaction.groupBy({
        by: ['contactId', 'type', 'currency'],
        where: {
          ...baseWhere,
          createdById: userId,
          contactId: filter?.contactId || undefined,
        },
        _sum: {
          amount: true,
        },
      }),
      // 2. Aggregations for transactions where user is the contact (flip required)
      this.prisma.transaction.groupBy({
        by: ['createdById', 'type', 'currency'],
        where: {
          ...baseWhere,
          createdById: { not: userId },
          contact: { linkedUserId: userId },
        },
        _sum: {
          amount: true,
        },
      }),
      this.prisma.transaction.findMany({
        where: {
          ...baseWhere,
          createdById: userId,
          contactId: filter?.contactId || undefined,
          ...TransactionSummaryService.LOAN_TYPES_FILTER,
        },
        select: {
          contactId: true,
          type: true,
          currency: true,
          amount: true,
          conversions: TransactionSummaryService.GIFT_CONVERSIONS_SELECT,
          allocationsIn: TransactionSummaryService.ALLOCATIONS_SELECT,
          allocationsOut: TransactionSummaryService.ALLOCATIONS_SELECT,
        },
      }),
      this.prisma.transaction.findMany({
        where: {
          ...baseWhere,
          createdById: { not: userId },
          contact: { linkedUserId: userId },
          ...TransactionSummaryService.LOAN_TYPES_FILTER,
        },
        select: {
          createdById: true,
          type: true,
          currency: true,
          amount: true,
          conversions: TransactionSummaryService.GIFT_CONVERSIONS_SELECT,
          allocationsIn: TransactionSummaryService.ALLOCATIONS_SELECT,
          allocationsOut: TransactionSummaryService.ALLOCATIONS_SELECT,
        },
      }),
      // Get all contacts for this user to map names
      this.prisma.contact.findMany({
        where: { userId },
      }),
    ]);

    const ownDeductions = this.sumObligationDeductions(
      ownLoans,
      (loan) => `${loan.contactId}::${loan.type}::${loan.currency}`,
    );
    const sharedDeductions = this.sumObligationDeductions(
      sharedLoans,
      (loan) => `${loan.createdById}::${loan.type}::${loan.currency}`,
    );

    const contactMap = new Map(contacts.map((c) => [c.id, c]));
    // Map linkedUserId to local contactId for shared transactions
    const linkedUserContactMap = new Map(
      contacts.filter((c) => c.linkedUserId).map((c) => [c.linkedUserId, c.id]),
    );

    // Group aggregations by contactId
    const groupedByContact = new Map<string | null, TransactionSummary>();

    const getInitialSummary = (): TransactionSummary => ({
      totalLoanGiven: 0,
      totalLoanReceived: 0,
      totalRepaymentMade: 0,
      totalRepaymentReceived: 0,
      totalGiftGiven: 0,
      totalGiftReceived: 0,
      totalAdvancePaid: 0,
      totalAdvanceReceived: 0,
      totalDepositPaid: 0,
      totalDepositReceived: 0,
      totalEscrowed: 0,
      totalRemitted: 0,
      netBalance: 0,
      currency: targetCurrency,
    });

    // Process own transactions
    for (const agg of ownAggregations) {
      const contactId = agg.contactId;
      if (!groupedByContact.has(contactId)) {
        groupedByContact.set(contactId, getInitialSummary());
      }

      const summary = groupedByContact.get(contactId);
      const amount =
        (Number(agg._sum.amount) || 0) -
        (ownDeductions.get(`${contactId}::${agg.type}::${agg.currency}`) ?? 0);
      if (amount === 0) continue;

      const convertedAmount = await this.exchangeRateService.convert(
        amount,
        agg.currency,
        targetCurrency,
      );

      this.updateSummaryWithTransaction(summary, agg.type, convertedAmount);
    }

    // Process shared transactions (with flip)
    for (const agg of sharedAggregations) {
      // Find the local contact representing the creator
      const contactId = linkedUserContactMap.get(agg.createdById) || null;

      // If we are filtering by contactId and this shared transaction doesn't match, skip
      if (filter?.contactId && contactId !== filter.contactId) continue;

      if (!groupedByContact.has(contactId)) {
        groupedByContact.set(contactId, getInitialSummary());
      }

      const summary = groupedByContact.get(contactId);
      const amount =
        (Number(agg._sum.amount) || 0) -
        (sharedDeductions.get(
          `${agg.createdById}::${agg.type}::${agg.currency}`,
        ) ?? 0);
      if (amount === 0) continue;

      const convertedAmount = await this.exchangeRateService.convert(
        amount,
        agg.currency,
        targetCurrency,
      );

      // Flip perspective
      const flippedType = (PERSPECTIVE_FLIP_MAP[agg.type] ??
        agg.type) as TransactionType;
      this.updateSummaryWithTransaction(summary, flippedType, convertedAmount);
    }

    // Calculate net balance for each contact and format result
    const result = Array.from(groupedByContact.entries()).map(
      ([contactId, summary]) => {
        summary.netBalance = computeNetBalance(summary);

        return {
          contact: contactId ? contactMap.get(contactId) : null,
          summary,
        };
      },
    );

    return result;
  }
}
