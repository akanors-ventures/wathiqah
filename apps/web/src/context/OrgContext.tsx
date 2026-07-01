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
  /** Force a fresh fetch of the org list — call when the user is about to look at it. */
  refetchOrgs: () => Promise<unknown>;
  /**
   * Sync the local activeOrgId (React state + localStorage) to match a
   * server context that's already correct, without calling switchOrgContext.
   * Use when the JWT/signal cookie already has the right org but local
   * bookkeeping hasn't caught up (e.g. a different tab switched orgs, or
   * localStorage was cleared independently of the cookie).
   */
  syncActiveOrgId: (orgId: string | null) => void;
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

  const {
    data,
    loading: loadingOrgs,
    refetch: refetchOrgs,
  } = useQuery(MY_ORGANISATIONS_QUERY, {
    fetchPolicy: "cache-and-network",
  });

  // Sticky orgs list: once populated, never falls back to [] due to a transient
  // refetch error (e.g. a FORBIDDEN on a @ResolveField during a JWT switch).
  // Only a successful non-empty response can update the list.
  const [myOrgs, setMyOrgs] = useState<OrgItem[]>([]);
  useEffect(() => {
    if (data?.myOrganisations && data.myOrganisations.length > 0) {
      setMyOrgs(data.myOrganisations);
    }
  }, [data?.myOrganisations]);

  const activeOrg = myOrgs.find((o) => o.id === activeOrgId) ?? null;

  const syncActiveOrgId = useCallback((orgId: string | null) => {
    if (orgId) {
      localStorage.setItem(ORG_STORAGE_KEY, orgId);
    } else {
      localStorage.removeItem(ORG_STORAGE_KEY);
    }
    setActiveOrgId(orgId);
  }, []);

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
      syncActiveOrgId(orgId);

      // Kick off a background refetch so pages see org-scoped data.
      // Do NOT await — the caller (AccountSwitcher) navigates immediately
      // after this returns. The new route's own queries will load fresh
      // data; stale personal-mode cache for OTHER routes is cleared in
      // the background without blocking the navigation.
      void apolloClient.refetchQueries({ include: "active" });
    },
    [switchOrgContextMutation, apolloClient, syncActiveOrgId],
  );

  // Reconcile local activeOrgId against the server's signal cookie once on
  // app boot. Two directions can drift out of sync independently of each
  // other (e.g. another tab switched orgs, localStorage was cleared without
  // the cookie being cleared, or a token refresh produced a JWT that lost
  // its activeOrgId claim):
  //   - Cookie has an org our local state doesn't know about yet: repair
  //     locally (no mutation — the server is already correct). Previously
  //     this case had NO repair path at all on non-org-slug routes (e.g.
  //     the dashboard), leaving the header stuck showing personal mode
  //     indefinitely despite an org JWT actually being active.
  //   - Local state has an org the cookie doesn't: re-issue it via
  //     switchToOrg (mutation) — typically a token refresh that dropped
  //     the org claim.
  const hasAttemptedRestoration = useRef(false);

  useEffect(() => {
    if (hasAttemptedRestoration.current) return;
    if (loadingOrgs) return;

    const signalOrgId = getActiveOrgIdSignal();
    // Read straight from this render's query result, not the sticky
    // `myOrgs` state — `myOrgs` is set by a separate effect and lags one
    // render behind `data` on first load, which would make these checks
    // wrongly report "not found" and permanently give up (the one-shot
    // guard below never gets a second chance) before `myOrgs` catches up.
    const currentOrgs = data?.myOrganisations ?? myOrgs;

    if (signalOrgId && signalOrgId !== activeOrgId) {
      const signalOrgExists = currentOrgs.some((o) => o.id === signalOrgId);
      if (signalOrgExists) {
        hasAttemptedRestoration.current = true;
        syncActiveOrgId(signalOrgId);
        return;
      }
      // Signal points at an org not yet in myOrgs (still loading/stale) —
      // don't wipe local state on this alone; fall through.
    }

    if (!activeOrgId) {
      // Only abort permanently when there's nothing to wait for. If signalOrgId
      // is set but the org wasn't in the stale cache yet (fell through above),
      // don't set the one-shot guard — the effect must re-run when the network
      // response arrives with the correct org list.
      if (!signalOrgId) {
        hasAttemptedRestoration.current = true;
      }
      return;
    }

    const orgExists = currentOrgs.some((o) => o.id === activeOrgId);
    if (!orgExists) {
      syncActiveOrgId(null);
      hasAttemptedRestoration.current = true;
      return;
    }

    if (signalOrgId === activeOrgId) {
      hasAttemptedRestoration.current = true;
      return;
    }

    hasAttemptedRestoration.current = true;
    switchToOrg(activeOrgId).catch(() => {
      syncActiveOrgId(null);
    });
  }, [activeOrgId, loadingOrgs, myOrgs, data?.myOrganisations, switchToOrg, syncActiveOrgId]);

  const value = useMemo(
    () => ({
      activeOrg,
      myOrgs,
      loadingOrgs,
      switchToOrg,
      refetchOrgs,
      syncActiveOrgId,
      isOrgMode: activeOrg !== null,
      blockAutoSwitch,
      unblockAutoSwitch,
      autoSwitchBlocked,
    }),
    [
      activeOrg,
      myOrgs,
      loadingOrgs,
      switchToOrg,
      refetchOrgs,
      syncActiveOrgId,
      blockAutoSwitch,
      unblockAutoSwitch,
    ],
  );

  return <OrgContext.Provider value={value}>{children}</OrgContext.Provider>;
}

export function useOrgContext() {
  const ctx = useContext(OrgContext);
  if (!ctx) throw new Error("useOrgContext must be used inside OrgProvider");
  return ctx;
}
