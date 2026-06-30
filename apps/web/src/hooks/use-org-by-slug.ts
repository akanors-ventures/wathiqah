import { useQuery } from "@apollo/client/react";
import { useEffect, useState } from "react";
import { useOrgContext } from "@/context/OrgContext";
import { useOrgFromSlug } from "@/hooks/use-org-from-slug";
import { MY_ORGANISATIONS_QUERY } from "@/lib/apollo/queries/organisations";
import type { MyOrganisationsQuery } from "@/types/__generated__/graphql";

type OrgItem = MyOrganisationsQuery["myOrganisations"][number];

interface UseOrgBySlugResult {
  org: OrgItem | null;
  isLoading: boolean;
  notFound: boolean;
  refetch: () => Promise<unknown>;
}

/**
 * Resolves the org for a URL slug from the cached org list.
 *
 * Mutations that add/change org membership (createOrganisation, acceptAccess,
 * switchOrgContext's background refetchQueries) don't synchronously update
 * every MY_ORGANISATIONS_QUERY watcher's cache — there's a window where
 * `myOrgs` is genuinely loaded (loading: false) but still missing an org the
 * user just gained access to. Declaring "not found" in that window is a false
 * negative that only clears itself on the next unrelated refetch (e.g. a full
 * page reload). We close it by firing one confirmatory refetch before
 * reporting notFound, instead of trusting the first stale read.
 */
export function useOrgBySlug(slug: string): UseOrgBySlugResult {
  const { isSyncing } = useOrgFromSlug(slug);
  const { myOrgs, loadingOrgs } = useOrgContext();
  const { data, loading: loadingOrgQuery, refetch } = useQuery(MY_ORGANISATIONS_QUERY);

  const org =
    myOrgs.find((o) => o.slug === slug) ??
    data?.myOrganisations.find((o) => o.slug === slug) ??
    null;

  const isLoading = isSyncing || loadingOrgs || loadingOrgQuery;

  const [confirmation, setConfirmation] = useState<{ slug: string; done: boolean }>({
    slug: "",
    done: false,
  });

  useEffect(() => {
    if (org || isLoading) return;
    if (confirmation.slug === slug) return;
    setConfirmation({ slug, done: false });
    refetch().finally(() => setConfirmation({ slug, done: true }));
  }, [org, isLoading, slug, refetch, confirmation.slug]);

  const confirmedMissing = confirmation.slug === slug && confirmation.done;

  return {
    org,
    isLoading: isLoading || (!org && !confirmedMissing),
    notFound: !org && confirmedMissing,
    refetch,
  };
}
