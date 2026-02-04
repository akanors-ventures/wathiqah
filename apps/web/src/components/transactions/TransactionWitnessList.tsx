import { format } from "date-fns";
import { Calendar, Mail, User, Users } from "lucide-react";
import type { Witness } from "@/types/__generated__/graphql";
import { WitnessStatusBadge } from "../witnesses/WitnessStatusBadge";

export function TransactionWitnessList({ witnesses }: { witnesses: Witness[] }) {
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
            className="group relative flex items-center justify-between p-5 bg-card border border-border/50 rounded-3xl transition-all duration-500 hover:shadow-[0_15px_35px_rgba(0,0,0,0.06)] hover:-translate-y-1 hover:border-primary/30 overflow-hidden"
          >
            <div className="flex items-center gap-4 relative z-10">
              <div className="h-12 w-12 rounded-2xl bg-primary/5 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-all duration-500 shadow-sm group-hover:scale-110 group-hover:-rotate-3">
                <User size={22} />
              </div>
              <div className="flex flex-col min-w-0">
                <span className="font-extrabold text-base text-foreground group-hover:text-primary transition-colors tracking-tight truncate">
                  {witness.user?.name}
                </span>
                <div className="flex flex-wrap items-center gap-y-1 gap-x-4 mt-1">
                  <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest flex items-center gap-1.5">
                    <Mail size={12} className="opacity-60" /> {witness.user?.email}
                  </span>
                  <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest flex items-center gap-1.5">
                    <Calendar size={12} className="opacity-60" /> Invited{" "}
                    {format(new Date(witness.invitedAt as string), "MMM d, yyyy")}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex flex-col items-end gap-2 relative z-10">
              <WitnessStatusBadge status={witness.status} />
              {!!witness.acknowledgedAt && (
                <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground bg-muted/50 px-2 py-0.5 rounded-lg border border-border/20">
                  Actioned on {format(new Date(witness.acknowledgedAt as string), "MMM d")}
                </span>
              )}
            </div>

            <div className="absolute -right-4 -bottom-4 w-20 h-20 bg-primary/5 rounded-full blur-2xl group-hover:bg-primary/10 transition-colors duration-500" />
          </div>
        ))}
      </div>
    </div>
  );
}
