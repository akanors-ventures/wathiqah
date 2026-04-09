import { format } from "date-fns";
import { MoreHorizontal, RefreshCw, Trash2, Users } from "lucide-react";
import { type Witness, WitnessStatus } from "@/types/__generated__/graphql";
import { Button } from "../ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import { SupporterBadge } from "../ui/supporter-badge";
import { WitnessStatusBadge } from "../witnesses/WitnessStatusBadge";

function getInitials(name?: string | null): string {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  const first = parts[0] ?? "";
  if (parts.length === 1) return first.slice(0, 2).toUpperCase();
  const last = parts[parts.length - 1] ?? "";
  return ((first[0] ?? "") + (last[0] ?? "")).toUpperCase();
}

function getStatusLine(witness: Witness): string {
  const invitedAt = witness.invitedAt
    ? format(new Date(witness.invitedAt as string), "MMM d, yyyy")
    : null;
  const actionedAt = witness.acknowledgedAt
    ? format(new Date(witness.acknowledgedAt as string), "MMM d, yyyy")
    : null;

  switch (witness.status) {
    case WitnessStatus.Acknowledged:
      return actionedAt ? `Acknowledged ${actionedAt}` : "Acknowledged";
    case WitnessStatus.Declined:
      return actionedAt ? `Declined ${actionedAt}` : "Declined";
    case WitnessStatus.Modified:
      return actionedAt ? `Reset to modified ${actionedAt}` : "Reset to modified";
    case WitnessStatus.Pending:
    default:
      return invitedAt ? `Invited ${invitedAt} · awaiting response` : "Awaiting response";
  }
}

export function TransactionWitnessList({
  witnesses,
  onResend,
  onRemove,
  isResendingId,
  isRemovingId,
}: {
  witnesses: Witness[];
  onResend?: (id: string) => void;
  onRemove?: (id: string) => void;
  isResendingId?: string | null;
  isRemovingId?: string | null;
}) {
  if (witnesses.length === 0) {
    return (
      <div className="text-center py-10 border border-dashed border-border/60 rounded-2xl bg-muted/5">
        <div className="p-3 rounded-full bg-muted/20 w-12 h-12 mx-auto mb-3 flex items-center justify-center">
          <Users className="h-5 w-5 text-muted-foreground" />
        </div>
        <h3 className="text-sm font-semibold text-foreground">No witnesses yet</h3>
        <p className="mt-1 text-xs text-muted-foreground max-w-[260px] mx-auto">
          Add a witness to share this transaction for verification.
        </p>
      </div>
    );
  }

  return (
    <ul className="space-y-2">
      {witnesses.map((witness) => {
        const name = witness.user?.name ?? "Unknown";
        const email = witness.user?.email ?? "";
        const canResend =
          witness.status === WitnessStatus.Pending || witness.status === WitnessStatus.Modified;
        const canRemove = witness.status !== WitnessStatus.Acknowledged;
        const showMenu = (onResend && canResend) || (onRemove && canRemove);

        return (
          <li
            key={witness.id}
            className="flex items-center gap-3 p-3 sm:p-4 bg-card border border-border/50 rounded-xl hover:border-border transition-colors"
          >
            {/* Avatar with initials */}
            <div className="h-10 w-10 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-semibold shrink-0">
              {getInitials(name)}
            </div>

            {/* Identity + status line */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-semibold text-foreground truncate">{name}</span>
                {witness.user?.isSupporter && <SupporterBadge className="h-4 px-1 text-[9px]" />}
              </div>
              {email && (
                <div className="text-xs text-muted-foreground truncate normal-case tracking-normal">
                  {email}
                </div>
              )}
              <div className="text-[11px] text-muted-foreground/80 mt-0.5 truncate">
                {getStatusLine(witness)}
              </div>
            </div>

            {/* Status + actions */}
            <div className="flex items-center gap-1.5 shrink-0">
              <WitnessStatusBadge status={witness.status} />
              {showMenu && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 rounded-lg text-muted-foreground hover:text-foreground"
                    >
                      <MoreHorizontal size={16} />
                      <span className="sr-only">Witness actions</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-44">
                    {onResend && canResend && (
                      <DropdownMenuItem
                        onClick={() => onResend(witness.id)}
                        disabled={isResendingId === witness.id}
                      >
                        <RefreshCw
                          size={14}
                          className={`mr-2 ${isResendingId === witness.id ? "animate-spin" : ""}`}
                        />
                        Resend invitation
                      </DropdownMenuItem>
                    )}
                    {onRemove && canRemove && (
                      <DropdownMenuItem
                        onClick={() => onRemove(witness.id)}
                        disabled={isRemovingId === witness.id}
                        className="text-rose-600 focus:text-rose-600"
                      >
                        <Trash2 size={14} className="mr-2" />
                        Remove witness
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
