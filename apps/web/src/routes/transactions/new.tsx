import { zodResolver } from "@hookform/resolvers/zod";
import { createFileRoute, useNavigate, useSearch } from "@tanstack/react-router";
import { format } from "date-fns";
import { Plus } from "lucide-react";
import { useState } from "react";
import { useForm, type Resolver } from "react-hook-form";
import { toast } from "sonner";
import * as z from "zod";
import { ContactFormDialog } from "@/components/contacts/ContactFormDialog";
import { TransactionTypeHelp } from "@/components/transactions/TransactionTypeHelp";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { BrandLoader } from "@/components/ui/page-loader";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { type SelectedWitness, WitnessSelector } from "@/components/witnesses/WitnessSelector";
import { useContacts } from "@/hooks/useContacts";
import { useTransactions } from "@/hooks/useTransactions";
import { AssetCategory, ReturnDirection, TransactionType } from "@/types/__generated__/graphql";

export const Route = createFileRoute("/transactions/new")({
  validateSearch: (search: Record<string, unknown>) => {
    return {
      contactId: search.contactId as string | undefined,
    };
  },
  component: NewTransactionPage,
});

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
    amount: z.coerce.number().min(0, "Amount must be positive").optional(),
    itemName: z.string().optional(),
    quantity: z.coerce.number().min(1, "Quantity must be at least 1").optional(),
    date: z.string().min(1, "Date is required"),
    description: z.string().optional(),
    category: z.enum([AssetCategory.Funds, AssetCategory.Item]).default(AssetCategory.Funds),
    returnDirection: z.enum([ReturnDirection.ToMe, ReturnDirection.ToContact]).optional(),
    currency: z.string().min(1, "Currency is required").default("NGN"),
    witnessUserIds: z.array(z.string()).optional(),
    witnessInvites: z
      .array(
        z.object({
          name: z.string(),
          email: z.email({ message: "Invalid email address" }),
          phoneNumber: z.string().optional(),
        }),
      )
      .optional(),
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
      // If contactId is present, type must be GIVEN, RECEIVED, RETURNED or GIFT
      if (data.contactId) {
        return (
          [
            TransactionType.Given,
            TransactionType.Received,
            TransactionType.Returned,
            TransactionType.Gift,
          ] as string[]
        ).includes(data.type);
      }
      // If contactId is missing, type must be EXPENSE or INCOME
      return ([TransactionType.Expense, TransactionType.Income] as string[]).includes(data.type);
    },
    {
      message: "Invalid transaction type for the selected context (Personal vs Contact)",
      path: ["type"],
    },
  )
  .refine(
    (data) => {
      // returnDirection is required for RETURNED or GIFT with contact
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

function NewTransactionPage() {
  const navigate = useNavigate();
  const search = useSearch({ from: "/transactions/new" });
  const { createTransaction, creating } = useTransactions();
  const { contacts, loading: loadingContacts } = useContacts();
  const [isContactDialogOpen, setIsContactDialogOpen] = useState(false);
  const [selectedWitnesses, setSelectedWitnesses] = useState<SelectedWitness[]>([]);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema) as Resolver<z.infer<typeof formSchema>>,
    defaultValues: {
      type: search.contactId ? TransactionType.Given : TransactionType.Expense,
      contactId: search.contactId,
      date: format(new Date(), "yyyy-MM-dd"),
      category: AssetCategory.Funds,
      amount: 0,
      currency: "NGN",
      description: "",
      itemName: "",
      quantity: 1,
    },
  });

  const contactId = form.watch("contactId");
  const type = form.watch("type");
  const category = form.watch("category");

  async function onSubmit(values: z.infer<typeof formSchema>) {
    try {
      const witnessUserIds = selectedWitnesses
        .filter((w) => w.userId)
        .map((w) => w.userId as string);
      const witnessInvites = selectedWitnesses
        .map((w) => w.invite)
        .filter((invite): invite is NonNullable<typeof invite> => !!invite)
        .map((invite) => ({
          ...invite,
          email: invite.email.trim().toLowerCase(),
        }));

      await createTransaction({
        ...values,
        amount: values.category === AssetCategory.Funds ? values.amount : undefined,
        itemName: values.category === AssetCategory.Item ? values.itemName : undefined,
        quantity: values.category === AssetCategory.Item ? values.quantity : undefined,
        contactId: values.contactId || undefined,
        date: new Date(values.date).toISOString(),
        witnessUserIds,
        witnessInvites,
      });
      toast.success("Transaction created successfully");
      navigate({
        to: "/transactions",
        search: { tab: values.category === AssetCategory.Item ? "items" : "funds" },
      });
    } catch (error) {
      console.error(error);
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
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 sm:gap-8">
                <FormField
                  control={form.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Category</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger className="h-10 text-sm">
                            <SelectValue placeholder="Select category" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value={AssetCategory.Funds}>Funds (Money)</SelectItem>
                          <SelectItem value={AssetCategory.Item}>Physical Item</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

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
                          field.onChange(value === "none" ? undefined : value);
                          // Auto-switch type based on contact selection
                          if (value === "none") {
                            form.setValue("type", TransactionType.Expense);
                          } else {
                            form.setValue("type", TransactionType.Given);
                          }
                        }}
                        value={field.value ?? "none"}
                      >
                        <FormControl>
                          <SelectTrigger className="h-10 text-sm">
                            <SelectValue placeholder="Select a contact (Optional)" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="none">Personal (No Contact)</SelectItem>
                          {loadingContacts ? (
                            <SelectItem value="loading" disabled>
                              <div className="flex items-center justify-center gap-2">
                                <BrandLoader size="sm" />
                              </div>
                            </SelectItem>
                          ) : (
                            contacts.map((contact) => (
                              <SelectItem key={contact.id} value={contact.id}>
                                {contact.name}
                              </SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 sm:gap-8">
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
                          <SelectTrigger className="h-10 text-sm">
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

                {category === AssetCategory.Funds ? (
                  <div className="flex items-start gap-4 sm:gap-6">
                    <FormField
                      control={form.control}
                      name="currency"
                      render={({ field }) => (
                        <FormItem className="w-24 sm:w-32 shrink-0">
                          <FormLabel>Currency</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger className="w-full px-2 sm:px-3 h-11 sm:h-10">
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
                      render={({ field }) => (
                        <FormItem className="flex-1 min-w-0">
                          <FormLabel>Amount</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              step="0.01"
                              placeholder="0.00"
                              {...field}
                              className="w-full h-10 px-3 text-sm"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                ) : (
                  <FormField
                    control={form.control}
                    name="quantity"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Quantity</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="1"
                            placeholder="1"
                            {...field}
                            className="h-10 text-sm"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
              </div>

              {category === AssetCategory.Item && (
                <FormField
                  control={form.control}
                  name="itemName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Item Name</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="e.g. Hammer, Laptop, Book"
                          {...field}
                          className="h-10 text-sm"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              {(type === TransactionType.Returned || type === TransactionType.Gift) &&
                contactId && (
                  <FormField
                    control={form.control}
                    name="returnDirection"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Direction</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger className="h-10 text-sm">
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
                      <Input type="date" {...field} className="h-10 text-sm" />
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
                      <Textarea
                        placeholder="Add some details about this transaction..."
                        className="resize-none min-h-[100px] sm:min-h-[120px] rounded-xl sm:rounded-lg border-muted-foreground/20 focus:border-primary/50 transition-colors"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="space-y-4 pt-2">
                <div className="flex items-center justify-between">
                  <FormLabel className="text-base font-bold">Witnesses (Optional)</FormLabel>
                </div>
                <p className="text-xs sm:text-sm text-muted-foreground font-medium leading-relaxed">
                  Add people to witness this transaction. They will receive an invitation to
                  acknowledge it.
                </p>
                <WitnessSelector
                  selectedWitnesses={selectedWitnesses}
                  onChange={setSelectedWitnesses}
                  className="mt-2"
                />
              </div>

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
      <ContactFormDialog
        isOpen={isContactDialogOpen}
        onClose={() => setIsContactDialogOpen(false)}
      />
    </div>
  );
}
