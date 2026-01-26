import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useTransactions } from "@/hooks/useTransactions";
import { useContacts } from "@/hooks/useContacts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { BrandLoader } from "@/components/ui/page-loader";
import { TransactionTypeHelp } from "@/components/transactions/TransactionTypeHelp";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TransactionType, AssetCategory } from "@/types/__generated__/graphql";
import { format } from "date-fns";

export const Route = createFileRoute("/transactions/new")({
  component: NewTransactionPage,
});

const formSchema = z
  .object({
    contactId: z.string().optional(),
    type: z.enum([
      TransactionType.Given,
      TransactionType.Received,
      TransactionType.Collected,
      TransactionType.Expense,
      TransactionType.Income,
    ]),
    amount: z.coerce.number().min(0.01, "Amount must be positive"),
    date: z.string().min(1, "Date is required"),
    description: z.string().optional(),
    category: z.enum(AssetCategory).default(AssetCategory.Funds),
  })
  .refine(
    (data) => {
      // If contactId is present, type must be GIVEN, RECEIVED, or COLLECTED
      if (data.contactId) {
        return (
          [TransactionType.Given, TransactionType.Received, TransactionType.Collected] as string[]
        ).includes(data.type);
      }
      // If contactId is missing, type must be EXPENSE or INCOME
      return ([TransactionType.Expense, TransactionType.Income] as string[]).includes(data.type);
    },
    {
      message: "Invalid transaction type for the selected context (Personal vs Contact)",
      path: ["type"],
    },
  );

function NewTransactionPage() {
  const navigate = useNavigate();
  const { createTransaction, creating } = useTransactions();
  const { contacts, loading: loadingContacts } = useContacts();

  const form = useForm<z.infer<typeof formSchema>>({
    // biome-ignore lint/suspicious/noExplicitAny: Complex type mismatch with zodResolver
    resolver: zodResolver(formSchema) as any,
    defaultValues: {
      type: TransactionType.Expense,
      date: format(new Date(), "yyyy-MM-dd"),
      category: AssetCategory.Funds,
    },
  });

  const contactId = form.watch("contactId");

  // Reset type when contact selection changes
  // If contact selected -> GIVEN (default)
  // If contact cleared -> EXPENSE (default)
  // This needs to be handled carefully to avoid infinite loops or bad UX
  // Using useEffect might be better, or just let the user change it.
  // But the validation will fail if they don't change it.

  async function onSubmit(values: z.infer<typeof formSchema>) {
    try {
      await createTransaction({
        ...values,
        contactId: values.contactId || "", // Ensure string if undefined (though backend handles optional)
        date: new Date(values.date).toISOString(),
      });
      navigate({ to: "/transactions" });
    } catch (error) {
      console.error(error);
    }
  }

  return (
    <div className="container mx-auto py-10 max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Create New Transaction</CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="contactId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Contact</FormLabel>
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
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
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
                        ) : contacts.length === 0 ? (
                          <SelectItem value="none" disabled>
                            No contacts found
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
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
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
                              <SelectItem value={TransactionType.Collected}>Collected</SelectItem>
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

                <FormField
                  control={form.control}
                  name="amount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Amount</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" placeholder="0.00" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

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
                      <Textarea
                        placeholder="What was this for?"
                        className="resize-none"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex justify-end gap-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate({ to: "/transactions" })}
                >
                  Cancel
                </Button>
                <Button type="submit" isLoading={creating}>
                  Create Transaction
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
