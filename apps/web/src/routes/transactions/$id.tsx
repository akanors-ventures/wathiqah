import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@apollo/client/react";
import { GET_TRANSACTION } from "@/lib/apollo/queries/transactions";
import { TransactionWitnessList } from "@/components/transactions/TransactionWitnessList";
import { HistoryViewer } from "@/components/history/HistoryViewer";
import { ArrowLeft, Calendar, FileText, Package } from "lucide-react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { authGuard } from "@/utils/auth";

export const Route = createFileRoute("/transactions/$id")({
  component: TransactionDetailPage,
  beforeLoad: authGuard,
});

function TransactionDetailPage() {
  const { id } = Route.useParams();
  const { data, loading, error } = useQuery(GET_TRANSACTION, {
    variables: { id },
  });

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-200 border-t-emerald-600"></div>
      </div>
    );
  }

  if (error || !data?.transaction) {
    return (
      <div className="flex h-screen flex-col items-center justify-center p-4">
        <h2 className="text-xl font-bold text-red-600">
          Error loading transaction
        </h2>
        <p className="text-neutral-600">
          {error?.message || "Transaction not found"}
        </p>
        <Button asChild className="mt-4" variant="outline">
          <Link to="/">Go Home</Link>
        </Button>
      </div>
    );
  }

  const { transaction } = data;

  return (
    <div className="container mx-auto max-w-3xl p-4 py-8">
      <div className="mb-6">
        <Link
          to="/"
          className="mb-4 inline-flex items-center text-sm text-neutral-500 hover:text-emerald-600 transition-colors"
        >
          <ArrowLeft className="mr-1 h-4 w-4" /> Back to Dashboard
        </Link>

        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold text-neutral-900 dark:text-white">
              {transaction.type === "GIVEN"
                ? "Given to"
                : transaction.type === "RECEIVED"
                  ? "Received from"
                  : "Collected from"}{" "}
              {transaction.contact.name}
            </h1>
            <p className="text-neutral-500 dark:text-neutral-400 mt-1 flex items-center gap-2">
              <Calendar size={14} />
              {format(new Date(transaction.date as string), "MMMM d, yyyy")}
            </p>
          </div>
          <div className="text-right">
            {transaction.amount && (
              <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                {new Intl.NumberFormat("en-US", {
                  style: "currency",
                  currency: "SAR",
                }).format(transaction.amount)}
              </div>
            )}
            {transaction.quantity && (
              <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                {transaction.quantity} x {transaction.itemName || "Item"}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="grid gap-6">
        {/* Transaction Details Card */}
        <div className="rounded-xl border border-neutral-200 bg-white p-6 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
          <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold text-neutral-900 dark:text-white">
            <FileText size={20} className="text-emerald-600" />
            Details
          </h3>

          <div className="space-y-4">
            {transaction.description && (
              <div>
                <span className="block text-sm font-medium text-neutral-500">
                  Description
                </span>
                <p className="mt-1 text-neutral-900 dark:text-neutral-100">
                  {transaction.description}
                </p>
              </div>
            )}

            {transaction.itemName && (
              <div>
                <span className="block text-sm font-medium text-neutral-500">
                  Item
                </span>
                <div className="mt-1 flex items-center gap-2 text-neutral-900 dark:text-neutral-100">
                  <Package size={16} className="text-neutral-400" />
                  {transaction.itemName}
                  {transaction.quantity && (
                    <span className="text-neutral-500">
                      x{transaction.quantity}
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Witnesses Section */}
        <div className="rounded-xl border border-neutral-200 bg-white p-6 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
          <TransactionWitnessList
            witnesses={
              transaction.witnesses.filter(
                (w): w is NonNullable<typeof w> => w !== null,
              ) as any
            }
          />
        </div>

        {/* History Section */}
        <div className="rounded-xl border border-neutral-200 bg-white p-6 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
          <HistoryViewer
            history={
              transaction.history.filter(
                (h): h is NonNullable<typeof h> => h !== null,
              ) as any
            }
          />
        </div>
      </div>
    </div>
  );
}
