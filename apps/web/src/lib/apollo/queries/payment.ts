import type {
  CancelSubscriptionMutation,
  CancelSubscriptionMutationVariables,
  CreateCheckoutSessionMutation,
  CreateCheckoutSessionMutationVariables,
  CreateSupportSessionMutation,
  CreateSupportSessionMutationVariables,
} from "@/types/__generated__/graphql";
import { gql, type TypedDocumentNode } from "@apollo/client";

export const CREATE_CHECKOUT_SESSION: TypedDocumentNode<
  CreateCheckoutSessionMutation,
  CreateCheckoutSessionMutationVariables
> = gql`
  mutation CreateCheckoutSession($tier: SubscriptionTier!, $currency: String!) {
    createCheckoutSession(tier: $tier, currency: $currency) {
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
