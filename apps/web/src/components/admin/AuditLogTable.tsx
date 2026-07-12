import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { useAdminAuditLogs } from "@/hooks/useAdmin";
import { cn } from "@/lib/utils";
import { AdminAction } from "@/types/__generated__/graphql";
import { ACTION_META, ActionBadge, actorName, formatDateTime } from "./admin-format";

const ALL = "ALL";
const HEAD = "text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 h-12";

function describeMeta(action: AdminAction, metadata?: Record<string, unknown> | null): string {
  if (!metadata) return "";
  if (action === AdminAction.SetUserRole && "role" in metadata) {
    const from = metadata.previousRole ? `${String(metadata.previousRole)} → ` : "";
    return `${from}${String(metadata.role)}`;
  }
  if (action === AdminAction.ProvisionPro && metadata.expiresAt) {
    return `Expires ${new Date(String(metadata.expiresAt)).toLocaleDateString()}`;
  }
  if (
    (action === AdminAction.PlanCreated ||
      action === AdminAction.PlanUpdated ||
      action === AdminAction.PlanCancelled) &&
    "name" in metadata
  ) {
    return String(metadata.name);
  }
  if (action === AdminAction.PlanSynced && "count" in metadata) {
    return `${String(metadata.count)} plan(s)`;
  }
  return "";
}

export function AuditLogTable() {
  const [action, setAction] = useState<string>(ALL);
  const [page, setPage] = useState(1);

  const filter = useMemo(
    () => ({ action: action === ALL ? undefined : (action as AdminAction), page, limit: 20 }),
    [action, page],
  );

  const { logs, total, limit, loading } = useAdminAuditLogs(filter);

  return (
    <Card className="rounded-[24px] border-border/50">
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <CardTitle className="text-base font-black">Audit log</CardTitle>
        <Select
          value={action}
          onValueChange={(v) => {
            setAction(v);
            setPage(1);
          }}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Action" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All actions</SelectItem>
            {Object.values(AdminAction).map((a) => (
              <SelectItem key={a} value={a}>
                {ACTION_META[a].label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </CardHeader>

      <CardContent>
        {/* Desktop */}
        <div className="hidden md:block">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className={HEAD}>Action</TableHead>
                <TableHead className={HEAD}>Admin</TableHead>
                <TableHead className={HEAD}>Target</TableHead>
                <TableHead className={HEAD}>Detail</TableHead>
                <TableHead className={cn(HEAD, "text-right")}>When</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading && logs.length === 0 ? (
                [1, 2, 3, 4, 5, 6].map((n) => (
                  <TableRow key={n}>
                    <TableCell colSpan={5}>
                      <Skeleton className="h-8 w-full" />
                    </TableCell>
                  </TableRow>
                ))
              ) : logs.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="py-16 text-center text-sm text-muted-foreground"
                  >
                    No admin actions recorded yet.
                  </TableCell>
                </TableRow>
              ) : (
                logs.map((log) => (
                  <TableRow key={log.id} className="hover:bg-muted/40">
                    <TableCell>
                      <ActionBadge action={log.action} />
                    </TableCell>
                    <TableCell className="font-medium">{actorName(log.actor)}</TableCell>
                    <TableCell className="font-medium">{actorName(log.targetUser)}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {describeMeta(log.action, log.metadata)}
                    </TableCell>
                    <TableCell className="text-right text-sm text-muted-foreground">
                      {formatDateTime(log.createdAt)}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Mobile */}
        <div className="space-y-2 md:hidden">
          {loading && logs.length === 0 ? (
            [1, 2, 3, 4, 5].map((n) => <Skeleton key={n} className="h-16 w-full rounded-xl" />)
          ) : logs.length === 0 ? (
            <p className="py-12 text-center text-sm text-muted-foreground">
              No admin actions recorded yet.
            </p>
          ) : (
            logs.map((log) => (
              <div key={log.id} className="rounded-xl border border-border/50 p-3">
                <div className="flex items-center justify-between gap-2">
                  <ActionBadge action={log.action} />
                  <span className="text-xs text-muted-foreground">
                    {formatDateTime(log.createdAt)}
                  </span>
                </div>
                <p className="mt-2 text-sm">
                  <span className="font-semibold">{actorName(log.actor)}</span>
                  <span className="text-muted-foreground"> → </span>
                  <span className="font-semibold">{actorName(log.targetUser)}</span>
                </p>
                {describeMeta(log.action, log.metadata) && (
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {describeMeta(log.action, log.metadata)}
                  </p>
                )}
              </div>
            ))
          )}
        </div>

        <PaginationControls page={page} limit={limit} total={total} onPageChange={setPage} />
      </CardContent>
    </Card>
  );
}
