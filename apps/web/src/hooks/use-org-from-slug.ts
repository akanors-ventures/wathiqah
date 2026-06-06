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

function needsSwitch(
  slug: string,
  activeOrgId: string | undefined,
  myOrgs: Array<{ id: string; slug: string }>,
): boolean {
  const targetOrg = myOrgs.find((o) => o.slug === slug);
  if (!targetOrg) return false;
  return !(activeOrgId === targetOrg.id && getJwtActiveOrgId() === targetOrg.id);
}

/**
 * Ensures the active-org JWT matches the org identified by the URL slug.
 *
 * Returns { isSyncing } so callers can gate rendering until the JWT is
 * correct — preventing a flash of org-A's data when navigating to org-B.
 *
 * Two cases are handled:
 *   1. User navigates directly to /org/beta/events while org A is active.
 *   2. The access token was refreshed and lost its activeOrgId field.
 */
export function useOrgFromSlug(slug: string): { isSyncing: boolean } {
  const { activeOrg, myOrgs, switchToOrg } = useOrgContext();
  const switchingRef = useRef(false);

  // Initialise synchronously so the FIRST render already knows whether a
  // switch is needed — prevents a brief flash with the wrong org's data.
  const [isSyncing, setIsSyncing] = useState(() => needsSwitch(slug, activeOrg?.id, myOrgs));

  useEffect(() => {
    const targetOrg = myOrgs.find((o) => o.slug === slug);
    if (!targetOrg) {
      setIsSyncing(false);
      return;
    }

    const contextMatches = activeOrg?.id === targetOrg.id;
    const jwtMatches = getJwtActiveOrgId() === targetOrg.id;

    if (contextMatches && jwtMatches) {
      switchingRef.current = false;
      setIsSyncing(false);
      return;
    }

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
  }, [slug, activeOrg?.id, myOrgs, switchToOrg]);

  return { isSyncing };
}
