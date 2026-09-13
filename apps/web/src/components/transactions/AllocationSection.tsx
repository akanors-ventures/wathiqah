import { Split } from "lucide-react";
import { AllocationRowCard } from "@/components/transactions/AllocationRowCard";

interface CounterpartTransaction {
  id: string;
  type: string;
  contact?: { id: string; name: string } | null;
}

interface AllocationEntry {
  id: string;
  amount: number;
  currency: string;
  date: unknown;
  note?: string | null;
  status: string;
  targetTransaction?: CounterpartTransaction | null;
  sourceTransaction?: CounterpartTransaction | null;
}

interface AllocationSectionProps {
  title: string;
  allocations: AllocationEntry[];
  /** Which side of the allocation is the "other" record for this list. */
  counterpartOf: "target" | "source";
  fallbackCurrency: string;
  reversingId: string | null;
  onReverse: (allocationId: string) => void;
}

/**
 * "Applied To" (credit drawn out of this record) and "Settled From" (credit
 * applied into this record) are the same layout read from either end of an
 * allocation — this renders both, parameterized by which side is fixed.
 */
export function AllocationSection({
  title,
  allocations,
  counterpartOf,
  fallbackCurrency,
  reversingId,
  onReverse,
}: AllocationSectionProps) {
  if (allocations.length === 0) {
    return null;
  }

  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-6 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
      <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold text-neutral-900 dark:text-white">
        <Split size={20} className="text-emerald-600" />
        {title}
      </h3>
      <div className="space-y-3">
        {allocations.map((allocation) => (
          <AllocationRowCard
            key={allocation.id}
            allocation={allocation}
            counterpart={
              counterpartOf === "target"
                ? allocation.targetTransaction
                : allocation.sourceTransaction
            }
            fallbackCurrency={fallbackCurrency}
            reversing={reversingId === allocation.id}
            onReverse={() => onReverse(allocation.id)}
          />
        ))}
      </div>
    </div>
  );
}
