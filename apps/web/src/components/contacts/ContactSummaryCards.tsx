import { Scale } from "lucide-react";
import { BalanceSummaryCard } from "@/components/ui/balance-summary-card";
import type { TransactionsSummary } from "@/types/__generated__/graphql";

interface ContactSummaryCardsProps {
  summary: TransactionsSummary | undefined;
  contactBalance: number;
  loading?: boolean;
  onPeriodFilterChange: (range: { from: string | null; to: string | null }) => void;
}

export function ContactSummaryCards({
  summary,
  contactBalance,
  loading,
  onPeriodFilterChange,
}: ContactSummaryCardsProps) {
  return (
    <BalanceSummaryCard
      leftTitle="Net Balance with Contact"
      leftIcon={<Scale className="w-4 h-4" />}
      balance={contactBalance}
      balanceCurrency={summary?.currency ?? "NGN"}
      stats={summary}
      statsLoading={loading && !summary}
      onPeriodFilterChange={onPeriodFilterChange}
    />
  );
}
