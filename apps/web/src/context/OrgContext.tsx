import { useApolloClient, useMutation, useQuery } from "@apollo/client/react";
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  MY_ORGANISATIONS_QUERY,
  SWITCH_ORG_CONTEXT_MUTATION,
} from "@/lib/apollo/queries/organisations";
import type { Organisation } from "@/types/__generated__/graphql";

const ORG_STORAGE_KEY = "wathiqah_active_org_id";

interface OrgContextType {
  activeOrg: Organisation | null;
  myOrgs: Organisation[];
  loadingOrgs: boolean;
  switchToOrg: (orgId: string | null) => Promise<void>;
  isOrgMode: boolean;
}

const OrgContext = createContext<OrgContextType | null>(null);

export function OrgProvider({ children }: { children: ReactNode }) {
  const apolloClient = useApolloClient();
  const [activeOrgId, setActiveOrgId] = useState<string | null>(() =>
    localStorage.getItem(ORG_STORAGE_KEY),
  );

  const {
    data,
    loading: loadingOrgs,
    refetch,
  } = useQuery(MY_ORGANISATIONS_QUERY, {
    fetchPolicy: "cache-and-network",
  });

  const myOrgs = data?.myOrganisations ?? [];
  const activeOrg = myOrgs.find((o) => o.id === activeOrgId) ?? null;

  const [switchOrgContextMutation] = useMutation(SWITCH_ORG_CONTEXT_MUTATION);

  const switchToOrg = useCallback(
    async (orgId: string | null) => {
      const { data: switchData } = await switchOrgContextMutation({
        variables: { orgId },
      });

      if (!switchData?.switchOrgContext) return;

      const { accessToken, refreshToken } = switchData.switchOrgContext;

      // Store new tokens (same cookie approach as auth)
      document.cookie = `accessToken=${accessToken}; path=/; SameSite=Strict`;
      document.cookie = `refreshToken=${refreshToken}; path=/; SameSite=Strict`;

      // Persist active org selection
      if (orgId) {
        localStorage.setItem(ORG_STORAGE_KEY, orgId);
      } else {
        localStorage.removeItem(ORG_STORAGE_KEY);
      }
      setActiveOrgId(orgId);

      // Refetch all active Apollo queries so pages see org-scoped data
      await apolloClient.refetchQueries({ include: "active" });
    },
    [switchOrgContextMutation, apolloClient],
  );

  const value = useMemo(
    () => ({
      activeOrg,
      myOrgs,
      loadingOrgs,
      switchToOrg,
      isOrgMode: activeOrg !== null,
    }),
    [activeOrg, myOrgs, loadingOrgs, switchToOrg],
  );

  return <OrgContext.Provider value={value}>{children}</OrgContext.Provider>;
}

export function useOrgContext() {
  const ctx = useContext(OrgContext);
  if (!ctx) throw new Error("useOrgContext must be used inside OrgProvider");
  return ctx;
}
