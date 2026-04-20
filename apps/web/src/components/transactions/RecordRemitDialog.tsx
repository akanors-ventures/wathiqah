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

interface RecordRemitDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Original ESCROWED transaction being (partially) remitted. */
  transaction: {
    id: string;
    amount: number | null | undefined;
    currency: string | null | undefined;
    contactId: string;
    contactName: string;
    /** Amount still outstanding (parent amount minus already-recorded remittances). */
    remainingAmount: number;
  };
  onSuccess?: () => void;
}

/**
 * Quick-action dialog to record a remittance against an existing ESCROWED
 * transaction. Creates a new REMITTED transaction linked to the parent
 * escrow via parentId. The original escrow record is preserved so the full
 * audit trail is retained, and remittances are capped at the outstanding
 * balance. The parent's status auto-flips to COMPLETED once fully remitted.
 */
export function RecordRemitDialog({
  open,
  onOpenChange,
  transaction,
  onSuccess,
}: RecordRemitDialogProps) {
  const { createTransaction, creating } = useTransactions();
  const [amountKey, setAmountKey] = useState(0);

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

  type RecordRemitFormValues = z.infer<typeof formSchema>;

  const form = useForm<RecordRemitFormValues>({
    resolver: zodResolver(formSchema) as Resolver<RecordRemitFormValues>,
    defaultValues: {
      amount: remaining,
      date: format(new Date(), "yyyy-MM-dd"),
      description: "",
    },
  });

  const { amountDisplay, handleAmountChange, handleBlur } = useAmountInput({
    initialValue: remaining,
    currencyCode,
    onChange: (value) =>
      form.setValue("amount", value, { shouldValidate: false, shouldDirty: true }),
  });

  async function onSubmit(values: RecordRemitFormValues) {
    try {
      await createTransaction({
        type: TransactionType.Remitted,
        category: AssetCategory.Funds,
        amount: values.amount,
        currency: currencyCode,
        // Backend derives contactId from parent escrow — we still pass it
        // for schemas that require it; the server will override if needed.
        contactId: transaction.contactId,
        parentId: transaction.id,
        date: new Date(values.date).toISOString(),
        description: values.description || undefined,
      });
      toast.success("Remittance recorded successfully");
      onSuccess?.();
      onOpenChange(false);
      form.reset({
        amount: remaining,
        date: format(new Date(), "yyyy-MM-dd"),
        description: "",
      });
      setAmountKey((k) => k + 1);
    } catch (err) {
      console.error(err);
      toast.error("Failed to record remittance");
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Record Remittance</DialogTitle>
          <DialogDescription>
            Record a partial or full remittance against this escrow. Outstanding balance:{" "}
            <span className="font-semibold text-foreground">
              {formatCurrency(remaining, currencyCode)}
            </span>
            . The original escrow record is preserved.
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
                  <FormLabel>Amount Remitted</FormLabel>
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
                    <Textarea placeholder="Add a note about this remittance" rows={2} {...field} />
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
                {creating ? "Recording..." : "Record Remittance"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
