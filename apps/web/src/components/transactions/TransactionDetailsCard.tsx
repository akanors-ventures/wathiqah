import { Link } from "@tanstack/react-router";
import { FileText, Package } from "lucide-react";
import type { TransactionDetail } from "@/lib/utils/transactionDetailView";
import { AssetCategory, TransactionType } from "@/types/__generated__/graphql";

/** Parent-link callout (if any), description, and item info. */
export function TransactionDetailsCard({ transaction }: { transaction: TransactionDetail }) {
  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-6 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
      <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold text-neutral-900 dark:text-white">
        <FileText size={20} className="text-emerald-600" />
        Details
      </h3>

      <div className="space-y-4">
        {transaction.parentId && (
          <div className="rounded-lg bg-neutral-50 p-3 text-sm text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400">
            {transaction.type === TransactionType.RepaymentMade ||
            transaction.type === TransactionType.RepaymentReceived ? (
              <>
                This is a repayment linked to{" "}
                <Link
                  to="/transactions/$id"
                  params={{ id: transaction.parentId }}
                  className="text-emerald-600 hover:underline font-medium"
                >
                  the original loan
                </Link>
                .
              </>
            ) : transaction.type === TransactionType.Remitted ? (
              <>
                This is a remittance linked to{" "}
                <Link
                  to="/transactions/$id"
                  params={{ id: transaction.parentId }}
                  className="text-emerald-600 hover:underline font-medium"
                >
                  the original escrow
                </Link>
                .
              </>
            ) : (
              <>
                This transaction is a gift converted from{" "}
                <Link
                  to="/transactions/$id"
                  params={{ id: transaction.parentId }}
                  className="text-emerald-600 hover:underline font-medium"
                >
                  another transaction
                </Link>
                .
              </>
            )}
          </div>
        )}

        {transaction.description && (
          <div>
            <span className="block text-sm font-medium text-neutral-500">Description</span>
            <p className="mt-1 text-neutral-900 dark:text-neutral-100">{transaction.description}</p>
          </div>
        )}

        {transaction.category === AssetCategory.Item && transaction.itemName && (
          <div>
            <span className="block text-sm font-medium text-neutral-500">Item</span>
            <div className="mt-1 flex items-center gap-2 text-neutral-900 dark:text-neutral-100">
              <Package size={16} className="text-neutral-400" />
              {transaction.itemName}
              {transaction.quantity && (
                <span className="text-neutral-500">x{transaction.quantity}</span>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
