import { useQuery } from "@apollo/client/react";
import { endOfMonth, format, startOfMonth, subMonths } from "date-fns";
import {
  ArrowDownLeft,
  ArrowRightLeft,
  ArrowUpRight,
  Calendar,
  ChevronDown,
  Layers,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
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
import { GET_TOTAL_BALANCE } from "@/lib/apollo/queries/transactions";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/utils/formatters";

type Period = "THIS_MONTH" | "LAST_MONTH" | "LAST_3_MONTHS" | "CUSTOM";
type CustomRange = { from: string | null; to: string | null };

function periodToFilter(period: Period, custom: CustomRange) {
  const now = new Date();
  switch (period) {
    case "THIS_MONTH":
      return { startDate: startOfMonth(now).toISOString(), endDate: endOfMonth(now).toISOString() };
    case "LAST_MONTH": {
      const prev = subMonths(now, 1);
      return {
        startDate: startOfMonth(prev).toISOString(),
        endDate: endOfMonth(prev).toISOString(),
      };
    }
    case "LAST_3_MONTHS":
      return {
        startDate: startOfMonth(subMonths(now, 2)).toISOString(),
        endDate: endOfMonth(now).toISOString(),
      };
    case "CUSTOM":
      return {
        startDate: custom.from ? new Date(custom.from).toISOString() : undefined,
        endDate: custom.to ? new Date(custom.to).toISOString() : undefined,
      };
  }
}

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
    <div className={cn("flex flex-col gap-2 p-3.5 rounded-2xl border", bgClass, borderClass)}>
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
          {label}
        </span>
        <span className={cn("opacity-70", colorClass)}>{icon}</span>
      </div>
      <span className={cn("text-base font-bold tabular-nums", colorClass)}>
        {formatCurrency(value, currency)}
      </span>
    </div>
  );
}

function StatCellSkeleton() {
  return (
    <div className="flex flex-col gap-2 p-3.5 rounded-2xl border border-border/50 bg-muted/20">
      <Skeleton className="h-3 w-16" />
      <Skeleton className="h-5 w-24" />
    </div>
  );
}

interface TransactionSummaryCardProps {
  onPeriodFilterChange?: (range: { from: string | null; to: string | null }) => void;
}

export function TransactionSummaryCard({ onPeriodFilterChange }: TransactionSummaryCardProps) {
  const [period, setPeriod] = useState<Period>("THIS_MONTH");
  const [customRange, setCustomRange] = useState<CustomRange>({ from: null, to: null });
  const [otherFlowsOpen, setOtherFlowsOpen] = useState(false);

  const periodFilter = useMemo(() => periodToFilter(period, customRange), [period, customRange]);
  const skipCustom = period === "CUSTOM" && (!customRange.from || !customRange.to);

  const { data: allTimeData, loading: allTimeLoading } = useQuery(GET_TOTAL_BALANCE, {
    fetchPolicy: "cache-and-network",
  });

  const { data: periodData, loading: periodLoading } = useQuery(GET_TOTAL_BALANCE, {
    variables: { filter: periodFilter },
    fetchPolicy: "cache-and-network",
    skip: skipCustom,
  });

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

  const allTime = allTimeData?.totalBalance;
  const period_ = periodData?.totalBalance;
  const currency = allTime?.currency ?? period_?.currency ?? "NGN";

  const otherFlows = period_
    ? [
        {
          label: "Gift Given",
          value: period_.totalGiftGiven,
          colorClass: "text-pink-600 dark:text-pink-400",
        },
        {
          label: "Gift Received",
          value: period_.totalGiftReceived,
          colorClass: "text-purple-600 dark:text-purple-400",
        },
        {
          label: "Advance Paid",
          value: period_.totalAdvancePaid,
          colorClass: "text-orange-600 dark:text-orange-400",
        },
        {
          label: "Advance Received",
          value: period_.totalAdvanceReceived,
          colorClass: "text-purple-600 dark:text-purple-400",
        },
        {
          label: "Deposit Paid",
          value: period_.totalDepositPaid,
          colorClass: "text-orange-600 dark:text-orange-400",
        },
        {
          label: "Deposit Received",
          value: period_.totalDepositReceived,
          colorClass: "text-purple-600 dark:text-purple-400",
        },
        {
          label: "Escrowed",
          value: period_.totalEscrowed,
          colorClass: "text-teal-600 dark:text-teal-400",
        },
        {
          label: "Remitted",
          value: period_.totalRemitted,
          colorClass: "text-orange-600 dark:text-orange-400",
        },
      ].filter((f) => f.value > 0)
    : [];
  const otherFlowsTotal = otherFlows.reduce((sum, f) => sum + f.value, 0);

  return (
    <Card className="overflow-hidden border-border/60">
      {/* All-time net balance */}
      <div className="relative px-5 pt-5 pb-4 bg-muted/30 border-b border-border/40">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1.5 min-w-0">
            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
              All-time net balance
            </p>
            {allTimeLoading && !allTime ? (
              <Skeleton className="h-8 w-40 rounded-full" />
            ) : allTime ? (
              <BalanceIndicator
                amount={allTime.netBalance}
                currency={allTime.currency}
                className="text-xl px-3.5 py-1.5 h-auto"
              />
            ) : null}
          </div>
          <div className="shrink-0 p-2.5 rounded-xl bg-primary/10 text-primary">
            <Layers className="w-4 h-4" />
          </div>
        </div>
        <div className="absolute -right-8 -bottom-8 w-32 h-32 rounded-full bg-primary/5 blur-2xl pointer-events-none" />
      </div>

      {/* Period breakdown */}
      <CardContent className="p-5 space-y-4">
        {/* Period selector */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Calendar className="w-3.5 h-3.5 shrink-0" />
            <Select value={period} onValueChange={(v) => setPeriod(v as Period)}>
              <SelectTrigger className="h-8 w-[160px] text-xs font-semibold border-border/60">
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

        {period === "CUSTOM" && <DateRangePicker value={customRange} onChange={setCustomRange} />}

        {/* Stats grid */}
        {skipCustom ? (
          <p className="text-xs text-muted-foreground text-center py-4">
            Select a start and end date to view stats.
          </p>
        ) : periodLoading && !period_ ? (
          <div className="grid grid-cols-2 gap-2.5">
            {(["sk-lg", "sk-lr", "sk-rm", "sk-rr"] as const).map((k) => (
              <StatCellSkeleton key={k} />
            ))}
          </div>
        ) : period_ ? (
          <div className="space-y-3">
            {/* Loans */}
            <div className="space-y-1.5">
              <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground px-0.5">
                Loans
              </p>
              <div className="grid grid-cols-2 gap-2">
                <StatCell
                  label="Given"
                  value={period_.totalLoanGiven}
                  currency={currency}
                  colorClass="text-blue-600 dark:text-blue-400"
                  bgClass="bg-blue-500/[0.06]"
                  borderClass="border-blue-500/20"
                  icon={<ArrowUpRight className="w-3.5 h-3.5" />}
                />
                <StatCell
                  label="Received"
                  value={period_.totalLoanReceived}
                  currency={currency}
                  colorClass="text-rose-600 dark:text-rose-400"
                  bgClass="bg-rose-500/[0.06]"
                  borderClass="border-rose-500/20"
                  icon={<ArrowDownLeft className="w-3.5 h-3.5" />}
                />
              </div>
            </div>

            {/* Repayments */}
            <div className="space-y-1.5">
              <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground px-0.5">
                Repayments
              </p>
              <div className="grid grid-cols-2 gap-2">
                <StatCell
                  label="Made"
                  value={period_.totalRepaymentMade}
                  currency={currency}
                  colorClass="text-emerald-600 dark:text-emerald-400"
                  bgClass="bg-emerald-500/[0.06]"
                  borderClass="border-emerald-500/20"
                  icon={<ArrowRightLeft className="w-3.5 h-3.5" />}
                />
                <StatCell
                  label="Received"
                  value={period_.totalRepaymentReceived}
                  currency={currency}
                  colorClass="text-emerald-600 dark:text-emerald-400"
                  bgClass="bg-emerald-500/[0.06]"
                  borderClass="border-emerald-500/20"
                  icon={<ArrowRightLeft className="w-3.5 h-3.5" />}
                />
              </div>
            </div>

            {/* Other flows — collapsible */}
            {otherFlowsTotal > 0 && (
              <div className="rounded-2xl border border-border/40 overflow-hidden">
                <button
                  type="button"
                  className="w-full flex items-center gap-3 px-3.5 py-3 bg-muted/20 hover:bg-muted/30 transition-colors"
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
                  <div className="px-3.5 py-3 border-t border-border/30 grid grid-cols-2 gap-x-4 gap-y-3">
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
    </Card>
  );
}
