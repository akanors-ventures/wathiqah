import { useOrgContext } from "@/context/OrgContext";

/**
 * Convenience hook — returns the active org and a boolean indicating org mode.
 * Components that only need the active org (not the full list) use this.
 */
export function useActiveOrg() {
  const { activeOrg, isOrgMode, switchToOrg } = useOrgContext();
  return { activeOrg, isOrgMode, switchToOrg };
}
