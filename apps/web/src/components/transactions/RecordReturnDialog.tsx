import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import { useState } from "react";
import { useForm, type Resolver } from "react-hook-form";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAmountInput } from "@/hooks/useAmountInput";
import { useTransactions } from "@/hooks/useTransactions";
import { formatCurrency } from "@/lib/utils/formatters";
import {
  AssetCategory,
  ReturnDirection,
  TransactionType,
} from "@/types/__generated__/graphql";

const formSchema = z.object({
  amount: z.coerce.number().min(0.01, "Amount must be greater than 0"),
  returnDirection: z.enum([ReturnDirection.ToMe, ReturnDirection.ToContact]),
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
 * Quick-action dialog to record a return against an existing GIVEN or RECEIVED
 * transaction. Creates a NEW `RETURNED` transaction — the original transaction
 * is kept intact so the full audit trail is preserved and the balance resolves
 * correctly (GIVEN + RETURNED_TO_ME = 0).
 */
export function RecordReturnDialog({
  open,
  onOpenChange,
  transaction,
  onSuccess,
}: RecordReturnDialogProps) {
  const { createTransaction, creating } = useTransactions();
  const [amountKey, setAmountKey] = useState(0); // reset key for the amount input

  // Auto-select direction: GIVEN → money coming back to me, RECEIVED → paying them back
  const defaultDirection =
    transaction.type === TransactionType.Given
      ? ReturnDirection.ToMe
      : ReturnDirection.ToContact;

  const currencyCode = transaction.currency ?? "NGN";

  const form = useForm<RecordReturnFormValues>({
    resolver: zodResolver(formSchema) as Resolver<RecordReturnFormValues>,
    defaultValues: {
      amount: transaction.amount ?? 0,
      returnDirection: defaultDirection,
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
        type: TransactionType.Returned,
        category: AssetCategory.Funds,
        amount: values.amount,
        currency: currencyCode,
        returnDirection: values.returnDirection,
        contactId: transaction.contactId,
        date: new Date(values.date).toISOString(),
      });
      toast.success("Return recorded successfully");
      onSuccess?.();
      onOpenChange(false);
      // Reset so dialog is clean on next open
      form.reset({
        amount: transaction.amount ?? 0,
        returnDirection: defaultDirection,
        date: format(new Date(), "yyyy-MM-dd"),
      });
      setAmountKey((k) => k + 1);
    } catch (err) {
      console.error(err);
      toast.error("Failed to record return");
    }
  }

  const directionLabel =
    form.watch("returnDirection") === ReturnDirection.ToMe
      ? `${transaction.contactName} returned money to you`
      : `You returned money to ${transaction.contactName}`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Record Return</DialogTitle>
          <DialogDescription>
            Record a partial or full return against this transaction. The original
            record is preserved.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form
            key={amountKey}
            onSubmit={form.handleSubmit(onSubmit)}
            className="space-y-4"
          >
            {/* Amount */}
            <FormField
              control={form.control}
              name="amount"
              render={() => (
                <FormItem>
                  <FormLabel>Amount Returned</FormLabel>
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
                        onBlur={() =>
                          handleBlur(form.getValues("amount") || 0)
                        }
                        className="flex-1"
                      />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Direction */}
            <FormField
              control={form.control}
              name="returnDirection"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Direction</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value={ReturnDirection.ToMe}>
                        Returned to Me
                      </SelectItem>
                      <SelectItem value={ReturnDirection.ToContact}>
                        Returned to Contact
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground mt-1">
                    {directionLabel}
                  </p>
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
                {creating ? "Recording..." : "Record Return"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
