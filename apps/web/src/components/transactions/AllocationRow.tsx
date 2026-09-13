import { format } from "date-fns";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import type { PickerRow } from "@/hooks/useAllocationPicker";
import { useAmountInput } from "@/hooks/useAmountInput";
import { formatCurrency } from "@/lib/utils/formatters";
import { formatTransactionTypeLabel } from "@/lib/utils/transactionDisplay";

/** One selectable row in AllocationDialog's obligation/credit picker. */
export function AllocationRow({
  row,
  currencyCode,
  checked,
  amount,
  cap,
  onToggle,
  onAmountChange,
}: {
  row: PickerRow;
  currencyCode: string;
  checked: boolean;
  amount: number;
  cap: number;
  onToggle: (checked: boolean) => void;
  onAmountChange: (value: number) => void;
}) {
  // Keyed by the amount the parent last pushed in (auto-fill, or a reset), so
  // the display picks that up without fighting the user's own typing.
  const { amountDisplay, handleAmountChange, handleBlur } = useAmountInput({
    initialValue: amount,
    currencyCode,
    onChange: onAmountChange,
  });

  const overCap = checked && amount > cap;

  return (
    <div className="flex items-start gap-3 rounded-md border p-3">
      <Checkbox
        checked={checked}
        onCheckedChange={(next) => onToggle(next === true)}
        aria-label={`Select ${formatTransactionTypeLabel(row.type)} of ${formatCurrency(
          row.remainingAmount ?? 0,
          currencyCode,
        )}`}
      />
      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <span className="text-sm font-medium">
            {formatTransactionTypeLabel(row.type)}
            {row.contact?.name ? (
              <span className="text-muted-foreground font-normal"> · {row.contact.name}</span>
            ) : null}
          </span>
          <span className="text-xs text-muted-foreground">
            {format(new Date(row.date), "d MMM yyyy")}
          </span>
        </div>
        {row.description ? (
          <p className="truncate text-xs italic text-muted-foreground" title={row.description}>
            {row.description}
          </p>
        ) : null}
        <p className="text-xs text-muted-foreground">
          Outstanding {formatCurrency(row.remainingAmount ?? 0, currencyCode)}
          {row.amount != null && (row.remainingAmount ?? 0) < row.amount ? (
            <>
              {" "}
              of {formatCurrency(row.amount, currencyCode)}
              {" · "}
              <span className="font-medium text-amber-600 dark:text-amber-400">
                Partially settled
              </span>
            </>
          ) : null}
        </p>
        {checked ? (
          <div className="flex items-center gap-2 pt-1">
            <span className="text-xs font-medium text-muted-foreground">{currencyCode}</span>
            <Input
              type="text"
              inputMode="decimal"
              aria-label={`Amount to apply to ${row.id}`}
              value={amountDisplay}
              onChange={handleAmountChange}
              onBlur={() => handleBlur(amount)}
              className="h-8 flex-1"
            />
          </div>
        ) : null}
        {overCap ? (
          <p className="text-xs text-destructive">
            Cannot exceed {formatCurrency(cap, currencyCode)}
          </p>
        ) : null}
      </div>
    </div>
  );
}
