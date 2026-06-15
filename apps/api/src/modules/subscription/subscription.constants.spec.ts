import { SUBSCRIPTION_LIMITS, TierLimits } from './subscription.constants';
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
});
