import { zodResolver } from "@hookform/resolvers/zod";
import { Plus } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import { toast } from "sonner";
import { usePromises } from "@/hooks/usePromises";
import { Priority, type Promise as PromiseType } from "@/types/__generated__/graphql";

const promiseSchema = z.object({
  description: z.string().min(3, "Description is required"),
  promiseTo: z.string().min(1, "Promise to is required"),
  dueDate: z.string().min(1, "Due date is required"),
  priority: z.enum(Priority),
  notes: z.string().optional(),
});

type PromiseFormValues = z.infer<typeof promiseSchema>;

interface PromiseFormDialogProps {
  promise?: PromiseType; // If provided, it's edit mode
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  trigger?: React.ReactNode;
}

export function PromiseFormDialog({
  promise,
  open: controlledOpen,
  onOpenChange: setControlledOpen,
  trigger,
}: PromiseFormDialogProps) {
  const [open, setOpen] = useState(false);
  const isControlled = controlledOpen !== undefined;
  const isOpen = isControlled ? controlledOpen : open;
  const onOpenChange = isControlled ? setControlledOpen : setOpen;

  const { createPromise, updatePromise, creating, updating } = usePromises();
  const loading = creating || updating;

  const form = useForm<PromiseFormValues>({
    resolver: zodResolver(promiseSchema),
    defaultValues: {
      description: promise?.description || "",
      promiseTo: promise?.promiseTo || "",
      dueDate: promise?.dueDate
        ? new Date(promise.dueDate as string).toISOString().split("T")[0]
        : "",
      priority: promise?.priority || Priority.Medium,
      notes: promise?.notes || "",
    },
  });

  const onSubmit = async (values: PromiseFormValues) => {
    try {
      if (promise) {
        await updatePromise({
          id: promise.id,
          ...values,
        });
        toast.success("Promise updated successfully");
      } else {
        await createPromise(values);
        toast.success("Promise created successfully");
      }
      onOpenChange?.(false);
      form.reset();
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      {trigger ? (
        <DialogTrigger asChild>{trigger}</DialogTrigger>
      ) : (
        !isControlled && (
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" /> New Promise
            </Button>
          </DialogTrigger>
        )
      )}
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{promise ? "Edit Promise" : "New Promise"}</DialogTitle>
          <DialogDescription>
            {promise
              ? "Update the details of your promise."
              : "Create a new promise to track your commitments."}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. Pay back Ahmad Sulaiman" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="promiseTo"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Promise To</FormLabel>
                  <FormControl>
                    <Input placeholder="Ahmad Sulaiman" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="dueDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Due Date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="priority"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Priority</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select priority" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value={Priority.Low}>Low</SelectItem>
                        <SelectItem value={Priority.Medium}>Medium</SelectItem>
                        <SelectItem value={Priority.High}>High</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes (Optional)</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Additional details..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="submit" isLoading={loading}>
                {promise ? "Save Changes" : "Create Promise"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
