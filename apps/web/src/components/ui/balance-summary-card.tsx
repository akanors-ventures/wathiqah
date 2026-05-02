import { endOfMonth, format, startOfMonth, subMonths } from "date-fns";
import { ArrowDownLeft, ArrowRightLeft, ArrowUpRight, Calendar, ChevronDown } from "lucide-react";
import { useEffect, useState } from "react";
import { BalanceIndicator } from "@/components/ui/balance-indicator";
import { Card, CardContent } from "@/components/ui/card";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/utils/formatters";

type Period = "THIS_MONTH" | "LAST_MONTH" | "LAST_3_MONTHS" | "CUSTOM";
type CustomRange = { from: string | null; to: string | null };

function formatPeriodLabel(period: Period, custom: CustomRange): string {
  const now = new Date();
  switch (period) {
    case "THIS_MONTH":
      return format(now, "MMMM yyyy");
    case "LAST_MONTH":
      return format(subMonths(now, 1), "MMMM yyyy");
    case "LAST_3_MONTHS": {
      const start = subMonths(now, 2);
      return `${format(start, "MMM")}–${format(now, "MMM yyyy")}`;
    }
    case "CUSTOM":
      if (custom.from && custom.to) {
        return `${format(new Date(custom.from), "d MMM")}–${format(new Date(custom.to), "d MMM yyyy")}`;
      }
      return "Select range";
  }
}

interface StatCellProps {
  label: string;
  value: number;
  currency: string;
  colorClass: string;
  bgClass: string;
  borderClass: string;
  icon: React.ReactNode;
}

function StatCell({
  label,
  value,
  currency,
  colorClass,
  bgClass,
  borderClass,
  icon,
}: StatCellProps) {
  return (
    <div className={cn("flex flex-col gap-2 p-3 rounded-2xl border", bgClass, borderClass)}>
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground leading-tight">
          {label}
        </span>
        <span className={cn("opacity-70", colorClass)}>{icon}</span>
      </div>
      <span className={cn("text-sm font-bold tabular-nums", colorClass)}>
        {formatCurrency(value, currency)}
      </span>
    </div>
  );
}

function StatCellSkeleton() {
  return (
    <div className="flex flex-col gap-2 p-3 rounded-2xl border border-border/50 bg-muted/20">
      <Skeleton className="h-3 w-16" />
      <Skeleton className="h-4 w-24" />
    </div>
  );
}

export interface BalanceSummaryStats {
  currency: string;
  totalLoanGiven: number;
  totalLoanReceived: number;
  totalRepaymentMade: number;
  totalRepaymentReceived: number;
  totalGiftGiven: number;
  totalGiftReceived: number;
  totalAdvancePaid: number;
  totalAdvanceReceived: number;
  totalDepositPaid: number;
  totalDepositReceived: number;
  totalEscrowed: number;
  totalRemitted: number;
}

export interface BalanceSummaryCardProps {
  leftTitle: string;
  leftIcon: React.ReactNode;
  balance?: number;
  balanceCurrency?: string;
  balanceLoading?: boolean;
  stats?: BalanceSummaryStats;
  statsLoading?: boolean;
  onPeriodFilterChange?: (range: { from: string | null; to: string | null }) => void;
}

export function BalanceSummaryCard({
  leftTitle,
  leftIcon,
  balance,
  balanceCurrency,
  balanceLoading,
  stats,
  statsLoading,
  onPeriodFilterChange,
}: BalanceSummaryCardProps) {
  const [period, setPeriod] = useState<Period>("THIS_MONTH");
  const [customRange, setCustomRange] = useState<CustomRange>({ from: null, to: null });
  const [otherFlowsOpen, setOtherFlowsOpen] = useState(false);

  const currency = stats?.currency ?? balanceCurrency ?? "NGN";
  const skipCustom = period === "CUSTOM" && (!customRange.from || !customRange.to);

  useEffect(() => {
    if (!onPeriodFilterChange) return;
    if (period === "CUSTOM" && (!customRange.from || !customRange.to)) {
      onPeriodFilterChange({ from: null, to: null });
      return;
    }
    if (period === "CUSTOM") {
      onPeriodFilterChange({ from: customRange.from, to: customRange.to });
      return;
    }
    const now = new Date();
    if (period === "THIS_MONTH") {
      onPeriodFilterChange({
        from: format(startOfMonth(now), "yyyy-MM-dd"),
        to: format(endOfMonth(now), "yyyy-MM-dd"),
      });
    } else if (period === "LAST_MONTH") {
      const prev = subMonths(now, 1);
      onPeriodFilterChange({
        from: format(startOfMonth(prev), "yyyy-MM-dd"),
        to: format(endOfMonth(prev), "yyyy-MM-dd"),
      });
    } else if (period === "LAST_3_MONTHS") {
      onPeriodFilterChange({
        from: format(startOfMonth(subMonths(now, 2)), "yyyy-MM-dd"),
        to: format(endOfMonth(now), "yyyy-MM-dd"),
      });
    }
  }, [period, customRange, onPeriodFilterChange]);

  const otherFlows = stats
    ? [
        {
          label: "Gift Given",
          value: stats.totalGiftGiven,
          colorClass: "text-pink-600 dark:text-pink-400",
        },
        {
          label: "Gift Received",
          value: stats.totalGiftReceived,
          colorClass: "text-purple-600 dark:text-purple-400",
        },
        {
          label: "Advance Paid",
          value: stats.totalAdvancePaid,
          colorClass: "text-orange-600 dark:text-orange-400",
        },
        {
          label: "Advance Received",
          value: stats.totalAdvanceReceived,
          colorClass: "text-purple-600 dark:text-purple-400",
        },
        {
          label: "Deposit Paid",
          value: stats.totalDepositPaid,
          colorClass: "text-orange-600 dark:text-orange-400",
        },
        {
          label: "Deposit Received",
          value: stats.totalDepositReceived,
          colorClass: "text-purple-600 dark:text-purple-400",
        },
        {
          label: "Escrowed",
          value: stats.totalEscrowed,
          colorClass: "text-teal-600 dark:text-teal-400",
        },
        {
          label: "Remitted",
          value: stats.totalRemitted,
          colorClass: "text-orange-600 dark:text-orange-400",
        },
      ].filter((f) => f.value > 0)
    : [];
  const otherFlowsTotal = otherFlows.reduce((sum, f) => sum + f.value, 0);

  const periodSelector = (
    <div className="flex items-center gap-2.5 flex-wrap">
      <div className="flex items-center gap-2 text-muted-foreground">
        <Calendar className="w-3.5 h-3.5 shrink-0" />
        <Select value={period} onValueChange={(v) => setPeriod(v as Period)}>
          <SelectTrigger className="h-9 w-[160px] text-xs font-semibold border-border/60">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="THIS_MONTH" className="text-xs">
              This Month
            </SelectItem>
            <SelectItem value="LAST_MONTH" className="text-xs">
              Last Month
            </SelectItem>
            <SelectItem value="LAST_3_MONTHS" className="text-xs">
              Last 3 Months
            </SelectItem>
            <SelectItem value="CUSTOM" className="text-xs">
              Custom Range
            </SelectItem>
          </SelectContent>
        </Select>
      </div>
      <span className="text-xs font-medium text-muted-foreground ml-auto">
        {formatPeriodLabel(period, customRange)}
      </span>
    </div>
  );

  return (
    <Card className="rounded-[32px] overflow-hidden border-border/60 shadow-sm">
      <div className="lg:flex lg:items-stretch lg:divide-x lg:divide-border/40">
        {/* Left panel: balance */}
        <div className="relative px-5 pt-5 pb-5 bg-muted/30 border-b border-border/40 lg:border-b-0 lg:w-[230px] lg:shrink-0 lg:flex lg:flex-col lg:justify-center lg:gap-2">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1.5 min-w-0">
              <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                {leftTitle}
              </p>
              {balanceLoading && balance === undefined ? (
                <Skeleton className="h-8 w-40 rounded-full" />
              ) : balance !== undefined ? (
                <BalanceIndicator
                  amount={balance}
                  currency={balanceCurrency ?? currency}
                  className="text-xl px-3.5 py-1.5 h-auto"
                />
              ) : null}
            </div>
            <div className="shrink-0 p-2.5 rounded-xl bg-primary/10 text-primary">{leftIcon}</div>
          </div>
          <div className="absolute -right-8 -bottom-8 w-32 h-32 rounded-full bg-primary/5 blur-2xl pointer-events-none" />
        </div>

        {/* Right panel: period selector + stats */}
        <CardContent className="p-5 space-y-3 flex-1 min-w-0">
          {periodSelector}

          {period === "CUSTOM" && <DateRangePicker value={customRange} onChange={setCustomRange} />}

          {skipCustom ? (
            <p className="text-xs text-muted-foreground text-center py-4">
              Select a start and end date to view stats.
            </p>
          ) : statsLoading && !stats ? (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
              {[0, 1, 2, 3].map((k) => (
                <StatCellSkeleton key={k} />
              ))}
            </div>
          ) : stats ? (
            <div className="space-y-3">
              {/* Mobile: grouped with section labels */}
              <div className="lg:hidden space-y-3">
                <div className="space-y-1.5">
                  <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground px-0.5">
                    Loans
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    <StatCell
                      label="Given"
                      value={stats.totalLoanGiven}
                      currency={currency}
                      colorClass="text-blue-600 dark:text-blue-400"
                      bgClass="bg-blue-500/[0.06]"
                      borderClass="border-blue-500/20"
                      icon={<ArrowUpRight className="w-3.5 h-3.5" />}
                    />
                    <StatCell
                      label="Received"
                      value={stats.totalLoanReceived}
                      currency={currency}
                      colorClass="text-rose-600 dark:text-rose-400"
                      bgClass="bg-rose-500/[0.06]"
                      borderClass="border-rose-500/20"
                      icon={<ArrowDownLeft className="w-3.5 h-3.5" />}
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground px-0.5">
                    Repayments
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    <StatCell
                      label="Made"
                      value={stats.totalRepaymentMade}
                      currency={currency}
                      colorClass="text-emerald-600 dark:text-emerald-400"
                      bgClass="bg-emerald-500/[0.06]"
                      borderClass="border-emerald-500/20"
                      icon={<ArrowRightLeft className="w-3.5 h-3.5" />}
                    />
                    <StatCell
                      label="Received"
                      value={stats.totalRepaymentReceived}
                      currency={currency}
                      colorClass="text-emerald-600 dark:text-emerald-400"
                      bgClass="bg-emerald-500/[0.06]"
                      borderClass="border-emerald-500/20"
                      icon={<ArrowRightLeft className="w-3.5 h-3.5" />}
                    />
                  </div>
                </div>
              </div>

              {/* Desktop: flat 4-column grid */}
              <div className="hidden lg:grid lg:grid-cols-4 gap-2">
                <StatCell
                  label="Loans Given"
                  value={stats.totalLoanGiven}
                  currency={currency}
                  colorClass="text-blue-600 dark:text-blue-400"
                  bgClass="bg-blue-500/[0.06]"
                  borderClass="border-blue-500/20"
                  icon={<ArrowUpRight className="w-3.5 h-3.5" />}
                />
                <StatCell
                  label="Loans Received"
                  value={stats.totalLoanReceived}
                  currency={currency}
                  colorClass="text-rose-600 dark:text-rose-400"
                  bgClass="bg-rose-500/[0.06]"
                  borderClass="border-rose-500/20"
                  icon={<ArrowDownLeft className="w-3.5 h-3.5" />}
                />
                <StatCell
                  label="Repayments Made"
                  value={stats.totalRepaymentMade}
                  currency={currency}
                  colorClass="text-emerald-600 dark:text-emerald-400"
                  bgClass="bg-emerald-500/[0.06]"
                  borderClass="border-emerald-500/20"
                  icon={<ArrowRightLeft className="w-3.5 h-3.5" />}
                />
                <StatCell
                  label="Repayments Received"
                  value={stats.totalRepaymentReceived}
                  currency={currency}
                  colorClass="text-emerald-600 dark:text-emerald-400"
                  bgClass="bg-emerald-500/[0.06]"
                  borderClass="border-emerald-500/20"
                  icon={<ArrowRightLeft className="w-3.5 h-3.5" />}
                />
              </div>

              {/* Other flows — collapsible */}
              {otherFlowsTotal > 0 && (
                <div className="rounded-2xl border border-border/40 overflow-hidden">
                  <button
                    type="button"
                    className="w-full flex items-center gap-3 px-3.5 py-3 bg-muted/20 hover:bg-muted/30 active:bg-muted/40 transition-colors"
                    onClick={() => setOtherFlowsOpen((prev) => !prev)}
                  >
                    <div className="flex-1 min-w-0 text-left">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                        Other flows
                      </p>
                      <p className="text-xs font-semibold text-foreground tabular-nums">
                        {formatCurrency(otherFlowsTotal, currency)}
                      </p>
                    </div>
                    <ChevronDown
                      className={cn(
                        "w-3.5 h-3.5 text-muted-foreground shrink-0 transition-transform duration-200",
                        otherFlowsOpen && "rotate-180",
                      )}
                    />
                  </button>
                  {otherFlowsOpen && (
                    <div className="px-3.5 py-3 border-t border-border/30 grid grid-cols-2 lg:grid-cols-4 gap-x-4 gap-y-3">
                      {otherFlows.map((flow) => (
                        <div key={flow.label} className="space-y-0.5">
                          <p className="text-[10px] font-medium text-muted-foreground">
                            {flow.label}
                          </p>
                          <p className={cn("text-sm font-bold tabular-nums", flow.colorClass)}>
                            {formatCurrency(flow.value, currency)}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : null}
        </CardContent>
      </div>
    </Card>
  );
}
