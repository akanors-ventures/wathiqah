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

  async function onSubmit(values: z.infer<typeof formSchema>) {
    try {
      // Determine returnDirection based on parent type
      // GIVEN -> GIFT TO_ME (Contact gifted back to me)
      // RECEIVED -> GIFT TO_CONTACT (I gifted back to contact)
      const returnDirection =
        transaction.type === TransactionType.Given
          ? ReturnDirection.ToMe
          : ReturnDirection.ToContact;

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
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Amount to Convert</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      max={transaction.amount || undefined}
                      {...field}
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
