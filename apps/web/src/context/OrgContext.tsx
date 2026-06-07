import { useApolloClient, useMutation, useQuery } from "@apollo/client/react";
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  MY_ORGANISATIONS_QUERY,
  SWITCH_ORG_CONTEXT_MUTATION,
} from "@/lib/apollo/queries/organisations";
import { suppressForbiddenFor } from "@/lib/apollo-links";
import type { MyOrganisationsQuery } from "@/types/__generated__/graphql";

// Full org type as returned by MY_ORGANISATIONS_QUERY — includes members array.
type OrgItem = MyOrganisationsQuery["myOrganisations"][number];

const ORG_STORAGE_KEY = "wathiqah_active_org_id";

/**
 * Read the non-httpOnly activeOrgId signal cookie set by the backend on every
 * auth mutation. Returns null if absent or blank (= personal mode).
 */
function getActiveOrgIdSignal(): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(/(?:^|; )activeOrgId=([^;]*)/);
  if (!match) return null;
  const val = decodeURIComponent(match[1]);
  return val || null;
}

interface OrgContextType {
  activeOrg: OrgItem | null;
  myOrgs: OrgItem[];
  loadingOrgs: boolean;
  switchToOrg: (orgId: string | null) => Promise<void>;
  isOrgMode: boolean;
  /**
   * Call before an explicit user-initiated org switch. Prevents
   * useOrgFromSlug from counter-switching during the transition.
   */
  blockAutoSwitch: () => void;
  /**
   * Call after the switch + navigation completes (or on error).
   */
  unblockAutoSwitch: () => void;
  /** Ref — true while an explicit switch + navigate is in progress. */
  autoSwitchBlocked: React.MutableRefObject<boolean>;
}

const OrgContext = createContext<OrgContextType | null>(null);

export function OrgProvider({ children }: { children: ReactNode }) {
  const apolloClient = useApolloClient();
  const [activeOrgId, setActiveOrgId] = useState<string | null>(() =>
    typeof window !== "undefined" ? localStorage.getItem(ORG_STORAGE_KEY) : null,
  );

  const { data, loading: loadingOrgs } = useQuery(MY_ORGANISATIONS_QUERY, {
    fetchPolicy: "cache-and-network",
  });

  const myOrgs = data?.myOrganisations ?? [];
  const activeOrg = myOrgs.find((o) => o.id === activeOrgId) ?? null;

  const [switchOrgContextMutation] = useMutation(SWITCH_ORG_CONTEXT_MUTATION);

  // When true, useOrgFromSlug must not auto-switch. Set by AccountSwitcher
  // before an explicit user-initiated switch to prevent counter-switching
  // (the hook detects the JWT change before navigate() fires).
  const autoSwitchBlocked = useRef(false);
  const blockAutoSwitch = useCallback(() => {
    autoSwitchBlocked.current = true;
  }, []);
  const unblockAutoSwitch = useCallback(() => {
    autoSwitchBlocked.current = false;
  }, []);

  const switchToOrg = useCallback(
    async (orgId: string | null) => {
      // Suppress FORBIDDEN toasts for 3 s. Org queries that are still active
      // when refetchQueries fires may briefly hit the backend with the old JWT
      // and return FORBIDDEN — that's expected during the transition window.
      suppressForbiddenFor(3000);

      const { data: switchData } = await switchOrgContextMutation({
        variables: { orgId },
      });

      if (!switchData?.switchOrgContext) return;

      // The server sets httpOnly accessToken and refreshToken cookies on the
      // GraphQL response. We don't need to set them from JS.

      // Persist active org selection
      if (orgId) {
        localStorage.setItem(ORG_STORAGE_KEY, orgId);
      } else {
        localStorage.removeItem(ORG_STORAGE_KEY);
      }
      setActiveOrgId(orgId);

      // Kick off a background refetch so pages see org-scoped data.
      // Do NOT await — the caller (AccountSwitcher) navigates immediately
      // after this returns. The new route's own queries will load fresh
      // data; stale personal-mode cache for OTHER routes is cleared in
      // the background without blocking the navigation.
      void apolloClient.refetchQueries({ include: "active" });
    },
    [switchOrgContextMutation, apolloClient],
  );

  // Restore org-scoped JWT after a token refresh.
  // When the Apollo error-link refreshes the access token (expiry), the new
  // token lacks activeOrgId. This effect re-issues it once on mount.
  // Skip when the JWT already has the correct org (avoids a mutation every load).
  const hasAttemptedRestoration = useRef(false);

  useEffect(() => {
    if (hasAttemptedRestoration.current) return;
    if (!activeOrgId) return;
    if (loadingOrgs) return;

    const orgExists = myOrgs.some((o) => o.id === activeOrgId);
    if (!orgExists) {
      localStorage.removeItem(ORG_STORAGE_KEY);
      setActiveOrgId(null);
      hasAttemptedRestoration.current = true;
      return;
    }

    if (getActiveOrgIdSignal() === activeOrgId) {
      hasAttemptedRestoration.current = true;
      return;
    }

    hasAttemptedRestoration.current = true;
    switchToOrg(activeOrgId).catch(() => {
      localStorage.removeItem(ORG_STORAGE_KEY);
      setActiveOrgId(null);
    });
  }, [activeOrgId, loadingOrgs, myOrgs, switchToOrg]);

  const value = useMemo(
    () => ({
      activeOrg,
      myOrgs,
      loadingOrgs,
      switchToOrg,
      isOrgMode: activeOrg !== null,
      blockAutoSwitch,
      unblockAutoSwitch,
      autoSwitchBlocked,
    }),
    [activeOrg, myOrgs, loadingOrgs, switchToOrg, blockAutoSwitch, unblockAutoSwitch],
  );

  return <OrgContext.Provider value={value}>{children}</OrgContext.Provider>;
}

export function useOrgContext() {
  const ctx = useContext(OrgContext);
  if (!ctx) throw new Error("useOrgContext must be used inside OrgProvider");
  return ctx;
}
