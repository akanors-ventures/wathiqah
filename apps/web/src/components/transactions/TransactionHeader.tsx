import { format } from "date-fns";
import {
  ArrowRightLeft,
  CalendarDays,
  CheckCircle2,
  Edit2,
  Gift,
  Split,
  Trash2,
} from "lucide-react";
import { OrgAttributionBadge } from "@/components/transactions/OrgAttributionBadge";
import { TransactionAmount } from "@/components/transactions/TransactionAmount";
import { Button } from "@/components/ui/button";
import { SupporterBadge } from "@/components/ui/supporter-badge";
import { formatCurrency } from "@/lib/utils/formatters";
import type { TransactionDetail, TransactionDetailView } from "@/lib/utils/transactionDetailView";
import { AssetCategory, TransactionType } from "@/types/__generated__/graphql";

interface TransactionHeaderProps {
  transaction: TransactionDetail;
  view: TransactionDetailView;
  onEdit: () => void;
  onRemove: () => void;
  onConvertGift: () => void;
  onRecordReturn: () => void;
  onRecordRemit: () => void;
  onAllocate: () => void;
}

/** Title/amount/status row plus the row of transaction-level action buttons. */
export function TransactionHeader({
  transaction,
  view,
  onEdit,
  onRemove,
  onConvertGift,
  onRecordReturn,
  onRecordRemit,
  onAllocate,
}: TransactionHeaderProps) {
  const {
    canConvertToGift,
    canRecordReturn,
    canRecordRemit,
    canApplyCredit,
    canSettleFromCredit,
    remainingAmount,
    totalGifted,
    totalRepaid,
    totalRemitted,
    totalSettled,
  } = view;

  return (
    <div className="flex flex-col gap-3">
      {/* Row 1: title (wraps) + amount (pinned right) */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl sm:text-3xl font-bold text-neutral-900 dark:text-white leading-tight">
            <span className="capitalize">{transaction.type.toLowerCase().replace(/_/g, " ")}</span>{" "}
            {"—"}{" "}
            <span className="inline-flex items-center gap-2 flex-wrap">
              {transaction.contact?.name || "Personal"}
              {transaction.contact?.isSupporter && <SupporterBadge className="h-5 px-1.5" />}
              {transaction.status === "COMPLETED" && (
                <span className="inline-flex items-center gap-1 text-[10px] sm:text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                  <CheckCircle2 className="w-3 h-3" />
                  {transaction.type === TransactionType.LoanGiven ||
                  transaction.type === TransactionType.LoanReceived ||
                  transaction.type === TransactionType.Escrowed
                    ? "Settled"
                    : "Completed"}
                </span>
              )}
              {transaction.status === "CANCELLED" && (
                <span className="inline-flex items-center gap-1 text-[10px] sm:text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-600 border border-rose-500/20">
                  Cancelled
                </span>
              )}
            </span>
          </h1>
          <p className="text-neutral-500 dark:text-neutral-400 mt-1 flex items-center gap-2 text-sm">
            <CalendarDays size={14} />
            {format(new Date(transaction.date as string), "MMMM d, yyyy")}
          </p>
          <OrgAttributionBadge
            orgSourceTransaction={transaction.orgSourceTransaction}
            className="mt-2 w-fit"
          />
        </div>

        {/* Amount — flex-shrink-0 so it never compresses */}
        <div className="text-right flex-shrink-0">
          {transaction.category === AssetCategory.Funds && transaction.amount !== null && (
            <TransactionAmount
              type={transaction.type}
              amount={transaction.amount}
              currency={transaction.currency}
              className="text-xl sm:text-2xl"
            />
          )}
          {totalGifted > 0 && (
            <div className="text-xs sm:text-sm font-medium text-orange-600 dark:text-orange-400 mt-0.5">
              Gifted: {formatCurrency(totalGifted, transaction.currency)}
            </div>
          )}
          {totalRepaid > 0 && (
            <div className="text-xs sm:text-sm font-medium text-emerald-600 dark:text-emerald-400 mt-0.5">
              Repaid: {formatCurrency(totalRepaid, transaction.currency)}
            </div>
          )}
          {totalRemitted > 0 && (
            <div className="text-xs sm:text-sm font-medium text-emerald-600 dark:text-emerald-400 mt-0.5">
              Remitted: {formatCurrency(totalRemitted, transaction.currency)}
            </div>
          )}
          {(canConvertToGift ||
            canRecordReturn ||
            canRecordRemit ||
            canApplyCredit ||
            canSettleFromCredit) &&
            totalSettled > 0 && (
              <div className="text-xs sm:text-sm font-medium text-muted-foreground mt-0.5">
                Remaining: {formatCurrency(remainingAmount, transaction.currency)}
              </div>
            )}
          {transaction.category === AssetCategory.Item && transaction.quantity && (
            <div className="text-xl sm:text-2xl font-bold text-emerald-600 dark:text-emerald-400">
              {transaction.quantity} x {transaction.itemName || "Item"}
            </div>
          )}
        </div>
      </div>

      {/* Row 2: all actions in one wrapping row */}
      <div className="flex flex-wrap gap-2">
        {canRecordReturn && remainingAmount > 0 && (
          <Button
            variant="outline"
            size="sm"
            className="h-8 gap-1 text-emerald-600 border-emerald-200 hover:bg-emerald-50 dark:border-emerald-800 dark:hover:bg-emerald-950/30"
            onClick={onRecordReturn}
          >
            <ArrowRightLeft size={14} />
            Record Return
          </Button>
        )}
        {canRecordRemit && remainingAmount > 0 && (
          <Button
            variant="outline"
            size="sm"
            className="h-8 gap-1 text-emerald-600 border-emerald-200 hover:bg-emerald-50 dark:border-emerald-800 dark:hover:bg-emerald-950/30"
            onClick={onRecordRemit}
          >
            <ArrowRightLeft size={14} />
            Record Remittance
          </Button>
        )}
        {(canApplyCredit || canSettleFromCredit) && remainingAmount > 0 && (
          <Button
            variant="outline"
            size="sm"
            className="h-8 gap-1 text-emerald-600 border-emerald-200 hover:bg-emerald-50 dark:border-emerald-800 dark:hover:bg-emerald-950/30"
            onClick={onAllocate}
          >
            <Split size={14} />
            {canApplyCredit ? "Apply to obligations" : "Settle from a credit"}
          </Button>
        )}
        {canConvertToGift && remainingAmount > 0 && (
          <Button
            variant="outline"
            size="sm"
            className="h-8 gap-1 text-orange-600 border-orange-200 hover:bg-orange-50 dark:border-orange-800 dark:hover:bg-orange-950/30"
            onClick={onConvertGift}
          >
            <Gift size={14} />
            Convert to Gift
          </Button>
        )}
        {transaction.isMirroredFromProject ? (
          <span className="text-xs text-muted-foreground italic px-1 self-center">
            Synced from project — edit or delete it from the project page instead
          </span>
        ) : transaction.orgSourceTransactionId ? (
          <span className="text-xs text-muted-foreground italic px-1 self-center">
            Recorded on behalf of{" "}
            {transaction.orgSourceTransaction?.organisation?.name ?? "the organisation"} — edit or
            delete it from the organisation's ledger instead
          </span>
        ) : (
          <>
            <Button variant="outline" size="sm" className="h-8 gap-1" onClick={onEdit}>
              <Edit2 size={14} />
              Edit
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-8 gap-1 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30"
              onClick={onRemove}
            >
              <Trash2 size={14} />
              Remove
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
