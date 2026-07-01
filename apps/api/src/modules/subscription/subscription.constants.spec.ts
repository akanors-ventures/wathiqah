import {
  SUBSCRIPTION_LIMITS,
  PRO_PRICING,
  TierLimits,
} from './subscription.constants';
import { SubscriptionTier } from '../../generated/prisma/client';

describe('SUBSCRIPTION_LIMITS', () => {
  it('defines contactNotificationSms on TierLimits interface', () => {
    const freeLimits: TierLimits = SUBSCRIPTION_LIMITS[SubscriptionTier.FREE];
    expect(typeof freeLimits.contactNotificationSms).toBe('number');
  });

  it('sets FREE tier contactNotificationSms to 10', () => {
    expect(
      SUBSCRIPTION_LIMITS[SubscriptionTier.FREE].contactNotificationSms,
    ).toBe(10);
  });

  it('sets PRO tier contactNotificationSms to -1 (unlimited)', () => {
    expect(
      SUBSCRIPTION_LIMITS[SubscriptionTier.PRO].contactNotificationSms,
    ).toBe(-1);
  });

  it('defines maxNotes on TierLimits interface', () => {
    const freeLimits: TierLimits = SUBSCRIPTION_LIMITS[SubscriptionTier.FREE];
    expect(typeof freeLimits.maxNotes).toBe('number');
  });

  it('sets FREE tier maxNotes to 5', () => {
    expect(SUBSCRIPTION_LIMITS[SubscriptionTier.FREE].maxNotes).toBe(5);
  });

  it('sets PRO tier maxNotes to -1 (unlimited)', () => {
    expect(SUBSCRIPTION_LIMITS[SubscriptionTier.PRO].maxNotes).toBe(-1);
  });

  it('sets FREE tier allowOrganisations to false', () => {
    expect(SUBSCRIPTION_LIMITS[SubscriptionTier.FREE].allowOrganisations).toBe(
      false,
    );
  });

  it('sets PRO tier allowOrganisations to true', () => {
    expect(SUBSCRIPTION_LIMITS[SubscriptionTier.PRO].allowOrganisations).toBe(
      true,
    );
  });
});

describe('PRO_PRICING', () => {
  it('sets NGN monthly price to 2500', () => {
    expect(PRO_PRICING.NGN.monthly).toBe(2500);
  });

  it('sets NGN annual price to 25000 (10 months × monthly)', () => {
    expect(PRO_PRICING.NGN.annual).toBe(25000);
  });

  it('sets USD monthly price to 4.99', () => {
    expect(PRO_PRICING.USD.monthly).toBe(4.99);
  });

  it('sets GBP monthly price to 3.99', () => {
    expect(PRO_PRICING.GBP.monthly).toBe(3.99);
  });

  it('annual is 10× monthly for all currencies (2 months free)', () => {
    for (const [, prices] of Object.entries(PRO_PRICING)) {
      expect(prices.annual).toBeCloseTo(prices.monthly * 10, 5);
    }
  });
});
