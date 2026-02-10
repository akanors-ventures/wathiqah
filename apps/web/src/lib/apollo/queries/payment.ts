import type {
  CreateCheckoutSessionMutation,
  CreateCheckoutSessionMutationVariables,
  CreateContributionSessionMutation,
  CreateContributionSessionMutationVariables,
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

export const CREATE_CONTRIBUTION_SESSION: TypedDocumentNode<
  CreateContributionSessionMutation,
  CreateContributionSessionMutationVariables
> = gql`
  mutation CreateContributionSession($amount: Float, $currency: String) {
    createContributionSession(amount: $amount, currency: $currency) {
      url
    }
  }
`;
