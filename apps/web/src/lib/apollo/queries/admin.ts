import { gql, type TypedDocumentNode } from "@apollo/client";
import type {
  AdminAuditLogsQuery,
  AdminAuditLogsQueryVariables,
  AdminStatsQuery,
  AdminStatsQueryVariables,
  AdminUserQuery,
  AdminUserQueryVariables,
  AdminUsersQuery,
  AdminUsersQueryVariables,
  DeprovisionProMutation,
  DeprovisionProMutationVariables,
  ProvisionProMutation,
  ProvisionProMutationVariables,
  SetUserRoleMutation,
  SetUserRoleMutationVariables,
} from "@/types/__generated__/graphql";

export const ADMIN_USER_FIELDS = gql`
  fragment AdminUserFields on User {
    id
    email
    name
    firstName
    lastName
    phoneNumber
    preferredCurrency
    tier
    role
    isSupporter
    isEmailVerified
    subscriptionStatus
    createdAt
  }
`;

export const ADMIN_USERS_QUERY: TypedDocumentNode<AdminUsersQuery, AdminUsersQueryVariables> = gql`
  query AdminUsers($filter: AdminUsersFilterInput) {
    adminUsers(filter: $filter) {
      items {
        ...AdminUserFields
      }
      total
      page
      limit
    }
  }
  ${ADMIN_USER_FIELDS}
`;

export const ADMIN_USER_QUERY: TypedDocumentNode<AdminUserQuery, AdminUserQueryVariables> = gql`
  query AdminUser($id: ID!) {
    adminUser(id: $id) {
      ...AdminUserFields
    }
  }
  ${ADMIN_USER_FIELDS}
`;

export const ADMIN_STATS_QUERY: TypedDocumentNode<AdminStatsQuery, AdminStatsQueryVariables> = gql`
  query AdminStats {
    adminStats {
      totalUsers
      freeUsers
      proUsers
      provisionedProUsers
      adminUsers
      newUsersLast30Days
      activeSubscriptions
    }
  }
`;

export const ADMIN_AUDIT_LOGS_QUERY: TypedDocumentNode<
  AdminAuditLogsQuery,
  AdminAuditLogsQueryVariables
> = gql`
  query AdminAuditLogs($filter: AdminAuditLogFilterInput) {
    adminAuditLogs(filter: $filter) {
      items {
        id
        action
        metadata
        createdAt
        actor {
          id
          name
          email
        }
        targetUser {
          id
          name
          email
        }
      }
      total
      page
      limit
    }
  }
`;

export const PROVISION_PRO_MUTATION: TypedDocumentNode<
  ProvisionProMutation,
  ProvisionProMutationVariables
> = gql`
  mutation ProvisionPro($input: ProvisionProInput!) {
    provisionPro(input: $input) {
      ...AdminUserFields
    }
  }
  ${ADMIN_USER_FIELDS}
`;

export const DEPROVISION_PRO_MUTATION: TypedDocumentNode<
  DeprovisionProMutation,
  DeprovisionProMutationVariables
> = gql`
  mutation DeprovisionPro($userId: ID!) {
    deprovisionPro(userId: $userId) {
      ...AdminUserFields
    }
  }
  ${ADMIN_USER_FIELDS}
`;

export const SET_USER_ROLE_MUTATION: TypedDocumentNode<
  SetUserRoleMutation,
  SetUserRoleMutationVariables
> = gql`
  mutation SetUserRole($input: SetUserRoleInput!) {
    setUserRole(input: $input) {
      ...AdminUserFields
    }
  }
  ${ADMIN_USER_FIELDS}
`;
