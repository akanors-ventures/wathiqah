import { format } from "date-fns";
import { ArrowDownLeft, ArrowUpRight, Calendar, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SupporterBadge } from "@/components/ui/supporter-badge";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/utils/formatters";
import {
  type MyWitnessRequestsQuery,
  WitnessStatus,
  AssetCategory,
} from "@/types/__generated__/graphql";
import { WitnessStatusBadge } from "./WitnessStatusBadge";

interface WitnessCardProps {
  request: MyWitnessRequestsQuery["myWitnessRequests"][0];
  onAcknowledge: (id: string) => void;
  onDecline: (id: string) => void;
  isLoading?: boolean;
}

export function WitnessCard({ request, onAcknowledge, onDecline, isLoading }: WitnessCardProps) {
  const { transaction, status, invitedAt } = request;

  if (!transaction || !transaction.createdBy) return null;

  const isPositive =
    transaction.type === "GIVEN" ||
    (transaction.type === "RETURNED" && transaction.returnDirection === "TO_ME") ||
    transaction.type === "INCOME" ||
    (transaction.type === "GIFT" && transaction.returnDirection === "TO_ME");

  return (
    <div className="group relative bg-card border border-border/50 rounded-[32px] transition-all duration-500 hover:shadow-[0_20px_40px_rgba(0,0,0,0.06)] hover:-translate-y-1 hover:border-primary/30 overflow-hidden flex flex-col p-6">
      <div className="flex flex-col gap-6 relative z-10">
        <div className="flex justify-between items-start">
          <div className="flex gap-4 items-center min-w-0">
            <div className="relative shrink-0">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary via-primary/80 to-primary/60 flex items-center justify-center text-white font-black text-xl shadow-lg shadow-primary/20 group-hover:scale-110 group-hover:-rotate-3 transition-all duration-500">
                {transaction.createdBy.name?.charAt(0)?.toUpperCase() ?? "U"}
              </div>
              <div className="absolute -bottom-1 -right-1 p-1 rounded-full bg-background border border-border/50 shadow-md">
                <div
                  className={cn(
                    "w-2.5 h-2.5 rounded-full ring-2 ring-background shadow-inner",
                    status === WitnessStatus.Pending || status === WitnessStatus.Modified
                      ? "bg-amber-500 animate-pulse"
                      : status === WitnessStatus.Acknowledged
                        ? "bg-emerald-500"
                        : "bg-rose-500",
                  )}
                />
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <h3 className="text-lg font-bold text-foreground truncate group-hover:text-primary transition-colors tracking-tight flex items-center gap-1.5">
                  {transaction.createdBy.name}
                  {transaction.createdBy.isSupporter && (
                    <SupporterBadge className="h-4 px-1 text-[9px]" />
                  )}
                </h3>
              </div>
              <p className="text-[11px] text-muted-foreground font-medium opacity-70 leading-tight flex flex-wrap items-center gap-1">
                Invited you to witness a transaction with{" "}
                <span className="inline-flex items-center gap-1">
                  <strong>{transaction.contact?.name || "N/A"}</strong>
                  {transaction.contact?.isSupporter && (
                    <SupporterBadge className="h-3 px-1 text-[8px]" />
                  )}
                </span>
              </p>
            </div>
          </div>
          <div className="shrink-0">
            <WitnessStatusBadge status={status} className="text-[10px] px-2 py-0" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="p-4 bg-muted/20 rounded-2xl border border-border/30 group/item transition-all hover:border-primary/20 hover:bg-background/50">
            <p className="text-[10px] text-muted-foreground font-bold mb-2 flex items-center gap-2 opacity-60">
              <Wallet className="w-3 h-3 text-primary/60" /> Amount
            </p>
            <div className="flex items-center gap-1.5">
              <div
                className={cn(
                  "p-1 rounded-lg bg-background border border-border/50 shadow-sm transition-transform group-hover/item:scale-110",
                  isPositive ? "text-emerald-500" : "text-rose-500",
                )}
              >
                {isPositive ? (
                  <ArrowUpRight className="w-3 h-3" />
                ) : (
                  <ArrowDownLeft className="w-3 h-3" />
                )}
              </div>
              <span className="text-base font-bold tracking-tight text-foreground">
                {transaction.category === AssetCategory.Item
                  ? `${transaction.amount} ${transaction.itemName || "items"}`
                  : formatCurrency(transaction.amount || 0, transaction.currency)}
              </span>
            </div>
          </div>
          <div className="p-4 bg-muted/20 rounded-2xl border border-border/30 group/item transition-all hover:border-primary/20 hover:bg-background/50">
            <p className="text-[10px] text-muted-foreground font-bold mb-2 flex items-center gap-2 opacity-60">
              <Calendar className="w-3 h-3 text-primary/60" /> Date
            </p>
            <span className="text-sm font-bold tracking-tight text-foreground/90 block">
              {format(new Date(transaction.date as string), "MMM d, yyyy")}
            </span>
          </div>
        </div>

        {transaction.description && (
          <div className="p-4 rounded-2xl bg-muted/20 border border-border/30 relative overflow-hidden group-hover:bg-muted/30 transition-all duration-500">
            <p className="text-sm text-muted-foreground font-medium leading-relaxed italic relative z-10 pl-3 border-l-2 border-primary/20 line-clamp-1">
              "{transaction.description}"
            </p>
          </div>
        )}

        <div className="flex flex-col gap-3">
          {(status === WitnessStatus.Pending || status === WitnessStatus.Modified) && (
            <div className="grid grid-cols-2 gap-3">
              <Button
                onClick={() => onAcknowledge(request.id)}
                disabled={isLoading}
                className="rounded-xl h-10 font-bold text-xs shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all bg-primary hover:bg-primary/90"
              >
                Acknowledge
              </Button>
              <Button
                onClick={() => onDecline(request.id)}
                disabled={isLoading}
                variant="outline"
                className="rounded-xl h-10 font-bold text-xs text-rose-600 border-rose-200 hover:bg-rose-50 hover:border-rose-300 transition-all"
              >
                Decline
              </Button>
            </div>
          )}
          <div className="flex items-center justify-center gap-3 text-[10px] text-muted-foreground font-medium pt-2 opacity-40">
            <span className="w-6 h-px bg-border/50" />
            Invited {format(new Date(invitedAt as string), "MMM d, yyyy")}
            <span className="w-6 h-px bg-border/50" />
          </div>
        </div>
      </div>

      {/* Decorative background elements */}
      <div className="absolute -right-20 -bottom-20 w-40 h-40 bg-primary/5 rounded-full blur-[80px] opacity-0 group-hover:opacity-10 transition-opacity duration-700" />
    </div>
  );
}
