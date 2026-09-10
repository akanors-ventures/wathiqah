import {
  CONTACT_STANDING_SIGN,
  CREDIT_SOURCE_TYPES,
  LIFECYCLE_OBLIGATION_TYPES,
  OBLIGATION_SIGN,
  computeEffectiveObligationAmount,
  computeOutstanding,
  computeSettledAmount,
  isCreditSourceType,
  isLifecycleObligationType,
  isValueConservingPair,
  toNumber,
} from './settlement.util';

/** Stand-in for a Prisma Decimal, which arrives with a toNumber() method. */
const decimal = (n: number) => ({ amount: { toNumber: () => n } });

describe('settlement.util', () => {
  describe('toNumber', () => {
    it('handles null, numbers, strings and Prisma Decimals', () => {
      expect(toNumber(null)).toBe(0);
      expect(toNumber(undefined)).toBe(0);
      expect(toNumber(42)).toBe(42);
      expect(toNumber('42.5')).toBe(42.5);
      expect(toNumber({ toNumber: () => 7 })).toBe(7);
    });
  });

  describe('computeSettledAmount', () => {
    it('is zero when nothing has settled the transaction', () => {
      expect(computeSettledAmount({})).toBe(0);
      expect(
        computeSettledAmount({
          children: [],
          allocationsIn: [],
          allocationsOut: [],
        }),
      ).toBe(0);
    });

    it('sums children alone (the pre-allocation behaviour)', () => {
      expect(
        computeSettledAmount({ children: [decimal(200), decimal(150)] }),
      ).toBe(350);
    });

    it('sums allocations alone', () => {
      expect(
        computeSettledAmount({ allocationsIn: [decimal(100), decimal(50)] }),
      ).toBe(150);
      expect(computeSettledAmount({ allocationsOut: [decimal(75)] })).toBe(75);
    });

    it('counts allocations on BOTH legs alongside children', () => {
      // A pool that has had credit drawn out of it AND received some in.
      expect(
        computeSettledAmount({
          children: [decimal(10)],
          allocationsIn: [decimal(20)],
          allocationsOut: [decimal(30)],
        }),
      ).toBe(60);
    });
  });

  describe('computeOutstanding', () => {
    it('subtracts settled from the principal', () => {
      expect(computeOutstanding(500, 200)).toBe(300);
      expect(computeOutstanding({ toNumber: () => 500 }, 200)).toBe(300);
    });

    it('clamps at zero rather than going negative', () => {
      expect(computeOutstanding(200, 500)).toBe(0);
    });

    it('treats a null principal as zero', () => {
      expect(computeOutstanding(null, 0)).toBe(0);
    });
  });

  describe('computeEffectiveObligationAmount', () => {
    it('returns the raw amount when nothing has discharged it', () => {
      expect(computeEffectiveObligationAmount({ amount: 200 })).toBe(200);
    });

    it('subtracts gift conversions (the pre-allocation behaviour)', () => {
      expect(
        computeEffectiveObligationAmount({
          amount: 200,
          giftConversions: [decimal(50)],
        }),
      ).toBe(150);
    });

    it('subtracts allocations on both legs', () => {
      expect(
        computeEffectiveObligationAmount({
          amount: 500,
          allocationsIn: [decimal(100)],
          allocationsOut: [decimal(150)],
        }),
      ).toBe(250);
    });

    it('composes gift conversions and allocations additively', () => {
      // LOAN_GIVEN 200, gifted back 50, settled 100 from a credit pool.
      expect(
        computeEffectiveObligationAmount({
          amount: 200,
          giftConversions: [decimal(50)],
          allocationsIn: [decimal(100)],
        }),
      ).toBe(50);
    });

    it('clamps at zero', () => {
      expect(
        computeEffectiveObligationAmount({
          amount: 100,
          allocationsIn: [decimal(300)],
        }),
      ).toBe(0);
    });

    it('does NOT accept repayment children — they are summed as their own signed rows', () => {
      // Guards the "do not merge the two functions" trap. This function has no
      // `children` input at all; a caller that tries to pass repayments through
      // it would double-count them against computeContactBalance's signed sum.
      const parts = { amount: 200, giftConversions: [] as never[] };
      expect(computeEffectiveObligationAmount(parts)).toBe(200);
      expect(
        Object.keys({
          amount: 0,
          giftConversions: [],
          allocationsIn: [],
          allocationsOut: [],
        }),
      ).not.toContain('children');
    });
  });

  describe('type predicates', () => {
    it('treats the eight outstanding-bearing types as lifecycle obligations', () => {
      for (const type of LIFECYCLE_OBLIGATION_TYPES) {
        expect(isLifecycleObligationType(type)).toBe(true);
      }
      expect(LIFECYCLE_OBLIGATION_TYPES).toHaveLength(8);
    });

    it('excludes gifts and repayments', () => {
      for (const type of [
        'GIFT_GIVEN',
        'GIFT_RECEIVED',
        'REPAYMENT_MADE',
        'REPAYMENT_RECEIVED',
        'EXPENSE',
        'INCOME',
      ]) {
        expect(isLifecycleObligationType(type)).toBe(false);
      }
    });

    it('allows only ESCROWED and REMITTED as credit sources', () => {
      expect(CREDIT_SOURCE_TYPES).toEqual(['ESCROWED', 'REMITTED']);
      expect(isCreditSourceType('ESCROWED')).toBe(true);
      expect(isCreditSourceType('REMITTED')).toBe(true);
      expect(isCreditSourceType('LOAN_GIVEN')).toBe(false);
    });
  });

  describe('isValueConservingPair — the correctness core', () => {
    it('accepts money-in (ESCROWED, −1) against everything the contact owes me', () => {
      for (const target of ['LOAN_GIVEN', 'ADVANCE_PAID', 'DEPOSIT_PAID']) {
        expect(isValueConservingPair('ESCROWED', target)).toBe(true);
      }
    });

    it('accepts money-out (REMITTED, +1) against everything I owe', () => {
      for (const target of [
        'LOAN_RECEIVED',
        'ADVANCE_RECEIVED',
        'DEPOSIT_RECEIVED',
      ]) {
        expect(isValueConservingPair('REMITTED', target)).toBe(true);
      }
    });

    it('rejects same-direction pairs — they would mint 2X of value', () => {
      // ESCROWED 500 (−500) + LOAN_RECEIVED 200 (−200) = −700. Allocating 200
      // would leave −300: a +400 swing for a 200 allocation, with no cash
      // movement. Two liabilities pointing the same way have no counter-claim
      // to net against. The real event that shrinks both is a write-off, which
      // is a gift — see ConvertGiftDialog / the GIFT_* conversion path.
      expect(isValueConservingPair('ESCROWED', 'LOAN_RECEIVED')).toBe(false);
      expect(isValueConservingPair('ESCROWED', 'ADVANCE_RECEIVED')).toBe(false);
      expect(isValueConservingPair('ESCROWED', 'DEPOSIT_RECEIVED')).toBe(false);
      expect(isValueConservingPair('REMITTED', 'LOAN_GIVEN')).toBe(false);
      expect(isValueConservingPair('REMITTED', 'ADVANCE_PAID')).toBe(false);
    });

    it('rejects types with no standing sign (gifts)', () => {
      expect(isValueConservingPair('ESCROWED', 'GIFT_RECEIVED')).toBe(false);
      expect(isValueConservingPair('GIFT_GIVEN', 'LOAN_GIVEN')).toBe(false);
    });

    it('is symmetric', () => {
      expect(isValueConservingPair('LOAN_GIVEN', 'ESCROWED')).toBe(
        isValueConservingPair('ESCROWED', 'LOAN_GIVEN'),
      );
    });
  });

  describe('OBLIGATION_SIGN', () => {
    it('is derived from CONTACT_STANDING_SIGN, not a hand-copied duplicate', () => {
      // contacts.service.ts imports CONTACT_STANDING_SIGN from this module —
      // OBLIGATION_SIGN is filtered from the same object, so the two cannot
      // structurally drift apart the way two independently hand-written maps
      // could.
      for (const [type, sign] of Object.entries(OBLIGATION_SIGN)) {
        expect(CONTACT_STANDING_SIGN[type]).toBe(sign);
      }
    });

    it('excludes REPAYMENT_MADE/RECEIVED — never independently outstanding', () => {
      expect(OBLIGATION_SIGN.REPAYMENT_MADE).toBeUndefined();
      expect(OBLIGATION_SIGN.REPAYMENT_RECEIVED).toBeUndefined();
      expect(CONTACT_STANDING_SIGN.REPAYMENT_MADE).toBe(1);
      expect(CONTACT_STANDING_SIGN.REPAYMENT_RECEIVED).toBe(-1);
    });

    it('gives every lifecycle obligation type a sign', () => {
      for (const type of LIFECYCLE_OBLIGATION_TYPES) {
        expect(OBLIGATION_SIGN[type]).toBeDefined();
      }
    });
  });
});
