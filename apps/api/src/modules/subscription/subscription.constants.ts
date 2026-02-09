import { SubscriptionTier } from '../../generated/prisma/client';

export { SubscriptionTier };

export interface TierLimits {
  maxContacts: number;
  maxWitnessesPerMonth: number;
  allowSMS: boolean;
  allowAdvancedAnalytics: boolean;
  allowProfessionalReports: boolean;
}

export const SUBSCRIPTION_LIMITS: Record<SubscriptionTier, TierLimits> = {
  [SubscriptionTier.FREE]: {
    maxContacts: 50,
    maxWitnessesPerMonth: 3,
    allowSMS: false,
    allowAdvancedAnalytics: false,
    allowProfessionalReports: false,
  },
  [SubscriptionTier.PRO]: {
    maxContacts: Infinity,
    maxWitnessesPerMonth: Infinity,
    allowSMS: true,
    allowAdvancedAnalytics: true,
    allowProfessionalReports: true,
  },
};
