import { Link } from "@tanstack/react-router";
import { format } from "date-fns";
import { ArrowRightLeft } from "lucide-react";
import { formatCurrency } from "@/lib/utils/formatters";
import type { TransactionConversion } from "@/lib/utils/transactionDetailView";

export function RemittancesCard({
  remittances,
  fallbackCurrency,
}: {
  remittances: TransactionConversion[];
  fallbackCurrency: string;
}) {
  if (remittances.length === 0) {
    return null;
  }

  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-6 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
      <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold text-neutral-900 dark:text-white">
        <ArrowRightLeft size={20} className="text-emerald-600" />
        Remittances
      </h3>
      <div className="space-y-3">
        {remittances.map((remittance) => (
          <Link
            key={remittance.id}
            to="/transactions/$id"
            params={{ id: remittance.id }}
            className="flex items-center justify-between p-3 rounded-lg border border-neutral-100 dark:border-neutral-800 hover:border-emerald-300 hover:bg-emerald-50/50 dark:hover:border-emerald-800 dark:hover:bg-emerald-950/20 transition-colors"
          >
            <div>
              <p className="text-sm font-medium">
                {format(new Date(remittance.date as string), "MMM d, yyyy")}
              </p>
              <p className="text-xs text-neutral-500">Remitted</p>
            </div>
            <div className="font-semibold text-emerald-600">
              {formatCurrency(remittance.amount || 0, remittance.currency || fallbackCurrency)}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
