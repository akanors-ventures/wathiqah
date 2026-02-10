import { gql, type TypedDocumentNode } from "@apollo/client";
import type {
  AcknowledgeWitnessRequestMutation,
  AcknowledgeWitnessRequestMutationVariables,
  GetWitnessInvitationQuery,
  GetWitnessInvitationQueryVariables,
  MyWitnessRequestsQuery,
  MyWitnessRequestsQueryVariables,
  ResendWitnessInvitationMutation,
  ResendWitnessInvitationMutationVariables,
  RemoveWitnessMutation,
  RemoveWitnessMutationVariables,
} from "@/types/__generated__/graphql";

export const MY_WITNESS_REQUESTS: TypedDocumentNode<
  MyWitnessRequestsQuery,
  MyWitnessRequestsQueryVariables
> = gql`
  query MyWitnessRequests($status: WitnessStatus) {
    myWitnessRequests(status: $status) {
      id
      status
      invitedAt
      acknowledgedAt
      transaction {
        id
        amount
        currency
        type
        category
        itemName
        description
        date
        returnDirection
        createdBy {
          name
          email
        }
        contact {
          id
          firstName
          lastName
          name
        }
      }
    }
  }
`;

export const RESEND_WITNESS_INVITATION: TypedDocumentNode<
  ResendWitnessInvitationMutation,
  ResendWitnessInvitationMutationVariables
> = gql`
  mutation ResendWitnessInvitation($witnessId: ID!) {
    resendWitnessInvitation(witnessId: $witnessId) {
      id
      status
      invitedAt
    }
  }
`;

export const REMOVE_WITNESS: TypedDocumentNode<
  RemoveWitnessMutation,
  RemoveWitnessMutationVariables
> = gql`
  mutation RemoveWitness($witnessId: ID!) {
    removeWitness(witnessId: $witnessId) {
      id
    }
  }
`;

export const ACKNOWLEDGE_WITNESS: TypedDocumentNode<
  AcknowledgeWitnessRequestMutation,
  AcknowledgeWitnessRequestMutationVariables
> = gql`
  mutation AcknowledgeWitnessRequest($input: AcknowledgeWitnessInput!) {
    acknowledgeWitness(input: $input) {
      id
      status
      acknowledgedAt
    }
  }
`;

export const GET_WITNESS_INVITATION: TypedDocumentNode<
  GetWitnessInvitationQuery,
  GetWitnessInvitationQueryVariables
> = gql`
  query GetWitnessInvitation($token: String!) {
    witnessInvitation(token: $token) @public {
      id
      status
      transaction {
        id
        amount
        currency
        type
        category
        itemName
        description
        date
        returnDirection
        createdBy {
          name
        }
        contact {
          id
          firstName
          lastName
          name
        }
      }
      user {
        id
        email
        name
        passwordHash
      }
    }
  }
`;
