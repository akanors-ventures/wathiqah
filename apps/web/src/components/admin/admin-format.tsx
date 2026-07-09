import { Crown, ShieldCheck, UserRound } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { AdminAction, UserRole } from "@/types/__generated__/graphql";

/** Human label for a global platform role. */
export const ROLE_LABEL: Record<UserRole, string> = {
  [UserRole.SuperAdmin]: "Super Admin",
  [UserRole.Admin]: "Admin",
  [UserRole.User]: "User",
};

const ROLE_STYLE: Record<UserRole, string> = {
  [UserRole.SuperAdmin]: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
  [UserRole.Admin]: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20",
  [UserRole.User]: "bg-muted text-muted-foreground border-border",
};

const ROLE_ICON: Record<UserRole, React.ElementType> = {
  [UserRole.SuperAdmin]: Crown,
  [UserRole.Admin]: ShieldCheck,
  [UserRole.User]: UserRound,
};

export function RoleBadge({ role, className }: { role: UserRole; className?: string }) {
  const Icon = ROLE_ICON[role];
  return (
    <Badge variant="outline" className={cn("gap-1 font-semibold", ROLE_STYLE[role], className)}>
      <Icon className="h-3 w-3" />
      {ROLE_LABEL[role]}
    </Badge>
  );
}

/** Label + accent for an audit-log action. */
export const ACTION_META: Record<AdminAction, { label: string; className: string }> = {
  [AdminAction.ProvisionPro]: {
    label: "Provisioned Pro",
    className: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
  },
  [AdminAction.DeprovisionPro]: {
    label: "Revoked Pro",
    className: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20",
  },
  [AdminAction.SetUserRole]: {
    label: "Changed role",
    className: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20",
  },
};

export function ActionBadge({ action }: { action: AdminAction }) {
  const meta = ACTION_META[action];
  return (
    <Badge variant="outline" className={cn("font-semibold", meta.className)}>
      {meta.label}
    </Badge>
  );
}

export function formatDateTime(value: string | Date): string {
  const date = typeof value === "string" ? new Date(value) : value;
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export function formatDate(value: string | Date): string {
  const date = typeof value === "string" ? new Date(value) : value;
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(date);
}

/** Display name for an audit-log actor/target (may be null if the user was removed). */
export function actorName(person?: { name?: string | null; email?: string | null } | null): string {
  return person?.name?.trim() || person?.email?.trim() || "Unknown user";
}

/** Initials for an avatar chip. */
export function initials(name?: string | null, email?: string | null): string {
  const source = name?.trim() || email?.trim() || "?";
  const parts = source.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return source.slice(0, 2).toUpperCase();
}
