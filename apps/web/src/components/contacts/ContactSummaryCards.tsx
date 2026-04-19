import {
  ArrowDownLeft,
  ArrowRightLeft,
  ArrowUpRight,
  ChevronDown,
  ChevronRight,
  Scale,
} from "lucide-react";
import { useState } from "react";
import { BalanceIndicator } from "@/components/ui/balance-indicator";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils/formatters";
import type { TransactionsSummary } from "@/types/__generated__/graphql";

interface ContactSummaryCardsProps {
  summary: TransactionsSummary;
  contactBalance: number;
}

interface SecondaryFlow {
  label: string;
  value: number;
  colorClass: string;
}

export function ContactSummaryCards({ summary, contactBalance }: ContactSummaryCardsProps) {
  const [otherFlowsOpen, setOtherFlowsOpen] = useState(false);

  const secondaryFlows: SecondaryFlow[] = [
    { label: "Gift Given", value: summary.totalGiftGiven, colorClass: "text-pink-600" },
    { label: "Gift Received", value: summary.totalGiftReceived, colorClass: "text-purple-600" },
    { label: "Advance Paid", value: summary.totalAdvancePaid, colorClass: "text-orange-600" },
    {
      label: "Advance Received",
      value: summary.totalAdvanceReceived,
      colorClass: "text-purple-600",
    },
    { label: "Deposit Paid", value: summary.totalDepositPaid, colorClass: "text-orange-600" },
    {
      label: "Deposit Received",
      value: summary.totalDepositReceived,
      colorClass: "text-purple-600",
    },
    { label: "Escrowed", value: summary.totalEscrowed, colorClass: "text-emerald-600" },
    { label: "Remitted", value: summary.totalRemitted, colorClass: "text-orange-600" },
  ];

  const visibleSecondaryFlows = secondaryFlows.filter((f) => f.value > 0);
  const hasOtherFlows = visibleSecondaryFlows.length > 0;

  return (
    <div className="space-y-4">
      {/* Row 1: Net Balance + Loans */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Net Balance with Contact</CardTitle>
            <Scale className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <BalanceIndicator
              amount={contactBalance}
              currency="NGN"
              className="text-2xl px-3 py-1 h-auto"
            />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Loaned Out</CardTitle>
            <ArrowUpRight className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {formatCurrency(summary.totalLoanGiven, summary.currency)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Borrowed</CardTitle>
            <ArrowDownLeft className="h-4 w-4 text-rose-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-rose-600">
              {formatCurrency(summary.totalLoanReceived, summary.currency)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Row 2: Repayments */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Repayments Received</CardTitle>
            <ArrowRightLeft className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600">
              {formatCurrency(summary.totalRepaymentReceived, summary.currency)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Repayments Made</CardTitle>
            <ArrowRightLeft className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600">
              {formatCurrency(summary.totalRepaymentMade, summary.currency)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Other Flows — only renders when at least one secondary value is non-zero */}
      {hasOtherFlows && (
        <Card>
          <CardHeader
            className="flex flex-row items-center justify-between space-y-0 pb-2 cursor-pointer select-none"
            onClick={() => setOtherFlowsOpen((prev) => !prev)}
          >
            <CardTitle className="text-sm font-medium">Other Flows</CardTitle>
            {otherFlowsOpen ? (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            )}
          </CardHeader>
          {otherFlowsOpen && (
            <CardContent>
              <div className="grid gap-3 grid-cols-2 md:grid-cols-4">
                {visibleSecondaryFlows.map((flow) => (
                  <div key={flow.label} className="space-y-1">
                    <p className="text-xs font-medium text-muted-foreground">{flow.label}</p>
                    <p className={`text-base font-bold ${flow.colorClass}`}>
                      {formatCurrency(flow.value, summary.currency)}
                    </p>
                  </div>
                ))}
              </div>
            </CardContent>
          )}
        </Card>
      )}
    </div>
  );
}
