import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { useAmountInput } from "./useAmountInput";

function change(value: string) {
  return { target: { value } } as React.ChangeEvent<HTMLInputElement>;
}

describe("useAmountInput", () => {
  it("starts blank when no initialValue is provided (create mode)", () => {
    const { result } = renderHook(() => useAmountInput({ currencyCode: "NGN" }));
    expect(result.current.amountDisplay).toBe("");
  });

  it("prefills the formatted display from initialValue (edit mode)", () => {
    const { result } = renderHook(() =>
      useAmountInput({ initialValue: 50000, currencyCode: "NGN" }),
    );
    expect(result.current.amountDisplay).toBe("₦50,000");
  });

  it("does not revert to initialValue when the user clears the field to retype", () => {
    const { result } = renderHook(() =>
      useAmountInput({ initialValue: 50000, currencyCode: "NGN" }),
    );
    expect(result.current.amountDisplay).toBe("₦50,000");

    act(() => {
      result.current.handleAmountChange(change(""));
    });
    // Regression: this used to snap back to "₦50,000" because the prefill
    // effect re-fired whenever amountDisplay became falsy.
    expect(result.current.amountDisplay).toBe("");

    act(() => {
      result.current.handleAmountChange(change("7500"));
    });
    expect(result.current.amountDisplay).toBe("₦7,500");
  });

  it("reformats the prefilled amount if currencyCode resolves after mount, before the user types", () => {
    const { result, rerender } = renderHook(
      ({ currencyCode }) => useAmountInput({ initialValue: 50000, currencyCode }),
      { initialProps: { currencyCode: "NGN" } },
    );
    expect(result.current.amountDisplay).toBe("₦50,000");

    // Simulates the project's real currency arriving after an initial "NGN"
    // fallback (e.g. a cold Apollo cache for the project list query).
    rerender({ currencyCode: "USD" });
    expect(result.current.amountDisplay).toBe("$50,000");
  });

  it("stops auto-reformatting on currencyCode change once the user has started typing", () => {
    const { result, rerender } = renderHook(
      ({ currencyCode }) => useAmountInput({ initialValue: 50000, currencyCode }),
      { initialProps: { currencyCode: "NGN" } },
    );

    act(() => {
      result.current.handleAmountChange(change("1200"));
    });
    expect(result.current.amountDisplay).toBe("₦1,200");

    rerender({ currencyCode: "USD" });
    // A currency change after the user has edited the field must not clobber
    // what they typed.
    expect(result.current.amountDisplay).toBe("₦1,200");
  });

  it("reset() restores the display to the current initialValue/currencyCode and re-arms auto-sync", () => {
    const { result } = renderHook(() =>
      useAmountInput({ initialValue: 87500, currencyCode: "NGN" }),
    );

    act(() => {
      result.current.handleAmountChange(change("1"));
    });
    expect(result.current.amountDisplay).toBe("₦1");

    act(() => {
      result.current.reset();
    });
    // Dialogs like RecordReturnDialog keep this hook mounted across
    // open/close; reset() must bring back the outstanding-balance prefill,
    // not leave the field blank on next open.
    expect(result.current.amountDisplay).toBe("₦87,500");
  });

  it("reset() blanks the display for create-mode forms (no initialValue)", () => {
    const { result } = renderHook(() => useAmountInput({ currencyCode: "NGN" }));

    act(() => {
      result.current.handleAmountChange(change("300"));
    });
    expect(result.current.amountDisplay).toBe("₦300");

    act(() => {
      result.current.reset();
    });
    expect(result.current.amountDisplay).toBe("");
  });
});
