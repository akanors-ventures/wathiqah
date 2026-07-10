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
// Flutterwave is the sole provider for new subscriptions (every currency). When updating prices,
// you must also update the Flutterwave plan amount and re-point the matching per-currency env var:
//   FLUTTERWAVE_PRO_PLAN_ID_{NGN,USD,GBP,DEFAULT} / FLUTTERWAVE_PRO_ANNUAL_PLAN_ID_{NGN,USD,GBP,DEFAULT}
// Stripe/LemonSqueezy price objects (STRIPE_PRO_PLAN_ID / LEMON_SQUEEZY_PRO_VARIANT_ID etc.) are no
// longer used for new checkouts, but keep them in sync too as long as they still service existing
// subscribers via webhook/cancel/reactivate.
export const PRO_PRICING: Record<
  'USD' | 'NGN' | 'GBP',
  { monthly: number; annual: number }
> = {
  USD: { monthly: 4.99, annual: 49.9 },
  NGN: { monthly: 2500, annual: 25000 },
  GBP: { monthly: 3.99, annual: 39.9 },
};
