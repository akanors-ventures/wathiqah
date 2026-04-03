import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import { useState } from "react";
import { type Resolver, useForm } from "react-hook-form";
import { toast } from "sonner";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useAmountInput } from "@/hooks/useAmountInput";
import { useTransactions } from "@/hooks/useTransactions";
import { formatCurrency } from "@/lib/utils/formatters";
import { AssetCategory, TransactionType } from "@/types/__generated__/graphql";

const formSchema = z.object({
  amount: z.coerce.number().min(0.01, "Amount must be greater than 0"),
  date: z.string().min(1, "Date is required"),
});

type RecordReturnFormValues = z.infer<typeof formSchema>;

interface RecordReturnDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Original transaction being (partially) returned. */
  transaction: {
    id: string;
    type: TransactionType;
    amount: number | null | undefined;
    currency: string | null | undefined;
    contactId: string;
    contactName: string;
  };
  onSuccess?: () => void;
}

/**
 * Quick-action dialog to record a repayment against an existing LOAN_GIVEN or LOAN_RECEIVED
 * transaction. Creates a NEW REPAYMENT_RECEIVED or REPAYMENT_MADE transaction — the original
 * transaction is kept intact so the full audit trail is preserved.
 */
export function RecordReturnDialog({
  open,
  onOpenChange,
  transaction,
  onSuccess,
}: RecordReturnDialogProps) {
  const { createTransaction, creating } = useTransactions();
  const [amountKey, setAmountKey] = useState(0); // reset key for the amount input

  // LOAN_GIVEN → contact repays → REPAYMENT_RECEIVED
  // LOAN_RECEIVED → I repay → REPAYMENT_MADE
  const repayType =
    transaction.type === TransactionType.LoanGiven
      ? TransactionType.RepaymentReceived
      : TransactionType.RepaymentMade;

  const currencyCode = transaction.currency ?? "NGN";

  const form = useForm<RecordReturnFormValues>({
    resolver: zodResolver(formSchema) as Resolver<RecordReturnFormValues>,
    defaultValues: {
      amount: transaction.amount ?? 0,
      date: format(new Date(), "yyyy-MM-dd"),
    },
  });

  const { amountDisplay, handleAmountChange, handleBlur } = useAmountInput({
    // key prop on the parent ensures this resets when dialog reopens
    initialValue: transaction.amount ?? 0,
    currencyCode,
    onChange: (value) =>
      form.setValue("amount", value, { shouldValidate: false, shouldDirty: true }),
  });

  async function onSubmit(values: RecordReturnFormValues) {
    try {
      await createTransaction({
        type: repayType,
        category: AssetCategory.Funds,
        amount: values.amount,
        currency: currencyCode,
        contactId: transaction.contactId,
        date: new Date(values.date).toISOString(),
      });
      toast.success("Repayment recorded successfully");
      onSuccess?.();
      onOpenChange(false);
      // Reset so dialog is clean on next open
      form.reset({
        amount: transaction.amount ?? 0,
        date: format(new Date(), "yyyy-MM-dd"),
      });
      setAmountKey((k) => k + 1);
    } catch (err) {
      console.error(err);
      toast.error("Failed to record repayment");
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Record Repayment</DialogTitle>
          <DialogDescription>
            Record a partial or full repayment against this transaction. The original record is
            preserved.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form key={amountKey} onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Amount */}
            <FormField
              control={form.control}
              name="amount"
              render={() => (
                <FormItem>
                  <FormLabel>Amount Repaid</FormLabel>
                  <FormControl>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-muted-foreground min-w-[3rem]">
                        {currencyCode}
                      </span>
                      <Input
                        type="text"
                        inputMode="decimal"
                        placeholder={formatCurrency(0, currencyCode, 0)}
                        value={amountDisplay}
                        onChange={handleAmountChange}
                        onBlur={() => handleBlur(form.getValues("amount") || 0)}
                        className="flex-1"
                      />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Date */}
            <FormField
              control={form.control}
              name="date"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Date</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={creating}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={creating}>
                {creating ? "Recording..." : "Record Repayment"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
