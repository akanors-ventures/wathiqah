import type {
  CreateDonationSessionMutation,
  CreateDonationSessionMutationVariables,
  CreateSubscriptionSessionMutation,
  CreateSubscriptionSessionMutationVariables,
  DonationOptionsQuery,
  DonationOptionsQueryVariables,
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

export const CREATE_SUBSCRIPTION_SESSION_MUTATION: TypedDocumentNode<
  CreateSubscriptionSessionMutation,
  CreateSubscriptionSessionMutationVariables
> = gql`
  mutation CreateSubscriptionSession($tier: SubscriptionTier!) {
    createSubscriptionSession(tier: $tier) {
      url
      sessionId
    }
  }
`;

export const DONATION_OPTIONS_QUERY: TypedDocumentNode<
  DonationOptionsQuery,
  DonationOptionsQueryVariables
> = gql`
  query DonationOptions {
    donationOptions {
      id
      label
      amount
      currency
      description
    }
  }
`;

export const CREATE_DONATION_SESSION_MUTATION: TypedDocumentNode<
  CreateDonationSessionMutation,
  CreateDonationSessionMutationVariables
> = gql`
  mutation CreateDonationSession($amount: Float!, $currency: String!) {
    createDonationSession(amount: $amount, currency: $currency) {
      url
      sessionId
    }
  }
`;
