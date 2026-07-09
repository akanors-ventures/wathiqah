import { useMutation, useQuery } from "@apollo/client/react";
import {
  ADMIN_AUDIT_LOGS_QUERY,
  ADMIN_STATS_QUERY,
  ADMIN_USER_QUERY,
  ADMIN_USERS_QUERY,
  DEPROVISION_PRO_MUTATION,
  PROVISION_PRO_MUTATION,
  SET_USER_ROLE_MUTATION,
} from "@/lib/apollo/queries/admin";
import type {
  AdminAuditLogFilterInput,
  AdminUsersFilterInput,
  ProvisionProInput,
  SetUserRoleInput,
} from "@/types/__generated__/graphql";

const ADMIN_REFETCH = ["AdminUsers", "AdminUser", "AdminStats", "AdminAuditLogs"];

export function useAdminStats() {
  const { data, loading, error, refetch } = useQuery(ADMIN_STATS_QUERY, {
    fetchPolicy: "cache-and-network",
  });
  return { stats: data?.adminStats, loading, error, refetch };
}

export function useAdminUsers(filter: AdminUsersFilterInput) {
  const { data, loading, error, refetch } = useQuery(ADMIN_USERS_QUERY, {
    variables: { filter },
    fetchPolicy: "cache-and-network",
  });
  return {
    users: data?.adminUsers.items ?? [],
    total: data?.adminUsers.total ?? 0,
    page: data?.adminUsers.page ?? 1,
    limit: data?.adminUsers.limit ?? 25,
    loading,
    error,
    refetch,
  };
}

export function useAdminUser(id: string) {
  const { data, loading, error, refetch } = useQuery(ADMIN_USER_QUERY, {
    variables: { id },
    fetchPolicy: "cache-and-network",
    skip: !id,
  });
  return { user: data?.adminUser, loading, error, refetch };
}

export function useAdminAuditLogs(filter: AdminAuditLogFilterInput) {
  const { data, loading, error, refetch } = useQuery(ADMIN_AUDIT_LOGS_QUERY, {
    variables: { filter },
    fetchPolicy: "cache-and-network",
  });
  return {
    logs: data?.adminAuditLogs.items ?? [],
    total: data?.adminAuditLogs.total ?? 0,
    page: data?.adminAuditLogs.page ?? 1,
    limit: data?.adminAuditLogs.limit ?? 25,
    loading,
    error,
    refetch,
  };
}

/**
 * Provision / deprovision Pro and role changes. Each mutation refetches the
 * admin surfaces (users list, detail, stats, audit log) so every view stays
 * consistent after an action.
 */
export function useAdminMutations() {
  const [provisionProMutation, { loading: provisioning }] = useMutation(PROVISION_PRO_MUTATION, {
    refetchQueries: ADMIN_REFETCH,
  });
  const [deprovisionProMutation, { loading: deprovisioning }] = useMutation(
    DEPROVISION_PRO_MUTATION,
    { refetchQueries: ADMIN_REFETCH },
  );
  const [setUserRoleMutation, { loading: settingRole }] = useMutation(SET_USER_ROLE_MUTATION, {
    refetchQueries: ADMIN_REFETCH,
  });

  return {
    provisionPro: (input: ProvisionProInput) => provisionProMutation({ variables: { input } }),
    deprovisionPro: (userId: string) => deprovisionProMutation({ variables: { userId } }),
    setUserRole: (input: SetUserRoleInput) => setUserRoleMutation({ variables: { input } }),
    provisioning,
    deprovisioning,
    settingRole,
  };
}
