import { SubscriptionTier } from '../../generated/prisma/client';

export { SubscriptionTier };

export interface TierLimits {
  maxContacts: number;
  maxWitnessesPerMonth: number;
  contactNotificationSms: number;
  allowSMS: boolean;
  allowAdvancedAnalytics: boolean;
  allowProfessionalReports: boolean;
  allowOrganisations: boolean;
  maxNotes: number;
}

export const SUBSCRIPTION_LIMITS: Record<SubscriptionTier, TierLimits> = {
  [SubscriptionTier.FREE]: {
    maxContacts: 50,
    maxWitnessesPerMonth: 20,
    contactNotificationSms: 10,
    allowSMS: false,
    allowAdvancedAnalytics: false,
    allowProfessionalReports: false,
    allowOrganisations: false,
    maxNotes: 5,
  },
  [SubscriptionTier.PRO]: {
    maxContacts: -1,
    maxWitnessesPerMonth: -1,
    contactNotificationSms: -1,
    allowSMS: true,
    allowAdvancedAnalytics: true,
    allowProfessionalReports: true,
    allowOrganisations: true,
    maxNotes: -1,
  },
};

// IMPORTANT: Changing these values does NOT automatically change what payment providers charge.
// When updating prices, you must also:
//   1. Update the Flutterwave plan amount and re-point FLUTTERWAVE_PRO_PLAN_ID / FLUTTERWAVE_PRO_ANNUAL_PLAN_ID
//   2. Create a new Stripe price object and re-point STRIPE_PRO_PLAN_ID / STRIPE_PRO_ANNUAL_PLAN_ID
//   3. Update the LemonSqueezy variant and re-point LEMON_SQUEEZY_PRO_VARIANT_ID / LEMON_SQUEEZY_PRO_ANNUAL_VARIANT_ID
export const PRO_PRICING: Record<
  'USD' | 'NGN' | 'GBP',
  { monthly: number; annual: number }
> = {
  USD: { monthly: 4.99, annual: 49.9 },
  NGN: { monthly: 2500, annual: 25000 },
  GBP: { monthly: 3.99, annual: 39.9 },
};
