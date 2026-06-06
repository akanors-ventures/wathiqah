import { useEffect, useRef } from "react";
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
 * Ensures the active-org JWT matches the org identified by the URL slug.
 *
 * Two cases are handled:
 *   1. User navigates directly to /org/beta/events while org A is active
 *      → switches JWT to beta so backend @ActiveOrg() queries target beta.
 *   2. The access token was refreshed (expiry) and the new token lost its
 *      activeOrgId field → re-issues the token with the correct org.
 *
 * Called on every org-scoped page. Works together with AccountSwitcher which
 * navigates to the destination org's page AFTER the switch completes, so by
 * the time this hook runs the context already matches and no extra switch fires.
 */
export function useOrgFromSlug(slug: string): void {
  const { activeOrg, myOrgs, switchToOrg } = useOrgContext();
  const switchingRef = useRef(false);

  useEffect(() => {
    const targetOrg = myOrgs.find((o) => o.slug === slug);
    if (!targetOrg) return; // org not in user's list — page will show 404 via !org check

    const contextMatches = activeOrg?.id === targetOrg.id;
    const jwtMatches = getJwtActiveOrgId() === targetOrg.id;

    // Both context and JWT already correct — nothing to do.
    if (contextMatches && jwtMatches) {
      switchingRef.current = false;
      return;
    }

    // Prevent duplicate concurrent switches.
    if (switchingRef.current) return;

    switchingRef.current = true;
    switchToOrg(targetOrg.id)
      .then(() => {
        switchingRef.current = false;
      })
      .catch(() => {
        switchingRef.current = false;
      });
  }, [slug, activeOrg?.id, myOrgs, switchToOrg]);
}
