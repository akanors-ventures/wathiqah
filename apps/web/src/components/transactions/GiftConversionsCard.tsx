import { format } from "date-fns";
import { Gift } from "lucide-react";
import { formatCurrency } from "@/lib/utils/formatters";
import type { TransactionConversion } from "@/lib/utils/transactionDetailView";

export function GiftConversionsCard({
  giftConversions,
  fallbackCurrency,
}: {
  giftConversions: TransactionConversion[];
  fallbackCurrency: string;
}) {
  if (giftConversions.length === 0) {
    return null;
  }

  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-6 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
      <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold text-neutral-900 dark:text-white">
        <Gift size={20} className="text-orange-600" />
        Gift Conversions
      </h3>
      <div className="space-y-3">
        {giftConversions.map((conversion) => (
          <div
            key={conversion.id}
            className="flex items-center justify-between p-3 rounded-lg border border-neutral-100 dark:border-neutral-800"
          >
            <div>
              <p className="text-sm font-medium">
                {format(new Date(conversion.date as string), "MMM d, yyyy")}
              </p>
              <p className="text-xs text-neutral-500">Gifted back</p>
            </div>
            <div className="font-semibold text-orange-600">
              {formatCurrency(conversion.amount || 0, conversion.currency || fallbackCurrency)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
