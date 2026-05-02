import { useQuery } from "@apollo/client/react";
import { endOfMonth, startOfMonth } from "date-fns";
import { Layers } from "lucide-react";
import { useCallback, useState } from "react";
import { BalanceSummaryCard } from "@/components/ui/balance-summary-card";
import { GET_TOTAL_BALANCE } from "@/lib/apollo/queries/transactions";

type QueryFilter = { startDate: string; endDate: string };

function thisMonthFilter(): QueryFilter {
  const now = new Date();
  return {
    startDate: startOfMonth(now).toISOString(),
    endDate: endOfMonth(now).toISOString(),
  };
}

interface TransactionSummaryCardProps {
  onPeriodFilterChange?: (range: { from: string | null; to: string | null }) => void;
}

export function TransactionSummaryCard({ onPeriodFilterChange }: TransactionSummaryCardProps) {
  const [queryFilter, setQueryFilter] = useState<QueryFilter | undefined>(thisMonthFilter);

  const { data: allTimeData, loading: allTimeLoading } = useQuery(GET_TOTAL_BALANCE, {
    fetchPolicy: "cache-and-network",
  });

  const { data: periodData, loading: periodLoading } = useQuery(GET_TOTAL_BALANCE, {
    variables: { filter: queryFilter },
    fetchPolicy: "cache-and-network",
    skip: !queryFilter,
  });

  const handlePeriodChange = useCallback(
    (range: { from: string | null; to: string | null }) => {
      if (range.from && range.to) {
        setQueryFilter({
          startDate: new Date(range.from).toISOString(),
          endDate: new Date(range.to).toISOString(),
        });
      } else {
        setQueryFilter(undefined);
      }
      onPeriodFilterChange?.(range);
    },
    [onPeriodFilterChange],
  );

  const allTime = allTimeData?.totalBalance;
  const period_ = periodData?.totalBalance;
  const currency = allTime?.currency ?? period_?.currency ?? "NGN";

  const displayStats = queryFilter ? period_ : allTime;
  const displayStatsLoading = queryFilter ? periodLoading && !period_ : allTimeLoading && !allTime;

  return (
    <BalanceSummaryCard
      leftTitle="All-time net balance"
      leftIcon={<Layers className="w-4 h-4" />}
      balance={allTime?.netBalance}
      balanceCurrency={currency}
      balanceLoading={allTimeLoading && !allTime}
      stats={displayStats}
      statsLoading={displayStatsLoading}
      onPeriodFilterChange={handlePeriodChange}
    />
  );
}
