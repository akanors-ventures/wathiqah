import { gql, type TypedDocumentNode } from "@apollo/client";
import type {
  MySubscriptionQuery,
  MySubscriptionQueryVariables,
  ProPricingQuery,
  ProPricingQueryVariables,
} from "@/types/__generated__/graphql";

export const MY_SUBSCRIPTION_QUERY: TypedDocumentNode<
  MySubscriptionQuery,
  MySubscriptionQueryVariables
> = gql`
  query MySubscription {
    mySubscription {
      tier
      limits {
        maxContacts
        maxWitnessesPerMonth
        maxNotes
        contactNotificationSms
        allowSMS
        allowAdvancedAnalytics
        allowProfessionalReports
        allowOrganisations
      }
      featureUsage
      subscriptionStatus
      cancelAtPeriodEnd
      currentPeriodEnd
    }
  }
`;

export const PRO_PRICING_QUERY: TypedDocumentNode<ProPricingQuery, ProPricingQueryVariables> = gql`
  query ProPricing {
    proPricing {
      currencies {
        currency
        monthly
        annual
      }
      freeLimits {
        maxContacts
        maxWitnessesPerMonth
        maxNotes
        contactNotificationSms
        allowSMS
        allowAdvancedAnalytics
        allowProfessionalReports
        allowOrganisations
      }
      proLimits {
        maxContacts
        maxWitnessesPerMonth
        maxNotes
        contactNotificationSms
        allowSMS
        allowAdvancedAnalytics
        allowProfessionalReports
        allowOrganisations
      }
    }
  }
`;
