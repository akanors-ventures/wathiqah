import { useState, useCallback, useEffect } from "react";
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

  // Initialize display value if initialValue is provided
  useEffect(() => {
    if (initialValue > 0 && !amountDisplay) {
      setAmountDisplay(formatCurrency(initialValue, currencyCode, 0));
    }
  }, [initialValue, currencyCode, amountDisplay]);

  const handleAmountChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
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

  const reset = useCallback(() => {
    setAmountDisplay("");
  }, []);

  return {
    amountDisplay,
    setAmountDisplay,
    handleAmountChange,
    handleBlur,
    reset,
  };
}
