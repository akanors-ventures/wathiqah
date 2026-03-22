import { SubscriptionTier } from '../../generated/prisma/client';

export { SubscriptionTier };

export interface TierLimits {
  maxContacts: number;
  maxWitnessesPerMonth: number;
  contactNotificationSms: number;
  allowSMS: boolean;
  allowAdvancedAnalytics: boolean;
  allowProfessionalReports: boolean;
}

export const SUBSCRIPTION_LIMITS: Record<SubscriptionTier, TierLimits> = {
  [SubscriptionTier.FREE]: {
    maxContacts: 50,
    maxWitnessesPerMonth: 10,
    contactNotificationSms: 10,
    allowSMS: false,
    allowAdvancedAnalytics: false,
    allowProfessionalReports: false,
  },
  [SubscriptionTier.PRO]: {
    maxContacts: -1,
    maxWitnessesPerMonth: -1,
    contactNotificationSms: -1,
    allowSMS: true,
    allowAdvancedAnalytics: true,
    allowProfessionalReports: true,
  },
};
