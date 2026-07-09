import { useNavigate } from "@tanstack/react-router";
import { Search, Users as UsersIcon } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { PaginationControls } from "@/components/ui/pagination-controls";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { TierBadge } from "@/components/ui/tier-badge";
import { useAdminUsers } from "@/hooks/useAdmin";
import { cn } from "@/lib/utils";
import { SubscriptionTier, UserRole } from "@/types/__generated__/graphql";
import { formatDate, initials, RoleBadge } from "./admin-format";
import { UserActionsMenu } from "./UserActionsMenu";

const ALL = "ALL";
const HEAD = "text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 h-12";

function Avatar({ name, email }: { name: string; email: string }) {
  return (
    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-indigo-500/10 text-[11px] font-black text-indigo-600 dark:text-indigo-400">
      {initials(name, email)}
    </div>
  );
}

export function AdminUsersTable({ lockedTier }: { lockedTier?: SubscriptionTier }) {
  const navigate = useNavigate();
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [role, setRole] = useState<string>(ALL);
  const [tier, setTier] = useState<string>(lockedTier ?? ALL);
  const [page, setPage] = useState(1);

  // Debounce the search box so we don't refetch on every keystroke.
  useEffect(() => {
    const t = setTimeout(() => {
      setSearch(searchInput);
      setPage(1);
    }, 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  const filter = useMemo(
    () => ({
      search: search || undefined,
      role: role === ALL ? undefined : (role as UserRole),
      tier: tier === ALL ? undefined : (tier as SubscriptionTier),
      page,
      limit: 20,
    }),
    [search, role, tier, page],
  );

  const { users, total, limit, loading } = useAdminUsers(filter);

  function goToUser(id: string) {
    navigate({ to: "/admin/users/$userId", params: { userId: id } });
  }

  return (
    <Card className="rounded-[24px] border-border/50">
      <CardHeader className="gap-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative flex-1 sm:max-w-xs">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search name or email…"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="flex items-center gap-2">
            <Select
              value={role}
              onValueChange={(v) => {
                setRole(v);
                setPage(1);
              }}
            >
              <SelectTrigger className="w-[130px]">
                <SelectValue placeholder="Role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>All roles</SelectItem>
                <SelectItem value={UserRole.User}>User</SelectItem>
                <SelectItem value={UserRole.Admin}>Admin</SelectItem>
                <SelectItem value={UserRole.SuperAdmin}>Super Admin</SelectItem>
              </SelectContent>
            </Select>
            {!lockedTier && (
              <Select
                value={tier}
                onValueChange={(v) => {
                  setTier(v);
                  setPage(1);
                }}
              >
                <SelectTrigger className="w-[110px]">
                  <SelectValue placeholder="Tier" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>All tiers</SelectItem>
                  <SelectItem value={SubscriptionTier.Free}>Free</SelectItem>
                  <SelectItem value={SubscriptionTier.Pro}>Pro</SelectItem>
                </SelectContent>
              </Select>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {/* Desktop table */}
        <div className="hidden md:block">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className={HEAD}>User</TableHead>
                <TableHead className={HEAD}>Role</TableHead>
                <TableHead className={HEAD}>Tier</TableHead>
                <TableHead className={HEAD}>Joined</TableHead>
                <TableHead className={cn(HEAD, "text-right")}>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading && users.length === 0 ? (
                [1, 2, 3, 4, 5, 6].map((n) => (
                  <TableRow key={`sk-${n}`}>
                    <TableCell colSpan={5}>
                      <Skeleton className="h-9 w-full" />
                    </TableCell>
                  </TableRow>
                ))
              ) : users.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="py-16 text-center text-sm text-muted-foreground"
                  >
                    No users match these filters.
                  </TableCell>
                </TableRow>
              ) : (
                users.map((u) => (
                  <TableRow
                    key={u.id}
                    onClick={() => goToUser(u.id)}
                    className="group cursor-pointer hover:bg-muted/50"
                  >
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar name={u.name} email={u.email} />
                        <div className="min-w-0">
                          <p className="truncate font-semibold leading-tight">{u.name}</p>
                          <p className="truncate text-xs text-muted-foreground">{u.email}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <RoleBadge role={u.role} />
                    </TableCell>
                    <TableCell>
                      <TierBadge tier={u.tier} />
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDate(u.createdAt)}
                    </TableCell>
                    <TableCell className="text-right">
                      <UserActionsMenu user={u} />
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Mobile card list */}
        <div className="space-y-2 md:hidden">
          {loading && users.length === 0 ? (
            [1, 2, 3, 4, 5].map((n) => (
              <Skeleton key={`m-${n}`} className="h-20 w-full rounded-xl" />
            ))
          ) : users.length === 0 ? (
            <p className="py-12 text-center text-sm text-muted-foreground">
              No users match these filters.
            </p>
          ) : (
            users.map((u) => (
              <button
                type="button"
                key={u.id}
                onClick={() => goToUser(u.id)}
                className="flex w-full items-center gap-3 rounded-xl border border-border/50 p-3 text-left transition-colors hover:bg-muted/50"
              >
                <Avatar name={u.name} email={u.email} />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold leading-tight">{u.name}</p>
                  <p className="truncate text-xs text-muted-foreground">{u.email}</p>
                  <div className="mt-1.5 flex items-center gap-1.5">
                    <RoleBadge role={u.role} />
                    <TierBadge tier={u.tier} />
                  </div>
                </div>
                <UserActionsMenu user={u} />
              </button>
            ))
          )}
        </div>

        <PaginationControls page={page} limit={limit} total={total} onPageChange={setPage} />

        {total > 0 && (
          <p className="flex items-center gap-1.5 pt-1 text-xs text-muted-foreground">
            <UsersIcon className="h-3.5 w-3.5" />
            {total} {total === 1 ? "user" : "users"} total
          </p>
        )}
      </CardContent>
    </Card>
  );
}
