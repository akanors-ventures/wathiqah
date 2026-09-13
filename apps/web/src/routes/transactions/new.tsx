import { zodResolver } from "@hookform/resolvers/zod";
import { createFileRoute, useNavigate, useSearch } from "@tanstack/react-router";
import { format } from "date-fns";
import { useState } from "react";
import { type Resolver, useForm } from "react-hook-form";
import { toast } from "sonner";
import { AllocationDialog } from "@/components/transactions/AllocationDialog";
import {
  Form,
  TransactionFormFields,
  type TransactionFormValues,
  transactionFormSchema,
} from "@/components/transactions/TransactionFormFields";
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useTransactions } from "@/hooks/useTransactions";
import {
  type AllocationEligibility,
  getAllocationEligibility,
} from "@/lib/utils/transactionDetailView";
import { AssetCategory, TransactionType } from "@/types/__generated__/graphql";

interface PendingAllocation {
  mode: Exclude<AllocationEligibility, null>;
  category: AssetCategory;
  transaction: {
    id: string;
    currency: string;
    remainingAmount: number;
    contactName?: string | null;
  };
}

export const Route = createFileRoute("/transactions/new")({
  validateSearch: (search: Record<string, unknown>) => {
    return {
      contactId: search.contactId as string | undefined,
    };
  },
  component: NewTransactionPage,
});

export function NewTransactionPage() {
  const navigate = useNavigate();
  const search = useSearch({ from: "/transactions/new" });
  const { createTransaction, creating } = useTransactions();
  const [pendingAllocation, setPendingAllocation] = useState<PendingAllocation | null>(null);
  const [allocationDialogOpen, setAllocationDialogOpen] = useState(false);

  function goToList(category: AssetCategory) {
    navigate({
      to: "/transactions",
      search: { tab: category === AssetCategory.Item ? "items" : "funds" },
    });
  }

  function dismissAllocationPrompt() {
    if (!pendingAllocation) return;
    goToList(pendingAllocation.category);
    setPendingAllocation(null);
  }

  const form = useForm<TransactionFormValues>({
    resolver: zodResolver(transactionFormSchema) as Resolver<TransactionFormValues>,
    defaultValues: {
      type: TransactionType.LoanGiven,
      contactId: search.contactId,
      date: format(new Date(), "yyyy-MM-dd"),
      category: AssetCategory.Funds,
      amount: 0,
      currency: "NGN",
      description: "",
      itemName: "",
      quantity: 1,
      witnesses: [],
      recordOnPersonalLedger: true,
    },
  });

  async function onSubmit(values: TransactionFormValues) {
    if (!values.contactId) {
      form.setError("contactId", { message: "A contact is required" });
      return;
    }

    try {
      const witnessUserIds = values.witnesses
        .filter((w) => w.userId)
        .map((w) => w.userId as string);
      const witnessInvites = values.witnesses
        .map((w) => w.invite)
        .filter((invite): invite is NonNullable<typeof invite> => !!invite)
        .map((invite) => ({
          ...invite,
          email: invite.email.trim().toLowerCase(),
        }));

      const result = await createTransaction({
        contactId: values.contactId,
        projectId: values.category === AssetCategory.Funds ? values.projectId : undefined,
        type: values.type,
        category: values.category,
        currency: values.currency,
        date: new Date(values.date).toISOString(),
        description: values.description,
        amount: values.category === AssetCategory.Funds ? values.amount : undefined,
        itemName: values.category === AssetCategory.Item ? values.itemName : undefined,
        quantity: values.category === AssetCategory.Item ? values.quantity : undefined,
        witnessUserIds,
        witnessInvites,
        recordOnPersonalLedger: values.recordOnPersonalLedger,
      });
      toast.success("Transaction created successfully");

      const created = result.data?.createTransaction;
      const eligibility = created ? getAllocationEligibility(created.type, created.category) : null;

      if (created && eligibility) {
        setPendingAllocation({
          mode: eligibility,
          category: created.category,
          transaction: {
            id: created.id,
            currency: created.currency,
            remainingAmount: created.remainingAmount ?? created.amount ?? 0,
            contactName: created.contact?.name,
          },
        });
        return;
      }

      goToList(values.category);
    } catch (error) {
      console.error(error);
      const message = error instanceof Error ? error.message : "Failed to create transaction";
      toast.error(message);
    }
  }

  return (
    <div className="container mx-auto py-6 sm:py-10 px-4 sm:px-0 max-w-2xl">
      <Card className="border-none sm:border shadow-none sm:shadow-sm">
        <CardHeader className="px-0 sm:px-6">
          <CardTitle className="text-xl sm:text-2xl font-bold">Create New Transaction</CardTitle>
        </CardHeader>
        <CardContent className="px-0 sm:px-6">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
              <TransactionFormFields form={form} mode="create" />

              <Button
                type="submit"
                className="w-full h-12 sm:h-11 rounded-md text-base font-bold shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30 transition-all active:scale-[0.98]"
                isLoading={creating}
              >
                Create Transaction
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>

      {pendingAllocation ? (
        <>
          <AlertDialog
            open={!allocationDialogOpen}
            onOpenChange={(open) => {
              if (!open) dismissAllocationPrompt();
            }}
          >
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Allocate this now?</AlertDialogTitle>
                <AlertDialogDescription>
                  {pendingAllocation.mode === "applyCredit"
                    ? "Split this straight across what's outstanding, or do it later from the transaction."
                    : "Settle this from a credit you already have, or do it later from the transaction."}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel onClick={dismissAllocationPrompt}>Not now</AlertDialogCancel>
                <AlertDialogAction
                  onClick={(event) => {
                    // AlertDialogAction renders Radix's DialogPrimitive.Close,
                    // which closes this AlertDialog (firing the onOpenChange
                    // above) right after this handler unless prevented — that
                    // would clear pendingAllocation before AllocationDialog
                    // ever got a chance to open.
                    event.preventDefault();
                    setAllocationDialogOpen(true);
                  }}
                >
                  Allocate now
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          <AllocationDialog
            open={allocationDialogOpen}
            onOpenChange={(open) => {
              setAllocationDialogOpen(open);
              if (!open) dismissAllocationPrompt();
            }}
            mode={pendingAllocation.mode}
            transaction={pendingAllocation.transaction}
          />
        </>
      ) : null}
    </div>
  );
}
