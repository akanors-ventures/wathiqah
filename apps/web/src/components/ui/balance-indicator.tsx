import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/utils/formatters";

interface BalanceIndicatorProps {
  amount: number;
  currency?: string;
  className?: string;
  overrideColor?: "red" | "green" | "blue";
}

export function BalanceIndicator({
  amount,
  currency = "NGN",
  className,
  overrideColor,
}: BalanceIndicatorProps) {
  const isDebt = amount < 0;
  const isCredit = amount > 0;
  const isSettled = amount === 0;

  const formattedAmount = formatCurrency(Math.abs(amount), currency);
  const signedAmount = isSettled
    ? formattedAmount
    : isDebt
      ? `-${formattedAmount}`
      : `+${formattedAmount}`;

  const styles =
    overrideColor === "red"
      ? "text-red-700 bg-red-50 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-900/30"
      : overrideColor === "green"
        ? "text-emerald-700 bg-emerald-50 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-900/30"
        : overrideColor === "blue"
          ? "text-blue-700 bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-900/30"
          : isDebt
            ? "text-red-700 bg-red-50 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-900/30"
            : isCredit
              ? "text-emerald-700 bg-emerald-50 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-900/30"
              : "text-emerald-700 bg-emerald-50 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-900/30";

  return (
    <Badge
      variant="outline"
      className={cn("font-mono font-medium whitespace-nowrap gap-2", styles, className)}
    >
      <span className="font-bold tracking-tight">{signedAmount}</span>
    </Badge>
  );
}
