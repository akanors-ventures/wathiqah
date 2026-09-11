import { useQuery } from "@apollo/client/react";
import { format } from "date-fns";
import { useEffect, useId, useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { DatePicker } from "@/components/ui/date-picker";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAllocations } from "@/hooks/useAllocations";
import { useAmountInput } from "@/hooks/useAmountInput";
import {
  GET_ALLOCATABLE_OBLIGATIONS,
  GET_AVAILABLE_CREDITS,
} from "@/lib/apollo/queries/transactions";
import { formatCurrency } from "@/lib/utils/formatters";
import { formatTransactionTypeLabel } from "@/lib/utils/transactionDisplay";

/** A row in the picker: the counterpart endpoint and what is left on it. */
interface PickerRow {
  id: string;
  type: string;
  currency: string;
  date: string;
  description?: string | null;
  remainingAmount?: number | null;
  contact?: { id: string; name: string } | null;
}

interface AllocationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /**
   * `applyCredit`: the fixed endpoint is a credit pool, and the picker lists
   * obligations it can settle — several at once, split in one atomic pass.
   *
   * `settleFromCredit`: the fixed endpoint is the obligation, and the picker
   * lists credit pools. Exactly one may be chosen: the mutation applies one
   * source across many targets, so many-sources-to-one-target would be N
   * separate mutations and lose the all-or-nothing guarantee. Repeat the
   * dialog to draw on a second pool.
   */
  mode: "applyCredit" | "settleFromCredit";
  transaction: {
    id: string;
    currency: string;
    remainingAmount: number;
    contactName?: string | null;
  };
  onSuccess?: () => void;
}

const round2 = (value: number) => Math.round(value * 100) / 100;

function AllocationRow({
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
        <p className="text-xs text-muted-foreground">
          Outstanding {formatCurrency(row.remainingAmount ?? 0, currencyCode)}
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

/**
 * Applies a lump sum across accumulated obligations, from either end. Creates
 * no new transaction: one real money movement stays one transaction row and
 * the allocations record how it was split.
 */
export function AllocationDialog({
  open,
  onOpenChange,
  mode,
  transaction,
  onSuccess,
}: AllocationDialogProps) {
  const { allocateTransactions, allocating } = useAllocations();
  const dateId = useId();
  const noteId = useId();
  const currencyCode = transaction.currency ?? "NGN";
  const pool = transaction.remainingAmount;

  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [amounts, setAmounts] = useState<Record<string, number>>({});
  const [resetKey, setResetKey] = useState(0);
  const [date, setDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [note, setNote] = useState("");

  const isApplyMode = mode === "applyCredit";

  const obligations = useQuery(GET_ALLOCATABLE_OBLIGATIONS, {
    variables: { sourceTransactionId: transaction.id },
    skip: !open || !isApplyMode,
    fetchPolicy: "cache-and-network",
  });
  const credits = useQuery(GET_AVAILABLE_CREDITS, {
    variables: { currency: currencyCode },
    skip: !open || isApplyMode,
    fetchPolicy: "cache-and-network",
  });

  const rows: PickerRow[] = useMemo(() => {
    const raw = isApplyMode
      ? (obligations.data?.allocatableObligations ?? [])
      : (credits.data?.availableCredits ?? []);
    return raw as unknown as PickerRow[];
  }, [isApplyMode, obligations.data, credits.data]);

  const loading = isApplyMode ? obligations.loading : credits.loading;

  // Close→reopen starts clean: a stale tick with a stale amount is the one
  // mistake this dialog must never make.
  useEffect(() => {
    if (!open) {
      setChecked({});
      setAmounts({});
      setNote("");
      setDate(format(new Date(), "yyyy-MM-dd"));
      setResetKey((k) => k + 1);
    }
  }, [open]);

  const selected = rows.filter((row) => checked[row.id]);

  // A row's cap is the pool minus whatever OTHER checked rows have already
  // claimed from it — not the raw pool. Two rows each defaulting to the full
  // pool (then only catching the overshoot at the total) left every row
  // looking individually fine while the total silently went negative.
  const capFor = (row: PickerRow) => {
    const committedByOthers = selected
      .filter((r) => r.id !== row.id)
      .reduce((sum, r) => sum + (amounts[r.id] ?? 0), 0);
    return round2(Math.max(0, Math.min(pool - committedByOthers, row.remainingAmount ?? 0)));
  };

  const total = round2(selected.reduce((sum, row) => sum + (amounts[row.id] ?? 0), 0));
  const unallocated = round2(pool - total);

  const rowOverCap = selected.some((row) => (amounts[row.id] ?? 0) > capFor(row));
  const rowEmpty = selected.some((row) => !((amounts[row.id] ?? 0) > 0));
  const canSubmit = selected.length > 0 && !rowOverCap && !rowEmpty && unallocated >= 0;

  const toggle = (row: PickerRow, next: boolean) => {
    if (next && !isApplyMode) {
      // settleFromCredit draws one source across many targets — checking a
      // second credit here would need a second mutation and break the
      // all-or-nothing guarantee, so it replaces the prior pick instead of
      // stacking toward a submit that's blocked anyway. Cap against the raw
      // pool, not capFor(row) — that reads the about-to-be-replaced
      // `selected`/`checked` from this render's closure, so it would still
      // count the row being replaced as "other" competition for the pool.
      setChecked({ [row.id]: true });
      setAmounts({ [row.id]: round2(Math.min(pool, row.remainingAmount ?? 0)) });
      return;
    }
    setChecked((prev) => ({ ...prev, [row.id]: next }));
    // Filling in the default amount only touches this row's own state, so
    // React updates just this row's controlled input — no need to remount
    // the whole list (that's reserved for autoFill/close, which really do
    // want every row's typed-state flag cleared).
    if (next && amounts[row.id] === undefined) {
      setAmounts((prev) => ({ ...prev, [row.id]: capFor(row) }));
    }
  };

  /** Fills the oldest obligations first until the pool runs out. */
  const autoFill = () => {
    let left = pool;
    const nextChecked: Record<string, boolean> = {};
    const nextAmounts: Record<string, number> = {};
    for (const row of [...rows].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
    )) {
      if (left <= 0) break;
      const take = round2(Math.min(left, row.remainingAmount ?? 0));
      if (take <= 0) continue;
      nextChecked[row.id] = true;
      nextAmounts[row.id] = take;
      left = round2(left - take);
    }
    setChecked(nextChecked);
    setAmounts(nextAmounts);
    setResetKey((k) => k + 1);
  };

  const handleSubmit = async () => {
    try {
      const input = isApplyMode
        ? {
            sourceTransactionId: transaction.id,
            allocations: selected.map((row) => ({
              targetTransactionId: row.id,
              amount: amounts[row.id],
            })),
            date: new Date(date).toISOString(),
            note: note || undefined,
          }
        : {
            sourceTransactionId: selected[0].id,
            allocations: [{ targetTransactionId: transaction.id, amount: amounts[selected[0].id] }],
            date: new Date(date).toISOString(),
            note: note || undefined,
          };

      await allocateTransactions(input);
      toast.success(
        selected.length === 1 ? "Allocation recorded" : `${selected.length} allocations recorded`,
      );
      onSuccess?.();
      onOpenChange(false);
    } catch (err) {
      console.error(err);
      toast.error(err instanceof Error ? err.message : "Failed to record allocation");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{isApplyMode ? "Apply to obligations" : "Settle from a credit"}</DialogTitle>
          <DialogDescription>
            {isApplyMode ? (
              <>
                Split this money across what is owed. Available:{" "}
                <span className="font-semibold text-foreground">
                  {formatCurrency(pool, currencyCode)}
                </span>
                . No new transaction is created.
              </>
            ) : (
              <>
                Settle this record from money already received or disbursed. Outstanding:{" "}
                <span className="font-semibold text-foreground">
                  {formatCurrency(pool, currencyCode)}
                </span>
                .
              </>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          {isApplyMode && rows.length > 0 ? (
            <div className="flex justify-end">
              <Button type="button" variant="outline" size="sm" onClick={autoFill}>
                Auto-fill oldest first
              </Button>
            </div>
          ) : null}

          <div className="max-h-64 space-y-2 overflow-y-auto" key={resetKey}>
            {loading && rows.length === 0 ? (
              <p className="text-sm text-muted-foreground">Loading...</p>
            ) : null}
            {!loading && rows.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                {isApplyMode
                  ? "Nothing outstanding that this money can settle."
                  : "No credit with an unapplied balance in this currency."}
              </p>
            ) : null}
            {rows.map((row) => (
              <AllocationRow
                key={row.id}
                row={row}
                currencyCode={currencyCode}
                checked={!!checked[row.id]}
                amount={amounts[row.id] ?? 0}
                cap={capFor(row)}
                onToggle={(next) => toggle(row, next)}
                onAmountChange={(value) => setAmounts((prev) => ({ ...prev, [row.id]: value }))}
              />
            ))}
          </div>

          {selected.length > 0 ? (
            <div className="flex items-center justify-between rounded-md bg-muted px-3 py-2 text-sm">
              <span>Allocating {formatCurrency(total, currencyCode)}</span>
              <span className={unallocated < 0 ? "text-destructive font-medium" : ""}>
                Unallocated {formatCurrency(unallocated, currencyCode)}
              </span>
            </div>
          ) : null}

          <div className="space-y-2">
            <Label htmlFor={dateId}>Date</Label>
            <DatePicker id={dateId} value={date} onChange={setDate} />
          </div>

          <div className="space-y-2">
            <Label htmlFor={noteId}>
              Note <span className="text-muted-foreground font-normal">(optional)</span>
            </Label>
            <Textarea
              id={noteId}
              rows={2}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="What this settlement covers"
            />
          </div>
        </div>

        <DialogFooter className="pt-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={allocating}
          >
            Cancel
          </Button>
          <Button type="button" onClick={handleSubmit} disabled={!canSubmit || allocating}>
            {allocating ? "Applying..." : "Apply"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
