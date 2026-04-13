import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import { Loader2 } from "lucide-react";
import { type Resolver, useForm } from "react-hook-form";
import * as z from "zod";

import { Button } from "@/components/ui/button";
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
import { useContacts } from "@/hooks/useContacts";
import {
  AssetCategory,
  type CreateTransactionInput,
  TransactionType,
} from "@/types/__generated__/graphql";

const formSchema = z.object({
  itemName: z.string().min(2, "Item name is required"),
  quantity: z.coerce.number().min(1, "Quantity must be at least 1"),
  type: z.enum([
    "LENT",
    "BORROWED",
    "RETURNED_TO_ME",
    "RETURNED_TO_CONTACT",
    "GIFT_GIVEN",
    "GIFT_RECEIVED",
  ]),
  contactId: z.string().min(1, "Contact is required"),
  date: z.string(),
  description: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

const ACTION_TYPE_MAP: Record<FormValues["type"], TransactionType> = {
  LENT: TransactionType.LoanGiven,
  BORROWED: TransactionType.LoanReceived,
  RETURNED_TO_ME: TransactionType.RepaymentReceived,
  RETURNED_TO_CONTACT: TransactionType.RepaymentMade,
  GIFT_GIVEN: TransactionType.GiftGiven,
  GIFT_RECEIVED: TransactionType.GiftReceived,
};

interface ItemFormProps {
  onSubmit: (values: CreateTransactionInput) => Promise<void>;
  defaultValues?: Partial<FormValues>;
  isLoading?: boolean;
}

export function ItemForm({ onSubmit, defaultValues, isLoading }: ItemFormProps) {
  const { contacts } = useContacts();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema) as Resolver<FormValues>,
    defaultValues: {
      itemName: "",
      quantity: 1,
      type: "LENT",
      date: format(new Date(), "yyyy-MM-dd"),
      description: "",
      ...defaultValues,
    },
  });

  const handleSubmit = async (values: FormValues) => {
    const apiValues: CreateTransactionInput = {
      category: AssetCategory.Item,
      type: ACTION_TYPE_MAP[values.type],
      itemName: values.itemName,
      quantity: values.quantity,
      date: new Date(values.date).toISOString(),
      contactId: values.contactId || undefined,
      description: values.description,
    };
    await onSubmit(apiValues);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2">
          <FormField
            control={form.control}
            name="type"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Action</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select action" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="LENT">Lend Item (Give)</SelectItem>
                    <SelectItem value="BORROWED">Borrow Item (Receive)</SelectItem>
                    <SelectItem value="RETURNED_TO_ME">Returned to Me</SelectItem>
                    <SelectItem value="RETURNED_TO_CONTACT">Returned to Contact</SelectItem>
                    <SelectItem value="GIFT_GIVEN">Gift Given</SelectItem>
                    <SelectItem value="GIFT_RECEIVED">Gift Received</SelectItem>
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
                <FormLabel>Contact</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select contact" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
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
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <FormField
            control={form.control}
            name="itemName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Item Name</FormLabel>
                <FormControl>
                  <Input placeholder="e.g. Power Drill" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="quantity"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Quantity</FormLabel>
                <FormControl>
                  <Input type="number" min={1} {...field} />
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
              <FormLabel>Notes / Condition</FormLabel>
              <FormControl>
                <Input placeholder="e.g. Brand new, return by Friday" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" className="w-full" disabled={isLoading}>
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            "Save Item Transaction"
          )}
        </Button>
      </form>
    </Form>
  );
}
