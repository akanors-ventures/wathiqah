import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import { Plus } from "lucide-react";
import { useState } from "react";
import { useForm, type Resolver } from "react-hook-form";
import { toast } from "sonner";
import * as z from "zod";
import { ContactFormDialog } from "@/components/contacts/ContactFormDialog";
import { TransactionTypeHelp } from "@/components/transactions/TransactionTypeHelp";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
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
import { Textarea } from "@/components/ui/textarea";
import { WitnessSelector } from "@/components/witnesses/WitnessSelector";
import { useContacts } from "@/hooks/useContacts";
import { useTransaction } from "@/hooks/useTransaction";
import { formatCurrency } from "@/lib/utils/formatters";
import { useAmountInput } from "@/hooks/useAmountInput";
import {
  AssetCategory,
  ReturnDirection,
  type TransactionQuery,
  TransactionType,
} from "@/types/__generated__/graphql";

const formSchema = z
  .object({
    contactId: z.string().optional(),
    type: z.enum([
      TransactionType.Given,
      TransactionType.Received,
      TransactionType.Returned,
      TransactionType.Gift,
      TransactionType.Expense,
      TransactionType.Income,
    ]),
    amount: z.coerce.number<number>().min(0, "Amount must be positive").optional(),
    itemName: z.string().optional(),
    quantity: z.coerce.number<number>().min(1, "Quantity must be at least 1").optional(),
    date: z.string().min(1, "Date is required"),
    description: z.string().optional(),
    category: z.enum([AssetCategory.Funds, AssetCategory.Item]),
    returnDirection: z.enum([ReturnDirection.ToMe, ReturnDirection.ToContact]).optional(),
    currency: z.string().min(1, "Currency is required"),
    witnesses: z
      .array(
        z.object({
          userId: z.string().optional(),
          invite: z
            .object({
              name: z.string().min(2, "Name is required"),
              email: z.email({ message: "Invalid email" }),
              phoneNumber: z.string().optional().nullable(),
            })
            .optional(),
          displayName: z.string(),
        }),
      )
      .default([]),
  })
  .refine(
    (data) => {
      if (data.category === AssetCategory.Funds) {
        return (data.amount ?? 0) > 0;
      }
      return true;
    },
    {
      message: "Amount must be positive for funds",
      path: ["amount"],
    },
  )
  .refine(
    (data) => {
      if (data.category === AssetCategory.Item) {
        return !!data.itemName && (data.quantity ?? 0) >= 1;
      }
      return true;
    },
    {
      message: "Item name and quantity are required for physical items (ITEM category)",
      path: ["itemName"],
    },
  )
  .refine(
    (data) => {
      if (data.contactId) {
        return (
          [
            TransactionType.Given,
            TransactionType.Received,
            TransactionType.Returned,
            TransactionType.Gift,
          ] as TransactionType[]
        ).includes(data.type);
      }
      return ([TransactionType.Expense, TransactionType.Income] as TransactionType[]).includes(
        data.type,
      );
    },
    {
      message: "Invalid transaction type for the selected context",
      path: ["type"],
    },
  )
  .refine(
    (data) => {
      if (
        (data.type === TransactionType.Returned || data.type === TransactionType.Gift) &&
        data.contactId
      ) {
        return !!data.returnDirection;
      }
      return true;
    },
    {
      message: "Return direction is required for this transaction type",
      path: ["returnDirection"],
    },
  );

type TransactionFormValues = z.infer<typeof formSchema>;

interface EditTransactionDialogProps {
  transaction: NonNullable<TransactionQuery["transaction"]>;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditTransactionDialog({
  transaction,
  open,
  onOpenChange,
}: EditTransactionDialogProps) {
  const { updateTransaction, updating } = useTransaction(transaction.id);
  const { contacts } = useContacts();
  const [isContactDialogOpen, setIsContactDialogOpen] = useState(false);
  const [newlyCreatedContact, setNewlyCreatedContact] = useState<{
    id: string;
    name: string;
  } | null>(null);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema) as Resolver<TransactionFormValues>,
    defaultValues: {
      type: transaction.type,
      contactId: transaction.contact?.id ?? undefined,
      amount: transaction.amount ?? 0,
      itemName: transaction.itemName ?? "",
      quantity: transaction.quantity ?? 1,
      date: format(new Date(transaction.date), "yyyy-MM-dd"),
      description: transaction.description ?? "",
      category: transaction.category,
      returnDirection: transaction.returnDirection ?? undefined,
      currency: transaction.currency ?? "NGN",
      witnesses: [],
    },
  });

  const contactId = form.watch("contactId");
  const type = form.watch("type");
  const category = form.watch("category");
  const currencyCode = form.watch("currency");

  const { amountDisplay, handleAmountChange, handleBlur } = useAmountInput({
    initialValue: transaction.amount || 0,
    currencyCode: transaction.currency || "NGN",
    onChange: (value) =>
      form.setValue("amount", value, { shouldValidate: false, shouldDirty: true }),
  });

  async function onSubmit(values: TransactionFormValues) {
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

      await updateTransaction({
        id: transaction.id,
        category: values.category,
        type: values.type,
        amount: values.category === AssetCategory.Funds ? values.amount : undefined,
        itemName: values.category === AssetCategory.Item ? values.itemName : undefined,
        quantity: values.category === AssetCategory.Item ? values.quantity : undefined,
        date: new Date(values.date).toISOString(),
        description: values.description,
        contactId: values.contactId || undefined,
        returnDirection: values.returnDirection || undefined,
        currency: values.currency,
        witnessUserIds,
        witnessInvites,
      });
      toast.success("Transaction updated successfully");
      onOpenChange(false);
    } catch (error) {
      console.error(error);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Transaction</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="contactId"
              render={({ field }) => (
                <FormItem>
                  <div className="flex items-center justify-between">
                    <FormLabel>Contact</FormLabel>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-6 px-2 text-xs text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                      onClick={() => setIsContactDialogOpen(true)}
                    >
                      <Plus className="h-3 w-3 mr-1" />
                      New Contact
                    </Button>
                  </div>
                  <Select
                    onValueChange={(value) => {
                      const hasContact = value !== "none";
                      field.onChange(hasContact ? value : undefined);

                      const currentType = form.getValues("type");
                      if (hasContact) {
                        const contactTypes = [
                          TransactionType.Given,
                          TransactionType.Received,
                          TransactionType.Returned,
                          TransactionType.Gift,
                        ];
                        if (!contactTypes.includes(currentType)) {
                          form.setValue("type", TransactionType.Given);
                        }
                      } else {
                        const personalTypes = [TransactionType.Expense, TransactionType.Income];
                        if (!personalTypes.includes(currentType)) {
                          form.setValue("type", TransactionType.Expense);
                        }
                      }
                    }}
                    value={field.value ?? "none"}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a contact (Optional)" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="none">Personal (No Contact)</SelectItem>
                      {newlyCreatedContact &&
                        !contacts.some((c) => c.id === newlyCreatedContact.id) && (
                          <SelectItem key={newlyCreatedContact.id} value={newlyCreatedContact.id}>
                            {newlyCreatedContact.name}
                          </SelectItem>
                        )}
                      {contacts.map((contact) => (
                        <SelectItem key={contact.id} value={contact.id}>
                          {contact.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-3 gap-4">
              {category === AssetCategory.Funds ? (
                <>
                  <FormField
                    control={form.control}
                    name="currency"
                    render={({ field }) => (
                      <FormItem className="col-span-1">
                        <FormLabel>Currency</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="NGN" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="NGN">NGN (₦)</SelectItem>
                            <SelectItem value="USD">USD ($)</SelectItem>
                            <SelectItem value="EUR">EUR (€)</SelectItem>
                            <SelectItem value="GBP">GBP (£)</SelectItem>
                            <SelectItem value="CAD">CAD ($)</SelectItem>
                            <SelectItem value="AED">AED (د.إ)</SelectItem>
                            <SelectItem value="SAR">SAR (ر.س)</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="amount"
                    render={() => (
                      <FormItem className="col-span-2">
                        <FormLabel>Amount</FormLabel>
                        <FormControl>
                          <Input
                            type="text"
                            inputMode="decimal"
                            placeholder={formatCurrency(0, currencyCode, 0)}
                            value={amountDisplay}
                            onChange={handleAmountChange}
                            onBlur={() => handleBlur(form.getValues("amount") || 0)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </>
              ) : (
                <>
                  <FormField
                    control={form.control}
                    name="itemName"
                    render={({ field }) => (
                      <FormItem className="col-span-2">
                        <FormLabel>Item Name</FormLabel>
                        <FormControl>
                          <Input placeholder="What item?" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="quantity"
                    render={({ field }) => (
                      <FormItem className="col-span-1">
                        <FormLabel>Quantity</FormLabel>
                        <FormControl>
                          <Input type="number" min="1" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      Type
                      <TransactionTypeHelp />
                    </FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {contactId ? (
                          <>
                            <SelectItem value={TransactionType.Given}>Given</SelectItem>
                            <SelectItem value={TransactionType.Received}>Received</SelectItem>
                            <SelectItem value={TransactionType.Returned}>Returned</SelectItem>
                            <SelectItem value={TransactionType.Gift}>Gift</SelectItem>
                          </>
                        ) : (
                          <>
                            <SelectItem value={TransactionType.Expense}>Expense</SelectItem>
                            <SelectItem value={TransactionType.Income}>Income</SelectItem>
                          </>
                        )}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {(type === TransactionType.Returned || type === TransactionType.Gift) && contactId && (
              <FormField
                control={form.control}
                name="returnDirection"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Direction</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select direction" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value={ReturnDirection.ToMe}>To Me</SelectItem>
                        <SelectItem value={ReturnDirection.ToContact}>To Contact</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

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

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea placeholder="What was this for?" className="resize-none" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="space-y-4 pt-4 border-t">
              <div className="flex flex-col gap-1">
                <h4 className="text-sm font-medium">Add Witnesses</h4>
                <p className="text-xs text-muted-foreground">
                  Invite others to verify this transaction.
                </p>
              </div>

              {transaction.witnesses && transaction.witnesses.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground">Existing Witnesses:</p>
                  <div className="flex flex-wrap gap-2">
                    {transaction.witnesses.map((w) => (
                      <div
                        key={w.id}
                        className="flex items-center gap-1.5 px-2 py-1 bg-muted rounded-md text-xs"
                      >
                        <span className="font-medium">{w.user?.name || "Unknown"}</span>
                        <span
                          className={`text-[10px] px-1 rounded-sm border ${
                            w.status === "ACKNOWLEDGED"
                              ? "bg-emerald-50 text-emerald-600 border-emerald-100"
                              : w.status === "PENDING"
                                ? "bg-amber-50 text-amber-600 border-amber-100"
                                : "bg-gray-50 text-gray-600 border-gray-100"
                          }`}
                        >
                          {w.status}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <WitnessSelector
                selectedWitnesses={form.watch("witnesses") || []}
                onChange={(witnesses) => form.setValue("witnesses", witnesses)}
              />
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={updating}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={updating}>
                {updating ? "Saving..." : "Save Changes"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
      <ContactFormDialog
        isOpen={isContactDialogOpen}
        onClose={() => setIsContactDialogOpen(false)}
        onSuccess={(newContact) => {
          setNewlyCreatedContact(newContact);
          setTimeout(() => {
            form.setValue("contactId", newContact.id, {
              shouldDirty: true,
              shouldValidate: true,
            });
            const currentType = form.getValues("type");
            const contactTypes = [
              TransactionType.Given,
              TransactionType.Received,
              TransactionType.Returned,
              TransactionType.Gift,
            ];
            if (!contactTypes.includes(currentType)) {
              form.setValue("type", TransactionType.Given);
            }
          }, 0);
        }}
      />
    </Dialog>
  );
}
