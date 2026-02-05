import { gql, type TypedDocumentNode } from "@apollo/client";
import type {
  SearchWitnessQuery,
  SearchWitnessQueryVariables,
  UpdateUserMutation,
  UpdateUserMutationVariables,
} from "@/types/__generated__/graphql";

export const UPDATE_USER_MUTATION: TypedDocumentNode<
  UpdateUserMutation,
  UpdateUserMutationVariables
> = gql`
  mutation UpdateUser($input: UpdateUserInput!) {
    updateUser(updateUserInput: $input) {
      id
      firstName
      lastName
      phoneNumber
      email
      preferredCurrency
    }
  }
`;

export const SEARCH_WITNESS_QUERY: TypedDocumentNode<
  SearchWitnessQuery,
  SearchWitnessQueryVariables
> = gql`
  query SearchWitness($input: SearchWitnessInput!) {
    searchWitness(input: $input) {
      id
      firstName
      lastName
    }
  }
`;
