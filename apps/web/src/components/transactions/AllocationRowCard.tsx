import { Link } from "@tanstack/react-router";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/utils/formatters";
import { formatTransactionTypeLabel } from "@/lib/utils/transactionDisplay";

/**
 * One allocation link, readable from either end. The counterpart's contact
 * name is the point of the row when the money came from someone else — the
 * "paid by Ade" case that a plain amount would hide.
 */
export function AllocationRowCard({
  allocation,
  counterpart,
  fallbackCurrency,
  reversing,
  onReverse,
}: {
  allocation: {
    id: string;
    amount: number;
    currency: string;
    date: unknown;
    note?: string | null;
    status: string;
  };
  counterpart?: {
    id: string;
    type: string;
    contact?: { id: string; name: string } | null;
  } | null;
  fallbackCurrency: string;
  reversing: boolean;
  onReverse: () => void;
}) {
  const isReversed = allocation.status === "REVERSED";

  return (
    <div className="flex items-center justify-between gap-3 p-3 rounded-lg border border-neutral-100 dark:border-neutral-800">
      <div className="min-w-0">
        {counterpart ? (
          <Link
            to="/transactions/$id"
            params={{ id: counterpart.id }}
            className="text-sm font-medium hover:text-emerald-600 transition-colors"
          >
            <span>{formatTransactionTypeLabel(counterpart.type)}</span>
            {counterpart.contact?.name ? ` — ${counterpart.contact.name}` : ""}
          </Link>
        ) : (
          <span className="text-sm font-medium">Linked record</span>
        )}
        <p className="text-xs text-neutral-500">
          {format(new Date(allocation.date as string), "MMM d, yyyy")}
          {allocation.note ? ` · ${allocation.note}` : ""}
        </p>
      </div>
      <div className="flex items-center gap-3 shrink-0">
        <span
          className={
            isReversed
              ? "font-semibold text-neutral-400 line-through"
              : "font-semibold text-emerald-600"
          }
        >
          {formatCurrency(allocation.amount, allocation.currency || fallbackCurrency)}
        </span>
        {isReversed ? (
          <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-neutral-500/10 text-neutral-500 border border-neutral-500/20">
            Reversed
          </span>
        ) : (
          <Button
            variant="ghost"
            size="sm"
            className="h-7"
            onClick={onReverse}
            disabled={reversing}
          >
            {reversing ? "Reversing..." : "Reverse"}
          </Button>
        )}
      </div>
    </div>
  );
}
