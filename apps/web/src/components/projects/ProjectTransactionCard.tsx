import { format } from "date-fns";
import { ArrowDownLeft, ArrowUpRight, CalendarDays, Clock, Pencil } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/utils/formatters";
import { getTransactionTheme } from "@/lib/utils/transactionDisplay";

interface ProjectTxWitness {
  id: string;
  status: string;
  user?: { firstName?: string | null; lastName?: string | null } | null;
}

interface ProjectTxHistory {
  id: string;
  changeType: string;
  createdAt: string | number | Date;
}

export interface ProjectTransactionCardTransaction {
  id: string;
  type: string;
  amount: number | null | undefined;
  category?: string | null;
  description?: string | null;
  date: string | number | Date;
  witnesses?: ProjectTxWitness[] | null;
  history?: ProjectTxHistory[] | null;
}

interface ProjectTransactionCardProps {
  transaction: ProjectTransactionCardTransaction;
  currency: string;
  onEdit: (tx: ProjectTransactionCardTransaction) => void;
  className?: string;
}

export function ProjectTransactionCard({
  transaction: tx,
  currency,
  onEdit,
  className,
}: ProjectTransactionCardProps) {
  const theme = getTransactionTheme(tx.type);
  const isIncoming = theme.isIncoming;
  const amount = tx.amount ?? 0;

  const descriptionLine = (() => {
    if (tx.description && tx.category) return `${tx.description} · ${tx.category}`;
    return tx.description || tx.category || "No description";
  })();

  return (
    <TooltipProvider>
      <div
        className={cn(
          "group relative flex items-center justify-between p-3.5 sm:p-5 rounded-[20px] sm:rounded-[24px] border border-border/50 bg-card transition-all duration-500",
          "hover:shadow-[0_20px_50px_rgba(0,0,0,0.06)] hover:-translate-y-0.5 hover:border-primary/30",
          className,
        )}
      >
        {/* Left: icon + info */}
        <div className="flex items-center gap-3 sm:gap-4 min-w-0 relative z-10">
          {/* Gradient icon with direction dot */}
          <div className="relative shrink-0">
            <div
              className={cn(
                "flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-xl sm:rounded-2xl bg-gradient-to-br text-white shadow-lg transition-all duration-500 group-hover:scale-110 group-hover:-rotate-3",
                theme.gradient,
              )}
            >
              {isIncoming ? (
                <ArrowUpRight className="h-5 w-5 sm:h-6 sm:w-6" />
              ) : (
                <ArrowDownLeft className="h-5 w-5 sm:h-6 sm:w-6" />
              )}
            </div>
            <div className="absolute -bottom-0.5 -right-0.5 p-0.5 rounded-full bg-background border border-border/50 shadow-md">
              <div
                className={cn(
                  "w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full ring-2 ring-background",
                  isIncoming ? "bg-emerald-500" : "bg-rose-500",
                )}
              />
            </div>
          </div>

          {/* Text info */}
          <div className="min-w-0 flex-1">
            <div className="flex flex-col gap-1">
              {/* Type badge + date */}
              <div className="flex flex-wrap items-center gap-1.5">
                <span
                  className={cn(
                    "text-[8px] sm:text-[10px] px-2 py-0.5 rounded-full font-bold capitalize tracking-tight border shadow-sm shrink-0",
                    theme.bgClass,
                    theme.textClass,
                    theme.borderClass,
                  )}
                >
                  {tx.type.toLowerCase()}
                </span>
                <div className="flex items-center gap-1 text-[9px] sm:text-[11px] text-muted-foreground font-medium opacity-70">
                  <CalendarDays className="w-3 h-3 opacity-60 shrink-0" />
                  <span className="shrink-0">
                    {format(new Date(tx.date as string), "MMM d, yyyy")}
                  </span>
                </div>
              </div>

              {/* Description / category */}
              <p className="text-[9px] sm:text-[11px] text-muted-foreground opacity-60 truncate max-w-[180px] sm:max-w-[260px]">
                {descriptionLine}
              </p>

              {/* Witnesses */}
              {tx.witnesses && tx.witnesses.length > 0 && (
                <div className="flex -space-x-1.5 overflow-hidden mt-0.5">
                  {tx.witnesses.map((w) => (
                    <Tooltip key={w.id}>
                      <TooltipTrigger asChild>
                        <Avatar className="inline-block h-5 w-5 rounded-full ring-2 ring-background cursor-help">
                          <AvatarFallback className="text-[8px] bg-primary/10 text-primary">
                            {w.user?.firstName?.[0]}
                            {w.user?.lastName?.[0]}
                          </AvatarFallback>
                        </Avatar>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="text-xs">
                          {w.user?.firstName} {w.user?.lastName}
                        </p>
                        <p className="text-[10px] text-muted-foreground capitalize">
                          {w.status.toLowerCase()}
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right: amount + history + edit */}
        <div className="shrink-0 flex items-center gap-2 sm:gap-3 relative z-10 ml-2">
          <div className="flex flex-col items-end gap-0.5">
            <span
              className={cn("text-base sm:text-xl font-black tracking-tighter", theme.textClass)}
            >
              {isIncoming ? "+" : "−"}
              {formatCurrency(amount, currency)}
            </span>

            {tx.history && tx.history.length > 0 && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="cursor-help">
                    <Clock className="w-3 h-3 text-muted-foreground/50" />
                  </span>
                </TooltipTrigger>
                <TooltipContent className="max-w-[260px]">
                  <p className="text-xs font-semibold mb-1">Edit History</p>
                  {tx.history.slice(0, 5).map((h) => (
                    <div key={h.id} className="text-[10px] text-muted-foreground mb-0.5">
                      <span className="text-foreground">{h.changeType}</span>
                      {" · "}
                      {format(new Date(h.createdAt as string), "MMM d, h:mm a")}
                    </div>
                  ))}
                </TooltipContent>
              </Tooltip>
            )}
          </div>

          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
            onClick={() => onEdit(tx)}
            aria-label="Edit transaction"
          >
            <Pencil className="h-3.5 w-3.5" />
          </Button>
        </div>

        {/* Background glow on hover — matches TransactionCard */}
        <div
          className={cn(
            "absolute -right-20 -bottom-20 w-40 h-40 rounded-full blur-[80px] opacity-0 group-hover:opacity-10 transition-opacity duration-700 pointer-events-none",
            theme.bgClass,
          )}
        />
      </div>
    </TooltipProvider>
  );
}
