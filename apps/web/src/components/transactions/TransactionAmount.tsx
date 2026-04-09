import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/utils/formatters";
import { type DisplayTransactionType, getTransactionTheme } from "@/lib/utils/transactionDisplay";

interface TransactionAmountProps {
  type: DisplayTransactionType;
  amount: number | null | undefined;
  currency: string | null | undefined;
  /** Extra classes appended to the themed text class. Pass size/weight here. */
  className?: string;
  /** When true, hides the leading sign (+/−). Defaults to `false`. */
  hideSign?: boolean;
}

/**
 * Themed currency display for a transaction amount. Encapsulates sign + color
 * + currency formatting so callers don't reach into `getTransactionTheme()`
 * just to render an amount.
 *
 * Renders nothing if `amount` is null/undefined — caller is expected to handle
 * non-monetary categories (items) separately.
 */
export function TransactionAmount({
  type,
  amount,
  currency,
  className,
  hideSign = false,
}: TransactionAmountProps) {
  if (amount == null) return null;
  const theme = getTransactionTheme(type);
  return (
    <span className={cn("font-bold", theme.textClass, className)}>
      {!hideSign && theme.sign}
      {formatCurrency(amount, currency || "NGN")}
    </span>
  );
}
