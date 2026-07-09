import { createFileRoute } from "@tanstack/react-router";
import { BadgeCheck, CreditCard, Sparkles } from "lucide-react";
import { AdminUsersTable } from "@/components/admin/AdminUsersTable";
import { StatsCard } from "@/components/dashboard/StatsCard";
import { Skeleton } from "@/components/ui/skeleton";
import { useAdminStats } from "@/hooks/useAdmin";
import { SubscriptionTier } from "@/types/__generated__/graphql";

export const Route = createFileRoute("/admin/subscriptions")({
  component: SubscriptionsPage,
});

function SubscriptionsPage() {
  const { stats, loading } = useAdminStats();
  const num = (n?: number) => (n ?? 0).toLocaleString();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-black tracking-tight sm:text-3xl">Subscriptions</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Pro members and admin-provisioned access. Provision, extend, or revoke Pro from any row.
        </p>
      </div>

      {loading && !stats ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {[1, 2, 3].map((n) => (
            <Skeleton key={n} className="h-32 rounded-[24px]" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <StatsCard
            variant="primary"
            title="Pro Users"
            value={num(stats?.proUsers)}
            icon={<Sparkles className="h-4 w-4" />}
            description="On the Pro tier"
          />
          <StatsCard
            title="Provisioned"
            value={num(stats?.provisionedProUsers)}
            icon={<BadgeCheck className="h-4 w-4" />}
            description="Complimentary admin grants"
          />
          <StatsCard
            title="Active Subscriptions"
            value={num(stats?.activeSubscriptions)}
            icon={<CreditCard className="h-4 w-4" />}
            description="Currently active"
          />
        </div>
      )}

      <AdminUsersTable lockedTier={SubscriptionTier.Pro} />
    </div>
  );
}
