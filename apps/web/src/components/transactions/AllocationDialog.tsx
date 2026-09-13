import { useQuery } from "@apollo/client/react";
import { format } from "date-fns";
import { useEffect, useId, useMemo, useState } from "react";
import { toast } from "sonner";
import { AllocationRow } from "@/components/transactions/AllocationRow";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { type PickerRow, useAllocationPicker } from "@/hooks/useAllocationPicker";
import { useAllocations } from "@/hooks/useAllocations";
import {
  GET_ALLOCATABLE_OBLIGATIONS,
  GET_AVAILABLE_CREDITS,
} from "@/lib/apollo/queries/transactions";
import { groupAllocationRowsByContact } from "@/lib/utils/allocationRowGrouping";
import { formatCurrency } from "@/lib/utils/formatters";

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

  const [date, setDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);

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

  const rowGroups = useMemo(() => groupAllocationRowsByContact(rows), [rows]);

  const loading = isApplyMode ? obligations.loading : credits.loading;

  const {
    checked,
    amounts,
    resetKey,
    selected,
    capFor,
    total,
    unallocated,
    canSubmit,
    toggle,
    autoFill,
    setAmount,
  } = useAllocationPicker(rows, pool, isApplyMode, open);

  // Close→reopen starts clean: a stale date/note is the one mistake this
  // dialog must never make. (Row selection resets inside useAllocationPicker.)
  useEffect(() => {
    if (!open) {
      setNote("");
      setDate(format(new Date(), "yyyy-MM-dd"));
      setError(null);
    }
  }, [open]);

  const handleSubmit = async () => {
    setError(null);
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
      const message = err instanceof Error ? err.message : "Failed to record allocation";
      toast.error(message);
      setError(message);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
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
            {rowGroups.map((group) => (
              <div key={group.key} className="space-y-2">
                <p className="px-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {group.label}
                </p>
                {group.rows.map((row) => (
                  <AllocationRow
                    key={row.id}
                    row={row}
                    currencyCode={currencyCode}
                    checked={!!checked[row.id]}
                    amount={amounts[row.id] ?? 0}
                    cap={capFor(row)}
                    onToggle={(next) => toggle(row, next)}
                    onAmountChange={(value) => setAmount(row.id, value)}
                  />
                ))}
              </div>
            ))}
          </div>

          {error ? (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : null}

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
