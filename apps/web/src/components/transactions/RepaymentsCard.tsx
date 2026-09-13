import { Link } from "@tanstack/react-router";
import { format } from "date-fns";
import { ArrowRightLeft } from "lucide-react";
import { formatCurrency } from "@/lib/utils/formatters";
import type { TransactionConversion } from "@/lib/utils/transactionDetailView";

export function RepaymentsCard({
  repayments,
  fallbackCurrency,
}: {
  repayments: TransactionConversion[];
  fallbackCurrency: string;
}) {
  if (repayments.length === 0) {
    return null;
  }

  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-6 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
      <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold text-neutral-900 dark:text-white">
        <ArrowRightLeft size={20} className="text-emerald-600" />
        Repayments
      </h3>
      <div className="space-y-3">
        {repayments.map((repayment) => (
          <Link
            key={repayment.id}
            to="/transactions/$id"
            params={{ id: repayment.id }}
            className="flex items-center justify-between p-3 rounded-lg border border-neutral-100 dark:border-neutral-800 hover:border-emerald-300 hover:bg-emerald-50/50 dark:hover:border-emerald-800 dark:hover:bg-emerald-950/20 transition-colors"
          >
            <div>
              <p className="text-sm font-medium">
                {format(new Date(repayment.date as string), "MMM d, yyyy")}
              </p>
              <p className="text-xs text-neutral-500 capitalize">
                {repayment.type.toLowerCase().replace(/_/g, " ")}
              </p>
            </div>
            <div className="font-semibold text-emerald-600">
              {formatCurrency(repayment.amount || 0, repayment.currency || fallbackCurrency)}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
