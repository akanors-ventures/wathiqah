import { useEffect, useState } from "react";

/** A row in the picker: the counterpart endpoint and what is left on it. */
export interface PickerRow {
  id: string;
  type: string;
  currency: string;
  date: string;
  remainingAmount?: number | null;
  contact?: { id: string; name: string } | null;
}

const round2 = (value: number) => Math.round(value * 100) / 100;

/**
 * Selection/cap state machine for AllocationDialog's row picker, independent
 * of the dialog's date/note fields and GraphQL wiring. Isolated because it's
 * the most bug-prone logic in the dialog — the cap math below has already
 * shipped two off-by-pool-accounting bugs.
 */
export function useAllocationPicker(
  rows: PickerRow[],
  pool: number,
  isApplyMode: boolean,
  open: boolean,
) {
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [amounts, setAmounts] = useState<Record<string, number>>({});
  const [resetKey, setResetKey] = useState(0);

  // Close→reopen starts clean: a stale tick with a stale amount is the one
  // mistake this dialog must never make.
  useEffect(() => {
    if (!open) {
      setChecked({});
      setAmounts({});
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

  const setAmount = (rowId: string, value: number) =>
    setAmounts((prev) => ({ ...prev, [rowId]: value }));

  return {
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
  };
}
