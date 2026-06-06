import { useEffect, useRef, useState } from "react";
import { useOrgContext } from "@/context/OrgContext";

/**
 * Read the activeOrgId claim from the access-token cookie without verifying
 * the signature (client-side, read-only). Returns null if absent or invalid.
 */
function getJwtActiveOrgId(): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(/(?:^|; )accessToken=([^;]*)/);
  if (!match) return null;
  try {
    const parts = match[1].split(".");
    if (parts.length !== 3) return null;
    const payload = JSON.parse(atob(parts[1])) as Record<string, unknown>;
    return typeof payload.activeOrgId === "string" ? payload.activeOrgId : null;
  } catch {
    return null;
  }
}

/**
 * The JWT cookie is set synchronously via document.cookie inside switchToOrg,
 * before React commits setActiveOrgId(). React 18 concurrent rendering can
 * show the new route component with a stale activeOrg snapshot while the JWT
 * cookie already has the correct org. Using the JWT (not React state) as the
 * source of truth avoids a spurious isSyncing = true → BrandLoader cycle.
 */
function jwtNeedsSwitch(slug: string, myOrgs: Array<{ id: string; slug: string }>): boolean {
  const targetOrg = myOrgs.find((o) => o.slug === slug);
  if (!targetOrg) return false;
  return getJwtActiveOrgId() !== targetOrg.id;
}

/**
 * Ensures the active-org JWT matches the org identified by the URL slug.
 *
 * Returns { isSyncing } so callers can gate rendering until the JWT is
 * correct — preventing a flash of org-A's data when navigating to org-B.
 *
 * Cases handled:
 *   1. User navigates directly to /org/beta/events while org A is active.
 *   2. The access token was refreshed and lost its activeOrgId field.
 *
 * NOT triggered when the JWT is already correct (even if React context state
 * is momentarily stale), avoiding an unnecessary round-trip after a switch.
 */
export function useOrgFromSlug(slug: string): { isSyncing: boolean } {
  const { activeOrg, myOrgs, switchToOrg, autoSwitchBlocked } = useOrgContext();
  const switchingRef = useRef(false);

  // Initialise synchronously from the JWT (not React state) so the very
  // first render already reflects whether a switch is needed.
  const [isSyncing, setIsSyncing] = useState(() => jwtNeedsSwitch(slug, myOrgs));

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

    // JWT already carries the right org — no mutation needed.
    // Context state (activeOrg) may lag behind due to React batching; that's OK.
    if (getJwtActiveOrgId() === targetOrg.id) {
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
    // activeOrg?.id omitted — effect no longer reads it (checks JWT only).
    // autoSwitchBlocked is a stable ref object — safe to include in deps.
    // biome-ignore lint/correctness/useExhaustiveDependencies: activeOrg?.id intentionally omitted
  }, [slug, myOrgs, switchToOrg, autoSwitchBlocked]);

  return { isSyncing };
}
