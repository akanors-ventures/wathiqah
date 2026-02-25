import { zodResolver } from "@hookform/resolvers/zod";
import { Gift } from "lucide-react";
import { useForm } from "react-hook-form";
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
import { useTransactions } from "@/hooks/useTransactions";
import { formatCurrency } from "@/lib/utils/formatters";
import { useAmountInput } from "@/hooks/useAmountInput";
import { AssetCategory, ReturnDirection, TransactionType } from "@/types/__generated__/graphql";

const formSchema = z.object({
  amount: z.coerce.number<number>().min(0.01, "Amount must be positive"),
  description: z.string().optional(),
});

interface ConvertGiftDialogProps {
  isOpen: boolean;
  onClose: () => void;
  transaction: {
    id: string;
    amount: number | null;
    currency: string;
    type: TransactionType;
    contactId?: string | null;
    description?: string | null;
  };
  onSuccess?: () => void;
}

export function ConvertGiftDialog({
  isOpen,
  onClose,
  transaction,
  onSuccess,
}: ConvertGiftDialogProps) {
  const { createTransaction, creating } = useTransactions();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      amount: transaction.amount || 0,
      description: `Gift conversion from transaction: ${transaction.id}`,
    },
  });

  const { amountDisplay, handleAmountChange, handleBlur } = useAmountInput({
    initialValue: transaction.amount || 0,
    currencyCode: transaction.currency || "NGN",
    onChange: (value) =>
      form.setValue("amount", value, { shouldValidate: false, shouldDirty: true }),
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    try {
      // Determine returnDirection based on parent type
      // GIVEN (I lent) -> GIFT TO_CONTACT (I gifted it out)
      // RECEIVED (I borrowed) -> GIFT TO_ME (Contact gifted it to me)
      const returnDirection =
        transaction.type === TransactionType.Given
          ? ReturnDirection.ToContact
          : ReturnDirection.ToMe;

      await createTransaction({
        category: AssetCategory.Funds,
        amount: values.amount,
        currency: transaction.currency,
        type: TransactionType.Gift,
        date: new Date().toISOString(),
        description: values.description,
        contactId: transaction.contactId || undefined,
        parentId: transaction.id,
        returnDirection,
      });

      toast.success("Transaction converted to gift successfully");
      onSuccess?.();
      onClose();
    } catch (error) {
      console.error(error);
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Gift className="h-5 w-5 text-emerald-600" />
            Convert to Gift
          </DialogTitle>
          <DialogDescription>
            Specify the amount of this transaction you want to convert to a gift. This will reduce
            the outstanding debt for this transaction.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
            <FormField
              control={form.control}
              name="amount"
              render={() => (
                <FormItem>
                  <FormLabel>Gift Amount</FormLabel>
                  <FormControl>
                    <Input
                      type="text"
                      inputMode="decimal"
                      placeholder={formatCurrency(0, transaction.currency, 0)}
                      value={amountDisplay}
                      onChange={handleAmountChange}
                      onBlur={() => handleBlur(form.getValues("amount") || 0)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description (Optional)</FormLabel>
                  <FormControl>
                    <Input placeholder="Why are you converting this?" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" isLoading={creating}>
                Confirm Conversion
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
