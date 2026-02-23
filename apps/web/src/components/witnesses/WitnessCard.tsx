import { format } from "date-fns";
import { ArrowDownLeft, ArrowUpRight, Calendar, Mail, Wallet } from "lucide-react";
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

  const isPending = status === WitnessStatus.Pending || status === WitnessStatus.Modified;

  return (
    <div className="group relative bg-card border border-border/50 rounded-2xl transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5 hover:border-primary/20 overflow-hidden flex flex-col">
      {/* Notification Header - Only for Pending/Modified */}
      {isPending && (
        <div className="bg-primary/5 p-3 border-b border-primary/10 flex items-center gap-2">
          <Mail className="w-3.5 h-3.5 text-primary" />
          <span className="text-[10px] font-bold text-primary uppercase tracking-wider">
            New Witness Request
          </span>
        </div>
      )}

      <div className="p-4 sm:p-5 flex flex-col gap-4 sm:gap-5 relative z-10">
        <div className="flex justify-between items-start gap-3 sm:gap-4">
          <div className="flex gap-3 items-center min-w-0">
            <div className="relative shrink-0">
              <div className="w-10 h-10 rounded-full bg-muted border border-border flex items-center justify-center text-muted-foreground font-bold text-sm">
                {transaction.createdBy.name?.charAt(0)?.toUpperCase() ?? "U"}
              </div>
              <div className="absolute -bottom-0.5 -right-0.5 p-0.5 rounded-full bg-background border border-border/50">
                <div
                  className={cn(
                    "w-2.5 h-2.5 rounded-full ring-2 ring-background shadow-inner",
                    isPending
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
                <h3 className="text-sm font-bold text-foreground truncate group-hover:text-primary transition-colors tracking-tight flex items-center gap-1.5">
                  {transaction.createdBy.name}
                  {transaction.createdBy.isSupporter && (
                    <SupporterBadge className="h-3 px-1 text-[8px]" />
                  )}
                </h3>
              </div>
              <p className="text-xs text-muted-foreground font-medium opacity-70 leading-tight flex flex-wrap items-center gap-1">
                wants you to verify a transaction with{" "}
                <span className="inline-flex items-center gap-1 text-foreground font-bold">
                  {transaction.contact?.name || "N/A"}
                  {transaction.contact?.isSupporter && (
                    <SupporterBadge className="h-3 px-1 text-[8px]" />
                  )}
                </span>
              </p>
            </div>
          </div>
          <div className="shrink-0">
            {!isPending && <WitnessStatusBadge status={status} className="text-[10px] px-2 py-0" />}
          </div>
        </div>

        {/* Transaction Quote Block */}
        <div className="p-3 bg-muted/30 rounded-lg border border-border/20 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider opacity-70 flex items-center gap-1.5">
              <Wallet className="w-3 h-3" /> Amount
            </span>
            <div
              className={cn(
                "flex items-center gap-1.5 text-sm font-black tracking-tight",
                isPositive ? "text-emerald-500" : "text-rose-500",
              )}
            >
              {isPositive ? (
                <ArrowUpRight className="w-3.5 h-3.5" />
              ) : (
                <ArrowDownLeft className="w-3.5 h-3.5" />
              )}
              <span>
                {transaction.category === AssetCategory.Item
                  ? `${transaction.amount} ${transaction.itemName || "items"}`
                  : formatCurrency(transaction.amount || 0, transaction.currency)}
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between border-t border-border/10 pt-2">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
              <Calendar className="w-3 h-3 opacity-50" />
              {format(new Date(invitedAt as string), "MMM d, yyyy")}
            </div>
            {transaction.description && (
              <span className="text-xs text-muted-foreground italic truncate max-w-[150px] opacity-80">
                "{transaction.description}"
              </span>
            )}
          </div>
        </div>

        {/* Actions */}
        {isPending && (
          <div className="flex gap-2 pt-1">
            <Button
              onClick={() => onAcknowledge(request.id)}
              disabled={isLoading}
              className="flex-1 h-9 text-xs font-bold shadow-lg shadow-primary/10 hover:scale-[1.02] active:scale-[0.98] transition-all bg-primary hover:bg-primary/90"
            >
              Verify
            </Button>
            <Button
              onClick={() => onDecline(request.id)}
              disabled={isLoading}
              variant="secondary"
              className="w-24 h-9 text-xs font-bold text-muted-foreground hover:text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-200 transition-all"
            >
              Decline
            </Button>
          </div>
        )}

        {!isPending && (
          <div className="flex items-center justify-center gap-3 text-[10px] text-muted-foreground font-medium pt-2 opacity-40">
            <span className="w-6 h-px bg-border/50" />
            Invited {format(new Date(invitedAt as string), "MMM d, yyyy")}
            <span className="w-6 h-px bg-border/50" />
          </div>
        )}
      </div>

      {/* Decorative background elements */}
      <div className="absolute -right-20 -bottom-20 w-40 h-40 bg-primary/5 rounded-full blur-[80px] opacity-0 group-hover:opacity-10 transition-opacity duration-700" />
    </div>
  );
}
