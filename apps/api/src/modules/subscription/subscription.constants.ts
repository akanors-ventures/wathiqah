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
    maxWitnessesPerMonth: 10,
    allowSMS: false,
    allowAdvancedAnalytics: false,
    allowProfessionalReports: false,
  },
  [SubscriptionTier.PRO]: {
    maxContacts: -1,
    maxWitnessesPerMonth: -1,
    allowSMS: true,
    allowAdvancedAnalytics: true,
    allowProfessionalReports: true,
  },
};
