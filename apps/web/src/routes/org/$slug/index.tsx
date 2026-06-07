import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { BrandLoader } from "@/components/ui/page-loader";
import { useOrgFromSlug } from "@/hooks/use-org-from-slug";
import { authGuard } from "@/utils/auth";

export const Route = createFileRoute("/org/$slug/")({
  component: OrgSlugBridge,
  beforeLoad: (ctx) => authGuard({ location: ctx.location }),
});

/**
 * Bridge route: ensures the correct org JWT is active for the given slug, then
 * redirects to "/" where the unified dashboard renders org content.
 *
 * This keeps URL-based org switching working (e.g. clicking a bookmarked
 * /org/fam/ link switches to FAM context before landing on the dashboard).
 */
function OrgSlugBridge() {
  const { slug } = Route.useParams();
  const { isSyncing } = useOrgFromSlug(slug);
  const navigate = useNavigate();

  useEffect(() => {
    if (!isSyncing) {
      void navigate({ to: "/", replace: true });
    }
  }, [isSyncing, navigate]);

  return <BrandLoader />;
}
