import { gql, type TypedDocumentNode } from "@apollo/client";
import type {
  AcknowledgeWitnessRequestMutation,
  AcknowledgeWitnessRequestMutationVariables,
  GetWitnessInvitationQuery,
  GetWitnessInvitationQueryVariables,
  MyWitnessRequestsQuery,
  MyWitnessRequestsQueryVariables,
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
        description
        date
        returnDirection
        createdBy {
          name
          email
        }
      }
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
    witnessInvitation(token: $token) {
      id
      status
      transaction {
        id
        amount
        currency
        type
        description
        date
        returnDirection
        createdBy {
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
