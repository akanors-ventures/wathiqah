import { gql, type TypedDocumentNode } from "@apollo/client";
import type {
  MySubscriptionQuery,
  MySubscriptionQueryVariables,
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
        maxNotesPerMonth
        contactNotificationSms
        allowSMS
        allowAdvancedAnalytics
        allowProfessionalReports
      }
      featureUsage
      subscriptionStatus
      cancelAtPeriodEnd
      currentPeriodEnd
    }
  }
`;
