import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { useState } from "react";
import { AddWitnessDialog } from "@/components/transactions/AddWitnessDialog";
import { AllocationDialog } from "@/components/transactions/AllocationDialog";
import { AllocationSection } from "@/components/transactions/AllocationSection";
import { ConvertGiftDialog } from "@/components/transactions/ConvertGiftDialog";
import { EditTransactionDialog } from "@/components/transactions/EditTransactionDialog";
import { GiftConversionsCard } from "@/components/transactions/GiftConversionsCard";
import { RecordRemitDialog } from "@/components/transactions/RecordRemitDialog";
import { RecordReturnDialog } from "@/components/transactions/RecordReturnDialog";
import { RemittancesCard } from "@/components/transactions/RemittancesCard";
import { RepaymentsCard } from "@/components/transactions/RepaymentsCard";
import { TransactionDetailsCard } from "@/components/transactions/TransactionDetailsCard";
import { TransactionHeader } from "@/components/transactions/TransactionHeader";
import { TransactionHistorySection } from "@/components/transactions/TransactionHistorySection";
import { TransactionWitnessesCard } from "@/components/transactions/TransactionWitnessesCard";
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
import { useAllocationReversal } from "@/hooks/useAllocationReversal";
import { useTransaction } from "@/hooks/useTransaction";
import { useTransactionRemoval } from "@/hooks/useTransactionRemoval";
import { useTransactionWitnessActions } from "@/hooks/useTransactionWitnessActions";
import { getTransactionDetailView } from "@/lib/utils/transactionDetailView";
import type { Witness } from "@/types/__generated__/graphql";
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
  const [isRecordRemitOpen, setIsRecordRemitOpen] = useState(false);
  const [isAllocateOpen, setIsAllocateOpen] = useState(false);

  const { transaction, loading, error, refetch } = useTransaction(id);
  const witnessActions = useTransactionWitnessActions(refetch);
  const { reversingId, handleReverse } = useAllocationReversal();
  const { isRemoveDialogOpen, setIsRemoveDialogOpen, removing, handleRemove } =
    useTransactionRemoval(id, navigate);

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

  const view = getTransactionDetailView(transaction);
  const witnesses = (transaction.witnesses ?? []).filter(
    (w): w is NonNullable<typeof w> => w !== null,
  ) as Witness[];

  return (
    <div className="container mx-auto max-w-3xl p-4 py-8">
      <div className="mb-6">
        <Link
          to="/"
          className="mb-4 inline-flex items-center text-sm text-neutral-500 hover:text-emerald-600 transition-colors"
        >
          <ArrowLeft className="mr-1 h-4 w-4" /> Back to Dashboard
        </Link>

        <TransactionHeader
          transaction={transaction}
          view={view}
          onEdit={() => setIsEditOpen(true)}
          onRemove={() => setIsRemoveDialogOpen(true)}
          onConvertGift={() => setIsConvertGiftOpen(true)}
          onRecordReturn={() => setIsRecordReturnOpen(true)}
          onRecordRemit={() => setIsRecordRemitOpen(true)}
          onAllocate={() => setIsAllocateOpen(true)}
        />
      </div>

      <div className="grid grid-cols-1 gap-6 min-w-0">
        <TransactionDetailsCard transaction={transaction} />

        <GiftConversionsCard
          giftConversions={view.giftConversions}
          fallbackCurrency={transaction.currency}
        />

        <RepaymentsCard repayments={view.repayments} fallbackCurrency={transaction.currency} />

        <RemittancesCard remittances={view.remittances} fallbackCurrency={transaction.currency} />

        <AllocationSection
          title="Applied To"
          allocations={view.allocationsOut}
          counterpartOf="target"
          fallbackCurrency={transaction.currency}
          reversingId={reversingId}
          onReverse={handleReverse}
        />

        <AllocationSection
          title="Settled From"
          allocations={view.allocationsIn}
          counterpartOf="source"
          fallbackCurrency={transaction.currency}
          reversingId={reversingId}
          onReverse={handleReverse}
        />

        <TransactionWitnessesCard
          witnesses={witnesses}
          onAddWitness={() => setIsAddWitnessOpen(true)}
          resendingId={witnessActions.resendingId}
          removingWitnessId={witnessActions.removingWitnessId}
          onResend={witnessActions.handleResendWitness}
          onRemove={witnessActions.handleRemoveWitness}
        />

        <EditTransactionDialog
          transaction={transaction}
          open={isEditOpen}
          onOpenChange={setIsEditOpen}
        />

        {view.canRecordReturn && transaction.contact && view.remainingAmount > 0 && (
          <RecordReturnDialog
            open={isRecordReturnOpen}
            onOpenChange={setIsRecordReturnOpen}
            transaction={{
              id: transaction.id,
              type: transaction.type,
              amount: transaction.amount,
              currency: transaction.currency,
              contactId: transaction.contact.id,
              contactName: transaction.contact.name,
              remainingAmount: view.remainingAmount,
            }}
            onSuccess={refetch}
          />
        )}

        {view.canRecordRemit && transaction.contact && view.remainingAmount > 0 && (
          <RecordRemitDialog
            open={isRecordRemitOpen}
            onOpenChange={setIsRecordRemitOpen}
            transaction={{
              id: transaction.id,
              amount: transaction.amount,
              currency: transaction.currency,
              contactId: transaction.contact.id,
              contactName: transaction.contact.name,
              remainingAmount: view.remainingAmount,
            }}
            onSuccess={refetch}
          />
        )}

        {(view.canApplyCredit || view.canSettleFromCredit) && view.remainingAmount > 0 && (
          <AllocationDialog
            open={isAllocateOpen}
            onOpenChange={setIsAllocateOpen}
            mode={view.canApplyCredit ? "applyCredit" : "settleFromCredit"}
            transaction={{
              id: transaction.id,
              currency: transaction.currency,
              remainingAmount: view.remainingAmount,
              contactName: transaction.contact?.name,
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
            id: transaction.id,
            amount: view.remainingAmount,
            currency: transaction.currency,
            type: transaction.type,
            contactId: transaction.contact?.id,
            description: transaction.description,
          }}
          onSuccess={() => refetch()}
        />

        <TransactionHistorySection history={transaction.history} />
      </div>
    </div>
  );
}
