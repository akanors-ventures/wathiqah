import {
  AcknowledgeWitnessRequestMutation,
  AcknowledgeWitnessRequestMutationVariables,
  GetWitnessInvitationQuery,
  GetWitnessInvitationQueryVariables,
  MyWitnessRequestsQuery,
} from "@/types/__generated__/graphql";
import { MyWitnessRequestsQueryVariables } from "@/types/__generated__/graphql";
import { gql, TypedDocumentNode } from "@apollo/client";

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
        type
        description
        date
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
        type
        description
        date
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
