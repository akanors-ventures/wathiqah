import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { type PickerRow, useAllocationPicker } from "./useAllocationPicker";

const ROWS: PickerRow[] = [
  {
    id: "loan-1",
    type: "LOAN_GIVEN",
    currency: "NGN",
    date: "2026-01-10",
    remainingAmount: 200000,
  },
  {
    id: "loan-2",
    type: "LOAN_GIVEN",
    currency: "NGN",
    date: "2026-03-10",
    remainingAmount: 150000,
  },
  {
    id: "loan-3",
    type: "LOAN_GIVEN",
    currency: "NGN",
    date: "2026-06-10",
    remainingAmount: 150000,
  },
];

describe("useAllocationPicker", () => {
  it("defaults a newly checked row's amount to its own cap", () => {
    const { result } = renderHook(() => useAllocationPicker(ROWS, 500000, true, true));

    act(() => result.current.toggle(ROWS[0], true));

    expect(result.current.checked["loan-1"]).toBe(true);
    expect(result.current.amounts["loan-1"]).toBe(200000);
  });

  it("shrinks a row's cap as other checked rows claim the shared pool (applyCredit mode)", () => {
    // Regression: a row's cap must subtract what OTHER checked rows have
    // already committed, not just clamp against the raw pool — otherwise two
    // rows can each look individually fine while the total goes negative.
    const { result } = renderHook(() => useAllocationPicker(ROWS, 250000, true, true));

    act(() => result.current.toggle(ROWS[0], true)); // takes 200000 of the 250000 pool
    expect(result.current.amounts["loan-1"]).toBe(200000);

    // loan-2 would want 150000, but only 50000 of the pool is left.
    expect(result.current.capFor(ROWS[1])).toBe(50000);
  });

  it("computes total/unallocated across every checked row", () => {
    const { result } = renderHook(() => useAllocationPicker(ROWS, 300000, true, true));

    act(() => {
      result.current.toggle(ROWS[0], true);
      result.current.setAmount("loan-1", 100000);
      result.current.toggle(ROWS[1], true);
      result.current.setAmount("loan-2", 50000);
    });

    expect(result.current.total).toBe(150000);
    expect(result.current.unallocated).toBe(150000);
  });

  it("blocks submit while any checked row is empty or over its cap", () => {
    const { result } = renderHook(() => useAllocationPicker(ROWS, 300000, true, true));

    act(() => result.current.toggle(ROWS[0], true));
    // amounts["loan-1"] defaults to its cap (200000) — a positive amount, so
    // canSubmit should already be true with nothing else touched.
    expect(result.current.canSubmit).toBe(true);

    act(() => result.current.setAmount("loan-1", 0));
    expect(result.current.canSubmit).toBe(false);

    act(() => result.current.setAmount("loan-1", 999999));
    expect(result.current.canSubmit).toBe(false);
  });

  it("settleFromCredit mode replaces the prior selection instead of stacking", () => {
    // Only one source may be picked in this mode — the mutation applies one
    // source across many targets, so a second pick would need a second
    // mutation and break the all-or-nothing guarantee.
    const { result } = renderHook(() => useAllocationPicker(ROWS, 500000, false, true));

    act(() => result.current.toggle(ROWS[0], true));
    expect(result.current.checked).toEqual({ "loan-1": true });

    act(() => result.current.toggle(ROWS[1], true));
    expect(result.current.checked).toEqual({ "loan-2": true });
    expect(result.current.checked["loan-1"]).toBeUndefined();
  });

  it("settleFromCredit caps the replaced row's amount against the raw pool", () => {
    const { result } = renderHook(() => useAllocationPicker(ROWS, 100000, false, true));

    act(() => result.current.toggle(ROWS[0], true)); // remainingAmount 200000, pool only 100000
    expect(result.current.amounts["loan-1"]).toBe(100000);
  });

  it("autoFill fills oldest rows first until the pool runs out", () => {
    const { result } = renderHook(() => useAllocationPicker(ROWS, 300000, true, true));

    act(() => result.current.autoFill());

    // loan-1 (Jan) then loan-2 (Mar) fully consume the 300000 pool; loan-3
    // (Jun) gets nothing.
    expect(result.current.amounts).toEqual({ "loan-1": 200000, "loan-2": 100000 });
    expect(result.current.checked["loan-3"]).toBeUndefined();
  });

  it("clears all selection state when the dialog closes", () => {
    const { result, rerender } = renderHook(
      ({ open }) => useAllocationPicker(ROWS, 300000, true, open),
      { initialProps: { open: true } },
    );

    act(() => result.current.toggle(ROWS[0], true));
    expect(result.current.selected).toHaveLength(1);

    rerender({ open: false });

    expect(result.current.checked).toEqual({});
    expect(result.current.amounts).toEqual({});
    expect(result.current.selected).toHaveLength(0);
  });
});
