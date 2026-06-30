import { useEffect, useState } from "react";
import { useOrgContext } from "@/context/OrgContext";
import { useOrgFromSlug } from "@/hooks/use-org-from-slug";
import type { MyOrganisationsQuery } from "@/types/__generated__/graphql";

type OrgItem = MyOrganisationsQuery["myOrganisations"][number];

interface UseOrgBySlugResult {
  org: OrgItem | null;
  isLoading: boolean;
  notFound: boolean;
  refetch: () => Promise<unknown>;
}

/**
 * Resolves the org for a URL slug from OrgContext's `myOrgs` — the single
 * shared MY_ORGANISATIONS_QUERY watcher for the whole app.
 *
 * An earlier version of this hook ran its own separate `useQuery` alongside
 * OrgContext's. Two independent Apollo watchers for the same query can
 * observe different cache snapshots for a brief window: e.g. right after
 * something elsewhere (the account-switcher dropdown, a just-completed
 * createOrganisation/acceptAccess) kicks off a refetch, a freshly-mounted
 * `cache-first` watcher on a new page reads the *stale* cached result
 * immediately (`loading: false`) instead of waiting for that in-flight
 * fetch — because cache-first has no concept of "wait for a concurrent
 * fetch elsewhere." That produced an intermittent false "not found" that
 * only cleared on a second click or a full reload. Reading from one shared
 * source removes that race structurally: every consumer (dropdown, members
 * page, settings page) observes the exact same loading/data state at once.
 *
 * We still don't trust a single "not found" read at face value — mutations
 * that grant org access don't synchronously update the cache, so there's a
 * narrow window where `myOrgs` is genuinely loaded but missing an org the
 * user just gained. One confirmatory refetch (shared via OrgContext) closes
 * that window before reporting notFound.
 */
export function useOrgBySlug(slug: string): UseOrgBySlugResult {
  const { isSyncing } = useOrgFromSlug(slug);
  const { myOrgs, loadingOrgs, refetchOrgs } = useOrgContext();

  const org = myOrgs.find((o) => o.slug === slug) ?? null;
  const isLoadingBase = isSyncing || loadingOrgs;

  const [confirmation, setConfirmation] = useState<{ slug: string; done: boolean }>({
    slug: "",
    done: false,
  });

  useEffect(() => {
    if (org || isLoadingBase) return;
    if (confirmation.slug === slug) return;
    setConfirmation({ slug, done: false });
    refetchOrgs().finally(() => setConfirmation({ slug, done: true }));
  }, [org, isLoadingBase, slug, refetchOrgs, confirmation.slug]);

  const confirmedMissing = confirmation.slug === slug && confirmation.done;

  return {
    org,
    isLoading: isLoadingBase || (!org && !confirmedMissing),
    notFound: !org && confirmedMissing,
    refetch: refetchOrgs,
  };
}
