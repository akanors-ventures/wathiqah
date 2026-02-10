import { ArrowDownLeft, ArrowRightLeft, ArrowUpRight, Gift, Info } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function LedgerPhilosophy() {
  return (
    <Card className="relative overflow-hidden bg-card border border-border/50 rounded-3xl transition-all duration-500 hover:shadow-[0_20px_50px_rgba(0,0,0,0.05)] group">
      <CardHeader className="pb-3 relative z-10">
        <CardTitle className="text-xs font-black uppercase tracking-widest flex items-center gap-2.5 text-muted-foreground group-hover:text-primary transition-colors">
          <div className="p-2 rounded-xl bg-primary/5 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-all duration-500 shadow-sm group-hover:rotate-3">
            <Info className="w-4 h-4" />
          </div>
          The Wathīqah Ledger Philosophy
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6 relative z-10">
        <p className="text-[11px] text-muted-foreground leading-relaxed font-medium">
          Wathīqah is built on{" "}
          <span className="font-black text-foreground underline decoration-primary/20 decoration-2 underline-offset-4">
            Accountability First
          </span>
          . Our color system helps you instantly identify your financial standing in every
          relationship.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="flex items-start gap-3 p-4 rounded-2xl bg-blue-500/[0.03] border border-blue-500/10 hover:bg-blue-500/[0.06] transition-colors duration-300">
            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-600 shadow-sm">
              <ArrowUpRight className="w-4 h-4" />
            </div>
            <div>
              <div className="text-[10px] font-black text-blue-600 uppercase tracking-widest">
                Asset (Given)
              </div>
              <p className="text-[11px] text-muted-foreground mt-1 font-medium leading-normal">
                Resources you've lent out. This is your{" "}
                <span className="text-blue-600 font-bold">Credit</span>.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-4 rounded-2xl bg-rose-500/[0.03] border border-rose-500/10 hover:bg-rose-500/[0.06] transition-colors duration-300">
            <div className="p-2 rounded-xl bg-rose-500/10 text-rose-600 shadow-sm">
              <ArrowDownLeft className="w-4 h-4" />
            </div>
            <div>
              <div className="text-[10px] font-black text-rose-600 uppercase tracking-widest">
                Liability (Received)
              </div>
              <p className="text-[11px] text-muted-foreground mt-1 font-medium leading-normal">
                Resources you've obtained. This is your{" "}
                <span className="text-rose-600 font-bold">Debt</span>.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-4 rounded-2xl bg-emerald-500/[0.03] border border-emerald-500/10 hover:bg-emerald-500/[0.06] transition-colors duration-300">
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 shadow-sm">
              <ArrowRightLeft className="w-4 h-4" />
            </div>
            <div>
              <div className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">
                Settlement (Returned)
              </div>
              <p className="text-[11px] text-muted-foreground mt-1 font-medium leading-normal">
                Repayments clearing standing.{" "}
                <span className="text-emerald-600 font-bold">To Me</span> (Emerald) for money coming
                back. <span className="text-blue-600 font-bold">To Contact</span> (Blue) for paying
                back.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-4 rounded-2xl bg-purple-500/[0.03] border border-purple-500/10 hover:bg-purple-500/[0.06] transition-colors duration-300">
            <div className="p-2 rounded-xl bg-purple-500/10 text-purple-600 shadow-sm">
              <Gift className="w-4 h-4" />
            </div>
            <div>
              <div className="text-[10px] font-black text-purple-600 uppercase tracking-widest">
                Goodwill (Gift)
              </div>
              <p className="text-[11px] text-muted-foreground mt-1 font-medium leading-normal">
                Non-balance transactions.{" "}
                <span className="text-purple-600 font-bold">Received</span> (Purple) for gifts
                obtained. <span className="text-pink-600 font-bold">Given</span> (Pink) for gifts
                shared.
              </p>
            </div>
          </div>
        </div>
      </CardContent>
      <div className="absolute -right-12 -bottom-12 w-48 h-48 bg-primary/5 rounded-full blur-3xl group-hover:bg-primary/10 transition-colors duration-500" />
    </Card>
  );
}
