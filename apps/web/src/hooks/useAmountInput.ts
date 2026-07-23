import { useCallback, useEffect, useRef, useState } from "react";
import { formatCurrency } from "@/lib/utils/formatters";

interface UseAmountInputOptions {
  initialValue?: number;
  currencyCode?: string;
  onChange?: (value: number) => void;
}

export function useAmountInput({
  initialValue = 0,
  currencyCode = "NGN",
  onChange,
}: UseAmountInputOptions = {}) {
  const [amountDisplay, setAmountDisplay] = useState<string>("");
  // Tracks whether the user has typed into the field, so the initial-value
  // sync below never overwrites something they're actively editing (e.g.
  // clearing the field to type a fresh amount) while still reformatting the
  // display if currencyCode resolves asynchronously after mount (a project's
  // currency is only known once its query loads) and initialValue is set.
  const hasUserEditedRef = useRef(false);

  const formatInitial = useCallback(
    () => (initialValue > 0 ? formatCurrency(initialValue, currencyCode, 0) : ""),
    [initialValue, currencyCode],
  );

  useEffect(() => {
    if (hasUserEditedRef.current) return;
    setAmountDisplay(formatInitial());
  }, [formatInitial]);

  const handleAmountChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      hasUserEditedRef.current = true;
      const raw = e.target.value;

      if (raw.trim() === "") {
        setAmountDisplay("");
        onChange?.(0);
        return;
      }

      const sanitized = raw.replace(/[^\d.]/g, "");
      const parts = sanitized.split(".");
      const cleanSanitized = parts[0] + (parts.length > 1 ? `.${parts.slice(1).join("")}` : "");
      const num = Number.parseFloat(cleanSanitized);

      if (!Number.isNaN(num)) {
        onChange?.(num);
        if (cleanSanitized.includes(".")) {
          const decimals = cleanSanitized.split(".")[1];
          const display = formatCurrency(num, currencyCode, decimals.length);
          setAmountDisplay(cleanSanitized.endsWith(".") ? `${display}.` : display);
        } else {
          setAmountDisplay(formatCurrency(num, currencyCode, 0));
        }
      } else {
        setAmountDisplay(raw);
      }
    },
    [currencyCode, onChange],
  );

  const handleBlur = useCallback(
    (value: number) => {
      if (value > 0 && !Number.isNaN(value)) {
        setAmountDisplay(formatCurrency(value, currencyCode, 0));
      } else {
        setAmountDisplay("");
      }
    },
    [currencyCode],
  );

  // Restores the display to whatever initialValue/currencyCode currently say
  // (blank for create-mode forms, the formatted prefill for edit/quick-action
  // dialogs whose useAmountInput call outlives a dialog close/reopen cycle),
  // and re-arms the initial-value sync so it can apply again on next open.
  const reset = useCallback(() => {
    hasUserEditedRef.current = false;
    setAmountDisplay(formatInitial());
  }, [formatInitial]);

  return {
    amountDisplay,
    setAmountDisplay,
    handleAmountChange,
    handleBlur,
    reset,
  };
}
