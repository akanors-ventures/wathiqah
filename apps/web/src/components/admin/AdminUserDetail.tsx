import { Link } from "@tanstack/react-router";
import { ArrowLeft, ChevronDown, Mail, Phone, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { TierBadge } from "@/components/ui/tier-badge";
import { useAdminUser } from "@/hooks/useAdmin";
import { formatDate, initials, RoleBadge } from "./admin-format";
import { UserActionsMenu } from "./UserActionsMenu";

function Row({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-3 py-3">
      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted text-muted-foreground">
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0">
        <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground/60">
          {label}
        </p>
        <p className="truncate font-medium">{value}</p>
      </div>
    </div>
  );
}

export function AdminUserDetail({ userId }: { userId: string }) {
  const { user, loading, error } = useAdminUser(userId);

  const back = (
    <Link
      to="/admin/users"
      className="mb-6 inline-flex items-center gap-1.5 text-sm font-semibold text-muted-foreground hover:text-foreground"
    >
      <ArrowLeft className="h-4 w-4" />
      Back to users
    </Link>
  );

  if (loading && !user) {
    return (
      <div>
        {back}
        <Skeleton className="h-72 w-full max-w-2xl rounded-[24px]" />
      </div>
    );
  }

  if (error || !user) {
    return (
      <div>
        {back}
        <p className="text-sm text-muted-foreground">User not found. They may have been removed.</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl">
      {back}

      <Card className="overflow-hidden rounded-[24px] border-border/50">
        <CardHeader className="gap-4 bg-indigo-50/50 dark:bg-indigo-950/20">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-500/10 text-lg font-black text-indigo-600 dark:text-indigo-400">
                {initials(user.name, user.email)}
              </div>
              <div className="min-w-0">
                <CardTitle className="text-xl font-black tracking-tight">{user.name}</CardTitle>
                <p className="truncate text-sm text-muted-foreground">{user.email}</p>
                <div className="mt-2 flex items-center gap-2">
                  <RoleBadge role={user.role} />
                  <TierBadge tier={user.tier} />
                </div>
              </div>
            </div>
            <UserActionsMenu
              user={user}
              trigger={
                <Button variant="outline" size="sm" className="gap-1.5">
                  Manage
                  <ChevronDown className="h-4 w-4" />
                </Button>
              }
            />
          </div>
        </CardHeader>
        <CardContent className="divide-y divide-border/50">
          <Row icon={Mail} label="Email" value={user.email} />
          {user.phoneNumber && <Row icon={Phone} label="Phone" value={user.phoneNumber} />}
          <Row icon={Wallet} label="Preferred currency" value={user.preferredCurrency} />
          <Row icon={Wallet} label="Joined" value={formatDate(user.createdAt)} />
        </CardContent>
      </Card>
    </div>
  );
}
