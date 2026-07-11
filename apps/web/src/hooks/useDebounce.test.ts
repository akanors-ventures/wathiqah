import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useDebounce } from "./useDebounce";

describe("useDebounce", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("keeps the initial value immediately, before any delay elapses", () => {
    const { result } = renderHook(() => useDebounce("a", 2000));
    expect(result.current).toBe("a");
  });

  it("does not update until the delay elapses", () => {
    const { result, rerender } = renderHook(({ value }) => useDebounce(value, 2000), {
      initialProps: { value: "a" },
    });

    rerender({ value: "ab" });
    vi.advanceTimersByTime(1999);
    expect(result.current).toBe("a");
  });

  it("updates to the latest value once the delay elapses", async () => {
    vi.useRealTimers();
    const { result, rerender } = renderHook(({ value }) => useDebounce(value, 20), {
      initialProps: { value: "a" },
    });

    rerender({ value: "ab" });
    await waitFor(() => expect(result.current).toBe("ab"));
  });

  it("resets the timer on every keystroke, so only the final value after typing stops is committed", () => {
    const { result, rerender } = renderHook(({ value }) => useDebounce(value, 2000), {
      initialProps: { value: "" },
    });

    for (const value of ["a", "ab", "abc"]) {
      rerender({ value });
      act(() => {
        vi.advanceTimersByTime(1000);
      });
    }
    // Each keystroke restarted the timer, so still under 2000ms since the last one.
    expect(result.current).toBe("");

    act(() => {
      vi.advanceTimersByTime(2000);
    });
    expect(result.current).toBe("abc");
  });
});
