import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  type DisplayTransactionType,
  formatTransactionTypeLabel,
  getTransactionTheme,
} from "@/lib/utils/transactionDisplay";

interface TransactionTypeBadgeProps {
  type: DisplayTransactionType;
  /** Extra classes appended to the themed badge classes. */
  className?: string;
}

/**
 * Themed pill that renders a transaction type label with the colors defined
 * in `transactionDisplay.ts`. Single source of truth for badge rendering —
 * route files should never compose `text-*-600 border-*-200 bg-*-50` ladders
 * inline.
 */
export function TransactionTypeBadge({ type, className }: TransactionTypeBadgeProps) {
  const theme = getTransactionTheme(type);
  return (
    <Badge
      variant="outline"
      className={cn("text-[10px] font-bold px-2 py-0.5", theme.badgeClass, className)}
    >
      {formatTransactionTypeLabel(type)}
    </Badge>
  );
}
