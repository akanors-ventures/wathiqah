import { format } from "date-fns";
import { CalendarDays, Clock } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/utils/formatters";
import { getTransactionTheme } from "@/lib/utils/transactionDisplay";
import type { ProjectTransactionCardTransaction } from "./ProjectTransactionCard";

interface ViewProjectTransactionDialogProps {
  transaction: ProjectTransactionCardTransaction | null;
  currency: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ViewProjectTransactionDialog({
  transaction: tx,
  currency,
  open,
  onOpenChange,
}: ViewProjectTransactionDialogProps) {
  if (!tx) return null;

  const theme = getTransactionTheme(tx.type);
  const isIncoming = theme.isIncoming;
  const amount = tx.amount ?? 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Transaction Details</DialogTitle>
          <DialogDescription>Read-only view of this project transaction.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          <div className="flex items-center justify-between">
            <span
              className={cn(
                "text-[10px] px-2 py-0.5 rounded-full font-bold capitalize tracking-tight border shadow-sm",
                theme.bgClass,
                theme.textClass,
                theme.borderClass,
              )}
            >
              {tx.type.toLowerCase()}
            </span>
            <span className={cn("text-xl font-black tracking-tighter", theme.textClass)}>
              {isIncoming ? "+" : "−"}
              {formatCurrency(amount, currency)}
            </span>
          </div>

          <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
            <CalendarDays className="w-3.5 h-3.5 opacity-60 shrink-0" />
            {format(new Date(tx.date as string), "MMMM d, yyyy")}
          </div>

          {tx.category && (
            <div className="text-sm">
              <span className="text-muted-foreground">Category: </span>
              <span className="font-medium">{tx.category}</span>
            </div>
          )}

          <div className="text-sm">
            <span className="text-muted-foreground">Description: </span>
            <span className="font-medium">{tx.description || "No description"}</span>
          </div>

          {tx.witnesses && tx.witnesses.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Witnesses
              </p>
              <div className="space-y-1.5">
                {tx.witnesses.map((w) => (
                  <div key={w.id} className="flex items-center gap-2 text-sm">
                    <Avatar className="h-6 w-6 rounded-full">
                      <AvatarFallback className="text-[9px] bg-primary/10 text-primary">
                        {w.user?.firstName?.[0]}
                        {w.user?.lastName?.[0]}
                      </AvatarFallback>
                    </Avatar>
                    <span className="font-medium">
                      {w.user?.firstName} {w.user?.lastName}
                    </span>
                    <span className="text-xs text-muted-foreground capitalize">
                      {w.status.toLowerCase()}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {tx.history && tx.history.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1">
                <Clock className="w-3 h-3" /> Edit History
              </p>
              <div className="space-y-1">
                {tx.history.map((h) => (
                  <div key={h.id} className="text-xs text-muted-foreground">
                    <span className="text-foreground">{h.changeType}</span>
                    {" · "}
                    {format(new Date(h.createdAt as string), "MMM d, h:mm a")}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
