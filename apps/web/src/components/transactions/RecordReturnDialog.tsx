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
import { Textarea } from "@/components/ui/textarea";
import { useAmountInput } from "@/hooks/useAmountInput";
import { useTransactions } from "@/hooks/useTransactions";
import { formatCurrency } from "@/lib/utils/formatters";
import { AssetCategory, TransactionType } from "@/types/__generated__/graphql";

interface RecordReturnDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Original loan transaction being (partially) returned. */
  transaction: {
    id: string;
    type: TransactionType;
    amount: number | null | undefined;
    currency: string | null | undefined;
    contactId: string;
    contactName: string;
    /** Amount still outstanding (parent amount minus already-recorded repayments/conversions). */
    remainingAmount: number;
  };
  onSuccess?: () => void;
}

/**
 * Quick-action dialog to record a repayment against an existing LOAN_GIVEN or LOAN_RECEIVED
 * transaction. Creates a NEW REPAYMENT_RECEIVED or REPAYMENT_MADE transaction linked to the
 * parent loan via parentId. The original transaction is kept intact so the full audit trail
 * is preserved, and repayments are capped at the outstanding balance.
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
  const remaining = transaction.remainingAmount;

  const formSchema = z.object({
    amount: z.coerce
      .number()
      .min(0.01, "Amount must be greater than 0")
      .max(remaining, `Amount cannot exceed outstanding balance (${remaining})`),
    date: z.string().min(1, "Date is required"),
    description: z.string().optional(),
  });

  type RecordReturnFormValues = z.infer<typeof formSchema>;

  const form = useForm<RecordReturnFormValues>({
    resolver: zodResolver(formSchema) as Resolver<RecordReturnFormValues>,
    defaultValues: {
      amount: remaining,
      date: format(new Date(), "yyyy-MM-dd"),
      description: "",
    },
  });

  const { amountDisplay, handleAmountChange, handleBlur } = useAmountInput({
    // key prop on the parent ensures this resets when dialog reopens
    initialValue: remaining,
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
        // Backend derives contactId from parent loan — we still pass contactId for schemas
        // that require it, but the server will override it from the parent.
        contactId: transaction.contactId,
        parentId: transaction.id,
        date: new Date(values.date).toISOString(),
        description: values.description || undefined,
      });
      toast.success("Repayment recorded successfully");
      onSuccess?.();
      onOpenChange(false);
      // Reset so dialog is clean on next open
      form.reset({
        amount: remaining,
        date: format(new Date(), "yyyy-MM-dd"),
        description: "",
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
            Record a partial or full repayment against this loan. Outstanding balance:{" "}
            <span className="font-semibold text-foreground">
              {formatCurrency(remaining, currencyCode)}
            </span>
            . The original loan record is preserved.
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

            {/* Description */}
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Description{" "}
                    <span className="text-muted-foreground font-normal">(optional)</span>
                  </FormLabel>
                  <FormControl>
                    <Textarea placeholder="Add a note about this repayment" rows={2} {...field} />
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
