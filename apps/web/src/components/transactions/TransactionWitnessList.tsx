import { format } from "date-fns";
import { CalendarDays, Mail, RefreshCw, Trash2, User, Users } from "lucide-react";
import { WitnessStatus, type Witness } from "@/types/__generated__/graphql";
import { WitnessStatusBadge } from "../witnesses/WitnessStatusBadge";
import { Button } from "../ui/button";
import { SupporterBadge } from "../ui/supporter-badge";

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
      <div className="text-center py-12 border-2 border-dashed border-border/50 rounded-3xl bg-muted/5 group">
        <div className="p-4 rounded-full bg-muted/20 w-16 h-16 mx-auto mb-4 flex items-center justify-center group-hover:scale-110 group-hover:bg-primary/5 transition-all duration-500">
          <Users className="h-8 w-8 text-muted-foreground group-hover:text-primary transition-colors" />
        </div>
        <h3 className="text-base font-black text-foreground uppercase tracking-widest">
          No witnesses added
        </h3>
        <p className="mt-2 text-[11px] text-muted-foreground font-medium max-w-[240px] mx-auto leading-relaxed">
          This transaction hasn't been shared with any witnesses yet for verification.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3">
        {witnesses.map((witness) => (
          <div
            key={witness.id}
            className="group relative flex flex-col sm:flex-row sm:items-center justify-between p-4 sm:p-5 bg-card border border-border/50 rounded-3xl transition-all duration-500 hover:shadow-[0_15px_35px_rgba(0,0,0,0.06)] hover:-translate-y-1 hover:border-primary/30 overflow-hidden gap-4"
          >
            <div className="flex items-center gap-3 sm:gap-4 relative z-10 min-w-0">
              <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-2xl bg-primary/5 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-all duration-500 shadow-sm group-hover:scale-110 group-hover:-rotate-3 shrink-0">
                <User size={20} className="sm:w-[22px] sm:h-[22px]" />
              </div>
              <div className="flex flex-col min-w-0">
                <span className="font-extrabold text-sm sm:text-base text-foreground group-hover:text-primary transition-colors tracking-tight truncate flex items-center gap-1.5">
                  {witness.user?.name}
                  {witness.user?.isSupporter && <SupporterBadge className="h-4 px-1 text-[9px]" />}
                </span>
                <div className="flex flex-wrap items-center gap-y-1 gap-x-3 sm:gap-x-4 mt-0.5 sm:mt-1">
                  <span className="text-[9px] sm:text-[10px] text-muted-foreground font-bold uppercase tracking-widest flex items-center gap-1.5 truncate max-w-[150px] sm:max-w-none">
                    <Mail size={11} className="sm:w-3 sm:h-3 opacity-60" /> {witness.user?.email}
                  </span>
                  <span className="text-[9px] sm:text-[10px] text-muted-foreground font-bold uppercase tracking-widest flex items-center gap-1.5 shrink-0">
                    <CalendarDays size={11} className="sm:w-3 sm:h-3 opacity-60" /> Invited{" "}
                    {format(new Date(witness.invitedAt as string), "MMM d, yyyy")}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex flex-row sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-2 relative z-10 border-t sm:border-t-0 pt-3 sm:pt-0 border-border/10">
              <div className="flex items-center gap-2">
                {onResend &&
                  (witness.status === WitnessStatus.Pending ||
                    witness.status === WitnessStatus.Modified) && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-amber-600 hover:text-amber-700 hover:bg-amber-50 rounded-xl"
                      onClick={() => onResend(witness.id)}
                      disabled={isResendingId === witness.id}
                      title="Resend Invitation"
                    >
                      <RefreshCw
                        size={14}
                        className={isResendingId === witness.id ? "animate-spin" : ""}
                      />
                    </Button>
                  )}
                {onRemove && witness.status !== WitnessStatus.Acknowledged && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-xl"
                    onClick={() => onRemove(witness.id)}
                    disabled={isRemovingId === witness.id}
                    title="Remove Witness"
                  >
                    <Trash2 size={14} />
                  </Button>
                )}
                <WitnessStatusBadge status={witness.status} />
              </div>
              {!!witness.acknowledgedAt && (
                <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground bg-muted/50 px-2 py-0.5 rounded-lg border border-border/20 shrink-0">
                  Actioned on {format(new Date(witness.acknowledgedAt as string), "MMM d")}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
