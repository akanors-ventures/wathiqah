import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { format } from "date-fns";
import {
  ArrowLeft,
  ArrowRightLeft,
  CalendarDays,
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
import { RecordReturnDialog } from "@/components/transactions/RecordReturnDialog";
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
import { SupporterBadge } from "@/components/ui/supporter-badge";
import { useTransaction } from "@/hooks/useTransaction";
import { useTransactions } from "@/hooks/useTransactions";
import { useRemoveWitness, useResendWitnessInvitation } from "@/hooks/useWitnesses";
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
  const [isRecordReturnOpen, setIsRecordReturnOpen] = useState(false);
  const [isRemoveDialogOpen, setIsRemoveDialogOpen] = useState(false);
  const [resendingId, setResendingId] = useState<string | null>(null);
  const [removingWitnessId, setRemovingWitnessId] = useState<string | null>(null);

  const { transaction, loading, error, refetch } = useTransaction(id);
  const { removeTransaction, removing } = useTransactions();

  const { resend } = useResendWitnessInvitation(() => {
    toast.success("Invitation resent successfully");
    setResendingId(null);
  });

  const { remove: removeWitness } = useRemoveWitness(() => {
    toast.success("Witness removed successfully");
    setRemovingWitnessId(null);
    refetch();
  });

  const handleResendWitness = async (witnessId: string) => {
    setResendingId(witnessId);
    try {
      await resend(witnessId);
    } catch (_err) {
      toast.error("Failed to resend invitation");
      setResendingId(null);
    }
  };

  const handleRemoveWitness = async (witnessId: string) => {
    setRemovingWitnessId(witnessId);
    try {
      await removeWitness(witnessId);
    } catch (_err) {
      toast.error("Failed to remove witness");
      setRemovingWitnessId(null);
    }
  };

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
    (currentTransaction.type === TransactionType.LoanGiven ||
      currentTransaction.type === TransactionType.LoanReceived);

  const canRecordReturn =
    currentTransaction.category === AssetCategory.Funds &&
    (currentTransaction.type === TransactionType.LoanGiven ||
      currentTransaction.type === TransactionType.LoanReceived) &&
    !!currentTransaction.contact;

  const totalConverted = conversions.reduce(
    (sum, conversion) => sum + (conversion?.amount || 0),
    0,
  );

  const remainingAmount = Math.max(0, (currentTransaction.amount || 0) - totalConverted);

  return (
    <div className="container mx-auto max-w-3xl p-4 py-8 overflow-x-hidden">
      <div className="mb-6">
        <Link
          to="/"
          className="mb-4 inline-flex items-center text-sm text-neutral-500 hover:text-emerald-600 transition-colors"
        >
          <ArrowLeft className="mr-1 h-4 w-4" /> Back to Dashboard
        </Link>

        <div className="flex flex-col gap-3">
          {/* Row 1: title (wraps) + amount (pinned right) */}
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h1 className="text-2xl sm:text-3xl font-bold text-neutral-900 dark:text-white leading-tight">
                <span className="capitalize">
                  {currentTransaction.type.toLowerCase().replace(/_/g, " ")}
                </span>{" "}
                {"—"}{" "}
                <span className="inline-flex items-center gap-2 flex-wrap">
                  {currentTransaction.contact?.name || "Personal"}
                  {currentTransaction.contact?.isSupporter && (
                    <SupporterBadge className="h-5 px-1.5" />
                  )}
                </span>
              </h1>
              <p className="text-neutral-500 dark:text-neutral-400 mt-1 flex items-center gap-2 text-sm">
                <CalendarDays size={14} />
                {format(new Date(currentTransaction.date as string), "MMMM d, yyyy")}
              </p>
            </div>

            {/* Amount — flex-shrink-0 so it never compresses */}
            <div className="text-right flex-shrink-0">
              {currentTransaction.category === AssetCategory.Funds &&
                currentTransaction.amount !== null &&
                (() => {
                  const type = currentTransaction.type;
                  const isPositive =
                    type === "LOAN_RECEIVED" ||
                    type === "REPAYMENT_RECEIVED" ||
                    type === "GIFT_RECEIVED" ||
                    type === "ADVANCE_RECEIVED" ||
                    type === "DEPOSIT_RECEIVED" ||
                    type === "ESCROWED" ||
                    type === "INCOME";
                  const colorClass =
                    type === "LOAN_GIVEN" || type === "REPAYMENT_MADE"
                      ? "text-blue-600 dark:text-blue-400"
                      : type === "LOAN_RECEIVED" || type === "REPAYMENT_RECEIVED"
                        ? "text-red-600 dark:text-red-400"
                        : type === "ESCROWED" || type === "INCOME"
                          ? "text-emerald-600 dark:text-emerald-400"
                          : type === "GIFT_RECEIVED" ||
                              type === "ADVANCE_RECEIVED" ||
                              type === "DEPOSIT_RECEIVED"
                            ? "text-purple-600 dark:text-purple-400"
                            : type === "GIFT_GIVEN"
                              ? "text-pink-600 dark:text-pink-400"
                              : "text-orange-600 dark:text-orange-400";
                  return (
                    <div className={`text-xl sm:text-2xl font-bold ${colorClass}`}>
                      {isPositive ? "+" : "-"}
                      {formatCurrency(currentTransaction.amount, currentTransaction.currency)}
                    </div>
                  );
                })()}
              {totalConverted > 0 && (
                <div className="text-xs sm:text-sm font-medium text-orange-600 dark:text-orange-400 mt-0.5">
                  Gift: {formatCurrency(totalConverted, currentTransaction.currency)}
                </div>
              )}
              {currentTransaction.category === AssetCategory.Item &&
                currentTransaction.quantity && (
                  <div className="text-xl sm:text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                    {currentTransaction.quantity} x {currentTransaction.itemName || "Item"}
                  </div>
                )}
            </div>
          </div>

          {/* Row 2: all actions in one wrapping row */}
          <div className="flex flex-wrap gap-2">
            {canRecordReturn && (
              <Button
                variant="outline"
                size="sm"
                className="h-8 gap-1 text-emerald-600 border-emerald-200 hover:bg-emerald-50 dark:border-emerald-800 dark:hover:bg-emerald-950/30"
                onClick={() => setIsRecordReturnOpen(true)}
              >
                <ArrowRightLeft size={14} />
                Record Return
              </Button>
            )}
            {canConvertToGift && remainingAmount > 0 && (
              <Button
                variant="outline"
                size="sm"
                className="h-8 gap-1 text-orange-600 border-orange-200 hover:bg-orange-50 dark:border-orange-800 dark:hover:bg-orange-950/30"
                onClick={() => setIsConvertGiftOpen(true)}
              >
                <Gift size={14} />
                Convert to Gift
              </Button>
            )}
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
            onResend={handleResendWitness}
            onRemove={handleRemoveWitness}
            isResendingId={resendingId}
            isRemovingId={removingWitnessId}
          />
        </div>

        <EditTransactionDialog
          transaction={currentTransaction}
          open={isEditOpen}
          onOpenChange={setIsEditOpen}
        />

        {canRecordReturn && currentTransaction.contact && (
          <RecordReturnDialog
            open={isRecordReturnOpen}
            onOpenChange={setIsRecordReturnOpen}
            transaction={{
              id: currentTransaction.id,
              type: currentTransaction.type,
              amount: currentTransaction.amount,
              currency: currentTransaction.currency,
              contactId: currentTransaction.contact.id,
              contactName: currentTransaction.contact.name,
            }}
            onSuccess={refetch}
          />
        )}

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
