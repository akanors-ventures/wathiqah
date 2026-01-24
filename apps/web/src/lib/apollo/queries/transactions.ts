import {
  TransactionQuery,
  TransactionQueryVariables,
} from "@/types/__generated__/graphql";
import { gql, TypedDocumentNode } from "@apollo/client";

export const GET_TRANSACTION: TypedDocumentNode<
  TransactionQuery,
  TransactionQueryVariables
> = gql`
  query Transaction($id: ID!) {
    transaction(id: $id) {
      id
      amount
      category
      type
      date
      description
      itemName
      quantity
      createdAt
      contact {
        id
        name
      }
      witnesses {
        id
        status
        invitedAt
        acknowledgedAt
        user {
          id
          name
          email
        }
      }
      history {
        id
        changeType
        previousState
        newState
        createdAt
        user {
          id
          name
          email
        }
      }
    }
  }
`;
