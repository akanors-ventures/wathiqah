import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useTransactionFilters } from "./useTransactionFilters";

describe("useTransactionFilters — reset() vs. debounced search", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("clears the search filter immediately on reset(), without waiting out the debounce delay", () => {
    const { result } = renderHook(() => useTransactionFilters());

    act(() => {
      result.current.setSearch("groceries");
    });
    act(() => {
      vi.advanceTimersByTime(2000);
    });
    expect(result.current.variables.filter.search).toBe("groceries");

    act(() => {
      result.current.reset();
    });

    // No timer advance here — the filter must already be clear.
    expect(result.current.variables.filter.search).toBeUndefined();
    expect(result.current.variables.filter.page).toBe(1);
  });

  it("still debounces normal typing (search only reflects the value after the delay elapses)", () => {
    const { result } = renderHook(() => useTransactionFilters());

    act(() => {
      result.current.setSearch("a");
    });
    expect(result.current.variables.filter.search).toBeUndefined();

    act(() => {
      vi.advanceTimersByTime(2000);
    });
    expect(result.current.variables.filter.search).toBe("a");
  });
});
