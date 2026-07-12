import { gql, type TypedDocumentNode } from "@apollo/client";
import type {
  AdminAuditLogsQuery,
  AdminAuditLogsQueryVariables,
  AdminCancelPlanMutation,
  AdminCancelPlanMutationVariables,
  AdminCreatePlanMutation,
  AdminCreatePlanMutationVariables,
  AdminPlansQuery,
  AdminPlansQueryVariables,
  AdminStatsQuery,
  AdminStatsQueryVariables,
  AdminSyncPlansMutation,
  AdminSyncPlansMutationVariables,
  AdminUpdatePlanMutation,
  AdminUpdatePlanMutationVariables,
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

export const ADMIN_PLAN_FIELDS = gql`
  fragment AdminPlanFields on PlanEntity {
    id
    tier
    interval
    currency
    amount
    name
    provider
    providerPlanId
    status
    createdAt
    updatedAt
  }
`;

export const ADMIN_PLANS_QUERY: TypedDocumentNode<AdminPlansQuery, AdminPlansQueryVariables> = gql`
  query AdminPlans {
    adminPlans {
      ...AdminPlanFields
    }
  }
  ${ADMIN_PLAN_FIELDS}
`;

export const ADMIN_SYNC_PLANS_MUTATION: TypedDocumentNode<
  AdminSyncPlansMutation,
  AdminSyncPlansMutationVariables
> = gql`
  mutation AdminSyncPlans {
    adminSyncPlans {
      ...AdminPlanFields
    }
  }
  ${ADMIN_PLAN_FIELDS}
`;

export const ADMIN_CREATE_PLAN_MUTATION: TypedDocumentNode<
  AdminCreatePlanMutation,
  AdminCreatePlanMutationVariables
> = gql`
  mutation AdminCreatePlan($input: CreatePlanInput!) {
    adminCreatePlan(input: $input) {
      ...AdminPlanFields
    }
  }
  ${ADMIN_PLAN_FIELDS}
`;

export const ADMIN_UPDATE_PLAN_MUTATION: TypedDocumentNode<
  AdminUpdatePlanMutation,
  AdminUpdatePlanMutationVariables
> = gql`
  mutation AdminUpdatePlan($id: ID!, $input: UpdatePlanInput!) {
    adminUpdatePlan(id: $id, input: $input) {
      ...AdminPlanFields
    }
  }
  ${ADMIN_PLAN_FIELDS}
`;

export const ADMIN_CANCEL_PLAN_MUTATION: TypedDocumentNode<
  AdminCancelPlanMutation,
  AdminCancelPlanMutationVariables
> = gql`
  mutation AdminCancelPlan($id: ID!) {
    adminCancelPlan(id: $id) {
      ...AdminPlanFields
    }
  }
  ${ADMIN_PLAN_FIELDS}
`;
