import { useEffect, useRef, useState } from "react";
import { useOrgContext } from "@/context/OrgContext";

/**
 * Read the activeOrgId from the non-httpOnly signal cookie set by the backend
 * alongside every auth mutation (login, switchOrgContext, refreshToken, etc.).
 * Returns null if absent or blank (= personal mode).
 *
 * We use a dedicated signal cookie instead of decoding the accessToken JWT
 * because the JWT is httpOnly (unreadable from JS for security).
 */
export function getActiveOrgIdSignal(): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(/(?:^|; )activeOrgId=([^;]*)/);
  if (!match) return null;
  const val = decodeURIComponent(match[1]);
  return val || null;
}

/**
 * Returns true when the server-side org context (signal cookie) does not yet
 * match the org identified by the URL slug. Used to gate page renders until
 * the correct org JWT is in place.
 *
 * Falls back to comparing against React state (activeOrg) when the signal
 * cookie is absent — e.g., before the user's first explicit switch after
 * login.
 */
function needsSwitch(
  slug: string,
  myOrgs: Array<{ id: string; slug: string }>,
  activeOrgId: string | null,
): boolean {
  const targetOrg = myOrgs.find((o) => o.slug === slug);
  if (!targetOrg) return false;

  // Primary: signal cookie — set by backend on every auth mutation.
  const signalOrgId = getActiveOrgIdSignal();
  if (signalOrgId !== null) {
    return signalOrgId !== targetOrg.id;
  }

  // Fallback: React state (may be momentarily stale after a switch, but
  // autoSwitchBlocked handles that window).
  return activeOrgId !== targetOrg.id;
}

/**
 * Ensures the active-org JWT matches the org identified by the URL slug.
 *
 * Returns { isSyncing } so callers can gate rendering until the JWT is
 * correct — preventing a flash of wrong-org data on direct navigation.
 *
 * Cases handled:
 *   1. User navigates directly to /org/beta/events while org A is active.
 *   2. The access token was refreshed and lost its activeOrgId claim.
 *
 * NOT triggered when the signal cookie already matches (avoids a redundant
 * round-trip after an AccountSwitcher-initiated switch).
 */
export function useOrgFromSlug(slug: string): { isSyncing: boolean } {
  const { myOrgs, activeOrg, switchToOrg, autoSwitchBlocked } = useOrgContext();
  const switchingRef = useRef(false);

  // Initialise synchronously so the very first render reflects reality.
  const [isSyncing, setIsSyncing] = useState(
    () => !autoSwitchBlocked.current && needsSwitch(slug, myOrgs, activeOrg?.id ?? null),
  );

  useEffect(() => {
    // An explicit AccountSwitcher switch is in progress — don't counter-switch.
    if (autoSwitchBlocked.current) {
      setIsSyncing(false);
      return;
    }

    const targetOrg = myOrgs.find((o) => o.slug === slug);
    if (!targetOrg) {
      setIsSyncing(false);
      return;
    }

    // Signal cookie matches — server already has the right context.
    const signalOrgId = getActiveOrgIdSignal();
    if (signalOrgId !== null && signalOrgId === targetOrg.id) {
      // Sync React state to match if it hasn't caught up yet.
      if (activeOrg?.id !== targetOrg.id) {
        // React state is stale but server is fine; just wait for it to commit.
        // No mutation needed.
      }
      switchingRef.current = false;
      setIsSyncing(false);
      return;
    }

    // No signal cookie yet (first login ever, before first explicit switch),
    // or signal says wrong org: fall back to React state.
    if (signalOrgId === null && activeOrg?.id === targetOrg.id) {
      switchingRef.current = false;
      setIsSyncing(false);
      return;
    }

    // Prevent duplicate concurrent switches.
    if (switchingRef.current) return;

    switchingRef.current = true;
    setIsSyncing(true);
    switchToOrg(targetOrg.id)
      .then(() => {
        switchingRef.current = false;
        setIsSyncing(false);
      })
      .catch(() => {
        switchingRef.current = false;
        setIsSyncing(false);
      });
  }, [slug, myOrgs, activeOrg, switchToOrg, autoSwitchBlocked]);

  return { isSyncing };
}
