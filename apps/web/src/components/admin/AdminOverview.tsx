import { Link } from "@tanstack/react-router";
import {
  BadgeCheck,
  CreditCard,
  ScrollText,
  ShieldCheck,
  Sparkles,
  UserPlus,
  Users,
} from "lucide-react";
import { StatsCard } from "@/components/dashboard/StatsCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useAdminAuditLogs, useAdminStats } from "@/hooks/useAdmin";
import { ActionBadge, actorName, formatDateTime } from "./admin-format";

function num(n?: number): string {
  return (n ?? 0).toLocaleString();
}

export function AdminOverview() {
  const { stats, loading } = useAdminStats();
  const { logs, loading: logsLoading } = useAdminAuditLogs({ page: 1, limit: 6 });

  if (loading && !stats) {
    return (
      <div className="space-y-8">
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {[1, 2, 3, 4].map((n) => (
            <Skeleton key={n} className="h-32 rounded-[24px]" />
          ))}
        </div>
        <Skeleton className="h-64 rounded-[24px]" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-black tracking-tight sm:text-3xl">Platform overview</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          A live snapshot of accounts, subscriptions, and recent admin activity.
        </p>
      </div>

      {/* Primary stats */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatsCard
          variant="primary"
          title="Total Users"
          value={num(stats?.totalUsers)}
          icon={<Users className="h-4 w-4" />}
          description="All registered accounts"
        />
        <StatsCard
          title="Pro Users"
          value={num(stats?.proUsers)}
          icon={<Sparkles className="h-4 w-4" />}
          description={`${num(stats?.provisionedProUsers)} admin-provisioned`}
        />
        <StatsCard
          title="New (30 days)"
          value={num(stats?.newUsersLast30Days)}
          icon={<UserPlus className="h-4 w-4" />}
          description="Signups in the last month"
        />
        <StatsCard
          title="Admins"
          value={num(stats?.adminUsers)}
          icon={<ShieldCheck className="h-4 w-4" />}
          description="Admin & super admin roles"
        />
      </div>

      {/* Secondary stats */}
      <div className="grid grid-cols-3 gap-3">
        <StatsCard
          compact
          title="Free Users"
          value={num(stats?.freeUsers)}
          icon={<Users className="h-4 w-4" />}
          description="On the free tier"
        />
        <StatsCard
          compact
          title="Provisioned Pro"
          value={num(stats?.provisionedProUsers)}
          icon={<BadgeCheck className="h-4 w-4" />}
          description="Complimentary grants"
        />
        <StatsCard
          compact
          title="Active Subs"
          value={num(stats?.activeSubscriptions)}
          icon={<CreditCard className="h-4 w-4" />}
          description="Active subscriptions"
        />
      </div>

      {/* Recent admin activity */}
      <Card className="rounded-[24px] border-border/50">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base font-black">
            <ScrollText className="h-4 w-4 text-indigo-500" />
            Recent admin activity
          </CardTitle>
          <Link
            to="/admin/audit"
            className="text-xs font-semibold text-indigo-600 hover:underline dark:text-indigo-400"
          >
            View all
          </Link>
        </CardHeader>
        <CardContent>
          {logsLoading && logs.length === 0 ? (
            <div className="space-y-2">
              {[1, 2, 3, 4].map((n) => (
                <Skeleton key={n} className="h-12 w-full rounded-lg" />
              ))}
            </div>
          ) : logs.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No admin actions recorded yet.
            </p>
          ) : (
            <ul className="divide-y divide-border/50">
              {logs.map((log) => (
                <li
                  key={log.id}
                  className="flex flex-wrap items-center gap-x-2 gap-y-1 py-3 text-sm"
                >
                  <ActionBadge action={log.action} />
                  <span className="font-semibold">{actorName(log.actor)}</span>
                  <span className="text-muted-foreground">→</span>
                  <span className="font-semibold">{actorName(log.targetUser)}</span>
                  <span className="ml-auto text-xs text-muted-foreground">
                    {formatDateTime(log.createdAt)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
