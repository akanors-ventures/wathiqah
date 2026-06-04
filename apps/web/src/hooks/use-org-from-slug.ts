import { useEffect, useRef } from "react";
import { useOrgContext } from "@/context/OrgContext";

/**
 * Ensures the active org JWT matches the org identified by the URL slug.
 * Without this, navigating directly to /org/acme/settings while a different
 * org is active would show correct display data but mutations would target
 * the wrong org (via JWT-scoped @ActiveOrg() on the backend).
 */
export function useOrgFromSlug(slug: string): void {
  const { activeOrg, myOrgs, switchToOrg } = useOrgContext();
  const switchingRef = useRef(false);

  useEffect(() => {
    // Already on the correct org
    if (activeOrg?.slug === slug) {
      switchingRef.current = false;
      return;
    }
    // Prevent duplicate concurrent switches
    if (switchingRef.current) return;

    const targetOrg = myOrgs.find((o) => o.slug === slug);
    if (!targetOrg) return; // org not in user's list — page will handle 404 via !org check

    switchingRef.current = true;
    switchToOrg(targetOrg.id).catch(() => {
      switchingRef.current = false;
    });
  }, [slug, activeOrg?.slug, myOrgs, switchToOrg]);
}
