import type {
  MySubscriptionQuery,
  MySubscriptionQueryVariables,
} from "@/types/__generated__/graphql";
import { gql, type TypedDocumentNode } from "@apollo/client";

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
        allowSMS
        allowAdvancedAnalytics
        allowProfessionalReports
      }
      featureUsage
      subscriptionStatus
    }
  }
`;
