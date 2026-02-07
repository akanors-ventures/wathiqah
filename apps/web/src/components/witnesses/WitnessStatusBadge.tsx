import { cn } from "@/lib/utils";
import { WitnessStatus } from "@/types/__generated__/graphql";

interface WitnessStatusBadgeProps {
  status: WitnessStatus;
  className?: string;
}

const statusConfig = {
  [WitnessStatus.Pending]: {
    label: "Pending",
    className:
      "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-900",
  },
  [WitnessStatus.Acknowledged]: {
    label: "Acknowledged",
    className:
      "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-900",
  },
  [WitnessStatus.Declined]: {
    label: "Declined",
    className:
      "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/30 dark:text-red-400 dark:border-red-900",
  },
  [WitnessStatus.Modified]: {
    label: "Modified",
    className:
      "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/30 dark:text-blue-400 dark:border-blue-900",
  },
};

export function WitnessStatusBadge({ status, className }: WitnessStatusBadgeProps) {
  const config = statusConfig[status];

  return (
    <div
      className={cn(
        "inline-flex items-center px-2 py-0.5 sm:px-2.5 sm:py-0.5 rounded-full text-[9px] sm:text-xs font-bold border whitespace-nowrap shrink-0 shadow-sm transition-all uppercase tracking-tight",
        config.className,
        className,
      )}
    >
      {config.label}
    </div>
  );
}
