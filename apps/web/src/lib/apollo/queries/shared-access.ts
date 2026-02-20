import { gql, type TypedDocumentNode } from "@apollo/client";
import type {
  AcceptAccessMutation,
  AcceptAccessMutationVariables,
  GrantAccessMutation,
  GrantAccessMutationVariables,
  MyAccessGrantsQuery,
  MyAccessGrantsQueryVariables,
  ReceivedAccessGrantsQuery,
  ReceivedAccessGrantsQueryVariables,
  RevokeAccessMutation,
  RevokeAccessMutationVariables,
  SharedDataQuery,
  SharedDataQueryVariables,
} from "@/types/__generated__/graphql";

export const MY_ACCESS_GRANTS_QUERY: TypedDocumentNode<
  MyAccessGrantsQuery,
  MyAccessGrantsQueryVariables
> = gql`
  query MyAccessGrants {
    myAccessGrants {
      id
      email
      token
      status
      createdAt
      expiresAt
    }
  }
`;

export const GRANT_ACCESS_MUTATION: TypedDocumentNode<
  GrantAccessMutation,
  GrantAccessMutationVariables
> = gql`
  mutation GrantAccess($input: GrantAccessInput!) {
    grantAccess(grantAccessInput: $input) {
      id
      email
      status
    }
  }
`;

export const REVOKE_ACCESS_MUTATION: TypedDocumentNode<
  RevokeAccessMutation,
  RevokeAccessMutationVariables
> = gql`
  mutation RevokeAccess($id: String!) {
    revokeAccess(id: $id) {
      id
      status
    }
  }
`;

export const RECEIVED_ACCESS_GRANTS_QUERY: TypedDocumentNode<
  ReceivedAccessGrantsQuery,
  ReceivedAccessGrantsQueryVariables
> = gql`
  query ReceivedAccessGrants {
    receivedAccessGrants {
      id
      email
      token
      status
      createdAt
      granter {
        id
        firstName
        lastName
        email
      }
    }
  }
`;

export const ACCEPT_ACCESS_MUTATION: TypedDocumentNode<
  AcceptAccessMutation,
  AcceptAccessMutationVariables
> = gql`
  mutation AcceptAccess($token: String!) {
    acceptAccess(token: $token) {
      id
      status
    }
  }
`;

export const SHARED_DATA_QUERY: TypedDocumentNode<SharedDataQuery, SharedDataQueryVariables> = gql`
  query SharedData($grantId: String!) {
    sharedData(grantId: $grantId) {
      user {
        id
        firstName
        lastName
        email
      }
      transactions {
        id
        amount
        currency
        type
        date
        description
        category
        itemName
        quantity
        returnDirection
        contact {
          name
        }
        witnesses {
          id
          status
          user {
            name
          }
        }
      }
      promises {
        id
        description
        promiseTo
        dueDate
        priority
        status
        notes
      }
    }
  }
`;
