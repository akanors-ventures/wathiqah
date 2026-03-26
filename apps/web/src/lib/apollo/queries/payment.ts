import type {
  CancelSubscriptionMutation,
  CancelSubscriptionMutationVariables,
  CreateCheckoutSessionMutation,
  CreateCheckoutSessionMutationVariables,
  CreateSupportSessionMutation,
  CreateSupportSessionMutationVariables,
  ReactivateSubscriptionMutation,
} from "@/types/__generated__/graphql";
import { gql, type TypedDocumentNode } from "@apollo/client";

export const CREATE_CHECKOUT_SESSION: TypedDocumentNode<
  CreateCheckoutSessionMutation,
  CreateCheckoutSessionMutationVariables
> = gql`
  mutation CreateCheckoutSession($tier: SubscriptionTier!, $currency: String!, $interval: BillingInterval) {
    createCheckoutSession(tier: $tier, currency: $currency, interval: $interval) {
      url
    }
  }
`;

export const CREATE_SUPPORT_SESSION: TypedDocumentNode<
  CreateSupportSessionMutation,
  CreateSupportSessionMutationVariables
> = gql`
  mutation CreateSupportSession($amount: Float, $currency: String) {
    createSupportSession(amount: $amount, currency: $currency) {
      url
    }
  }
`;

export const CANCEL_SUBSCRIPTION: TypedDocumentNode<
  CancelSubscriptionMutation,
  CancelSubscriptionMutationVariables
> = gql`
  mutation CancelSubscription {
    cancelSubscription
  }
`;

export const REACTIVATE_SUBSCRIPTION: TypedDocumentNode<
  ReactivateSubscriptionMutation,
  Record<string, never>
> = gql`
  mutation ReactivateSubscription {
    reactivateSubscription
  }
`;
