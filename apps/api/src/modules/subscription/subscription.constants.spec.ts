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
});
