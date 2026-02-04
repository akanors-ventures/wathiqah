import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import { Loader2 } from "lucide-react";
import { useForm } from "react-hook-form";
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
  ReturnDirection,
  TransactionType,
} from "@/types/__generated__/graphql";

const formSchema = z
  .object({
    itemName: z.string().min(2, "Item name is required"),
    quantity: z.coerce.number().min(1, "Quantity must be at least 1"),
    type: z.enum(["LENT", "BORROWED", "RETURNED", "GIFT"]),
    returnDirection: z.enum([ReturnDirection.ToMe, ReturnDirection.ToContact]).optional(),
    contactId: z.string().min(1, "Contact is required"),
    date: z.string(), // Use string for native date input
    description: z.string().optional(),
  })
  .refine(
    (data) => {
      if ((data.type === "RETURNED" || data.type === "GIFT") && !data.returnDirection) {
        return false;
      }
      return true;
    },
    {
      message: "Direction is required for this transaction type",
      path: ["returnDirection"],
    },
  );

type FormValues = z.infer<typeof formSchema>;

interface ItemFormProps {
  onSubmit: (values: CreateTransactionInput) => Promise<void>;
  defaultValues?: Partial<FormValues>;
  isLoading?: boolean;
}

export function ItemForm({ onSubmit, defaultValues, isLoading }: ItemFormProps) {
  const { contacts } = useContacts();

  // biome-ignore lint/suspicious/noExplicitAny: Form types are complex with zod coercion
  const form = useForm<any>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      itemName: "",
      quantity: 1,
      type: "LENT",
      date: format(new Date(), "yyyy-MM-dd"),
      description: "",
      ...defaultValues,
    },
  });

  const type = form.watch("type");

  const handleSubmit = async (values: FormValues) => {
    // Map action types to API types
    let apiType: TransactionType;
    if (values.type === "LENT") {
      apiType = TransactionType.Given;
    } else if (values.type === "BORROWED") {
      apiType = TransactionType.Received;
    } else if (values.type === "RETURNED") {
      apiType = TransactionType.Returned;
    } else {
      apiType = TransactionType.Gift;
    }

    const apiValues: CreateTransactionInput = {
      category: AssetCategory.Item,
      type: apiType,
      returnDirection: values.returnDirection,
      itemName: values.itemName,
      quantity: values.quantity,
      date: new Date(values.date).toISOString(), // Convert string to ISO string
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
                    <SelectItem value="RETURNED">Return/Repay Item</SelectItem>
                    <SelectItem value="GIFT">Gift Item</SelectItem>
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

        {(type === "RETURNED" || type === "GIFT") && (
          <FormField
            control={form.control}
            name="returnDirection"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Direction</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select direction" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value={ReturnDirection.ToMe}>
                      To Me (Contact provided it)
                    </SelectItem>
                    <SelectItem value={ReturnDirection.ToContact}>
                      To Contact (I provided it)
                    </SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

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
