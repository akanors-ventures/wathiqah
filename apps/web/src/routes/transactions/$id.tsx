import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { format } from "date-fns";
import {
  ArrowLeft,
  Calendar,
  Edit2,
  FileText,
  Gift,
  Package,
  Trash2,
  UserPlus,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { HistoryViewer } from "@/components/history/HistoryViewer";
import { AddWitnessDialog } from "@/components/transactions/AddWitnessDialog";
import { ConvertGiftDialog } from "@/components/transactions/ConvertGiftDialog";
import { EditTransactionDialog } from "@/components/transactions/EditTransactionDialog";
import { TransactionWitnessList } from "@/components/transactions/TransactionWitnessList";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { PageLoader } from "@/components/ui/page-loader";
import { useTransaction } from "@/hooks/useTransaction";
import { useTransactions } from "@/hooks/useTransactions";
import { formatCurrency } from "@/lib/utils/formatters";
import { AssetCategory, TransactionType, type Witness } from "@/types/__generated__/graphql";
import { authGuard } from "@/utils/auth";

export const Route = createFileRoute("/transactions/$id")({
  component: TransactionDetailPage,
  beforeLoad: (ctx) => authGuard({ location: ctx.location }),
});

function TransactionDetailPage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const [isAddWitnessOpen, setIsAddWitnessOpen] = useState(false);
  const [isConvertGiftOpen, setIsConvertGiftOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isRemoveDialogOpen, setIsRemoveDialogOpen] = useState(false);
  const { transaction, loading, error, refetch } = useTransaction(id);
  const { removeTransaction, removing } = useTransactions();

  const handleRemove = async () => {
    try {
      await removeTransaction(id);
      toast.success("Transaction removed successfully");
      setIsRemoveDialogOpen(false);
      navigate({ to: "/" });
    } catch (err) {
      toast.error("Failed to remove transaction");
      console.error(err);
    }
  };

  if (loading) {
    return <PageLoader />;
  }

  if (error || !transaction) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center p-4">
        <h2 className="text-xl font-bold text-red-600">Error loading transaction</h2>
        <p className="text-neutral-600">{error?.message || "Transaction not found"}</p>
        <Button asChild className="mt-4" variant="outline">
          <Link to="/">Go Home</Link>
        </Button>
      </div>
    );
  }

  const currentTransaction = transaction;
  const conversions = currentTransaction.conversions ?? [];
  const witnesses = currentTransaction.witnesses ?? [];
  const history = currentTransaction.history ?? [];

  const canConvertToGift =
    currentTransaction.category === AssetCategory.Funds &&
    (currentTransaction.type === TransactionType.Given ||
      currentTransaction.type === TransactionType.Received);

  const totalConverted = conversions.reduce(
    (sum, conversion) => sum + (conversion?.amount || 0),
    0,
  );

  const remainingAmount = Math.max(0, (currentTransaction.amount || 0) - totalConverted);

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
              {currentTransaction.type === TransactionType.Given
                ? "Given to"
                : currentTransaction.type === TransactionType.Received
                  ? "Received from"
                  : currentTransaction.type === TransactionType.Returned
                    ? currentTransaction.returnDirection === "TO_ME"
                      ? "Returned to me by"
                      : "Returned to"
                    : currentTransaction.type === TransactionType.Gift
                      ? currentTransaction.returnDirection === "TO_ME"
                        ? "Gift received from"
                        : "Gift given to"
                      : currentTransaction.type === TransactionType.Income
                        ? "Income from"
                        : currentTransaction.type === TransactionType.Expense
                          ? "Expense to"
                          : "Collected from"}{" "}
              {currentTransaction.contact?.name || "Personal"}
            </h1>
            <p className="text-neutral-500 dark:text-neutral-400 mt-1 flex items-center gap-2">
              <Calendar size={14} />
              {format(new Date(currentTransaction.date as string), "MMMM d, yyyy")}
            </p>
          </div>
          <div className="text-right flex flex-col items-end gap-2">
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                className="h-8 gap-1"
                onClick={() => setIsEditOpen(true)}
              >
                <Edit2 size={14} />
                Edit
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-8 gap-1 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30"
                onClick={() => setIsRemoveDialogOpen(true)}
              >
                <Trash2 size={14} />
                Remove
              </Button>
            </div>
            {currentTransaction.category === AssetCategory.Funds &&
              currentTransaction.amount !== null && (
                <div
                  className={`text-2xl font-bold ${
                    currentTransaction.type === "GIVEN"
                      ? "text-blue-600 dark:text-blue-400"
                      : currentTransaction.type === "RETURNED"
                        ? currentTransaction.returnDirection === "TO_ME"
                          ? "text-emerald-600 dark:text-emerald-400"
                          : "text-blue-600 dark:text-blue-400"
                        : currentTransaction.type === "INCOME"
                          ? "text-emerald-600 dark:text-emerald-400"
                          : currentTransaction.type === "GIFT"
                            ? currentTransaction.returnDirection === "TO_ME"
                              ? "text-purple-600 dark:text-purple-400"
                              : "text-pink-600 dark:text-pink-400"
                            : "text-red-600 dark:text-red-400"
                  }`}
                >
                  {currentTransaction.type === "GIVEN" ||
                  (currentTransaction.type === "RETURNED" &&
                    currentTransaction.returnDirection === "TO_ME") ||
                  currentTransaction.type === "INCOME" ||
                  (currentTransaction.type === "GIFT" &&
                    currentTransaction.returnDirection === "TO_ME")
                    ? "+"
                    : "-"}
                  {formatCurrency(currentTransaction.amount, currentTransaction.currency)}
                </div>
              )}
            {totalConverted > 0 && (
              <div className="text-sm font-medium text-orange-600 dark:text-orange-400">
                Converted to gift: {formatCurrency(totalConverted, currentTransaction.currency)}
              </div>
            )}
            {currentTransaction.category === AssetCategory.Item && currentTransaction.quantity && (
              <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                {currentTransaction.quantity} x {currentTransaction.itemName || "Item"}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="grid gap-6">
        {/* Actions bar if applicable */}
        {canConvertToGift && remainingAmount > 0 && (
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              size="sm"
              className="flex items-center gap-2 text-orange-600 border-orange-200 hover:bg-orange-50"
              onClick={() => setIsConvertGiftOpen(true)}
            >
              <Gift size={16} />
              Convert to Gift
            </Button>
          </div>
        )}

        {/* Transaction Details Card */}
        <div className="rounded-xl border border-neutral-200 bg-white p-6 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
          <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold text-neutral-900 dark:text-white">
            <FileText size={20} className="text-emerald-600" />
            Details
          </h3>

          <div className="space-y-4">
            {currentTransaction.parentId && (
              <div className="rounded-lg bg-neutral-50 p-3 text-sm text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400">
                This transaction is a conversion from another transaction.
              </div>
            )}

            {currentTransaction.description && (
              <div>
                <span className="block text-sm font-medium text-neutral-500">Description</span>
                <p className="mt-1 text-neutral-900 dark:text-neutral-100">
                  {currentTransaction.description}
                </p>
              </div>
            )}

            {currentTransaction.category === AssetCategory.Item && currentTransaction.itemName && (
              <div>
                <span className="block text-sm font-medium text-neutral-500">Item</span>
                <div className="mt-1 flex items-center gap-2 text-neutral-900 dark:text-neutral-100">
                  <Package size={16} className="text-neutral-400" />
                  {currentTransaction.itemName}
                  {currentTransaction.quantity && (
                    <span className="text-neutral-500">x{currentTransaction.quantity}</span>
                  )}
                </div>
              </div>
            )}

            {currentTransaction.returnDirection && (
              <div>
                <span className="block text-sm font-medium text-neutral-500">Return Direction</span>
                <p className="mt-1 text-neutral-900 dark:text-neutral-100">
                  {currentTransaction.returnDirection === "TO_ME" ? "To Me" : "To Contact"}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Conversions Section if applicable */}
        {conversions.length > 0 && (
          <div className="rounded-xl border border-neutral-200 bg-white p-6 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
            <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold text-neutral-900 dark:text-white">
              <Gift size={20} className="text-orange-600" />
              Gift Conversions
            </h3>
            <div className="space-y-3">
              {conversions.map((conversion) => (
                <div
                  key={conversion?.id}
                  className="flex items-center justify-between p-3 rounded-lg border border-neutral-100 dark:border-neutral-800"
                >
                  <div>
                    <p className="text-sm font-medium">
                      {format(new Date(conversion?.date as string), "MMM d, yyyy")}
                    </p>
                    <p className="text-xs text-neutral-500">Gifted back</p>
                  </div>
                  <div className="font-semibold text-orange-600">
                    {formatCurrency(
                      conversion?.amount || 0,
                      conversion?.currency || currentTransaction.currency,
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Witnesses Section */}
        <div className="rounded-xl border border-neutral-200 bg-white p-6 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <UserPlus size={20} className="text-emerald-600" />
              Witnesses
            </h3>
            <Button variant="outline" size="sm" onClick={() => setIsAddWitnessOpen(true)}>
              Add Witness
            </Button>
          </div>
          <TransactionWitnessList
            witnesses={witnesses.filter((w): w is NonNullable<typeof w> => w !== null) as Witness[]}
          />
        </div>

        <EditTransactionDialog
          transaction={currentTransaction}
          open={isEditOpen}
          onOpenChange={setIsEditOpen}
        />

        <AddWitnessDialog
          isOpen={isAddWitnessOpen}
          onClose={() => setIsAddWitnessOpen(false)}
          transactionId={id}
        />

        <AlertDialog open={isRemoveDialogOpen} onOpenChange={setIsRemoveDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently delete the transaction if it has no witnesses. If it has
                witnesses, it will be marked as CANCELLED and preserved in the audit log.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={removing}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleRemove}
                disabled={removing}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                {removing ? "Removing..." : "Remove"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <ConvertGiftDialog
          isOpen={isConvertGiftOpen}
          onClose={() => setIsConvertGiftOpen(false)}
          transaction={{
            id: currentTransaction.id,
            amount: remainingAmount,
            currency: currentTransaction.currency,
            type: currentTransaction.type,
            contactId: currentTransaction.contact?.id,
            description: currentTransaction.description,
          }}
          onSuccess={() => refetch()}
        />

        {/* History Section */}
        <div className="rounded-xl border border-neutral-200 bg-white p-6 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
          <HistoryViewer
            history={history
              .filter((h): h is NonNullable<typeof h> => h !== null)
              .map((h) => ({
                id: h.id,
                changeType: h.changeType,
                createdAt: String(h.createdAt),
                user: {
                  id: h.user?.id ?? "unknown",
                  name: h.user?.name ?? "Unknown",
                  email: h.user?.email ?? "unknown@example.com",
                },
                previousState: (h.previousState ?? null) as Record<string, unknown> | null,
                newState: (h.newState ?? null) as Record<string, unknown> | null,
              }))}
          />
        </div>
      </div>
    </div>
  );
}
