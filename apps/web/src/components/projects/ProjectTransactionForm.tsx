import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import { Calendar as CalendarIcon, Loader2 } from "lucide-react";
import { Resolver, useForm } from "react-hook-form";
import { toast } from "sonner";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
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
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { SelectedWitness, WitnessSelector } from "@/components/witnesses/WitnessSelector";
import { useProjects } from "@/hooks/useProjects";
import { useMutation } from "@apollo/client/react";
import { LOG_PROJECT_TRANSACTION, GET_PROJECT, GET_MY_PROJECTS } from "@/lib/apollo/queries/projects";
import { ProjectTransactionType } from "@/types/__generated__/graphql";
import { cn } from "@/lib/utils";
import { BrandLoader } from "@/components/ui/page-loader";

const formSchema = z.object({
  projectId: z.string().min(1, "Project is required"),
  type: z.enum([ProjectTransactionType.Income, ProjectTransactionType.Expense]),
  amount: z.coerce.number().min(0.01, "Amount must be positive"),
  category: z.string().optional(),
  description: z.string().optional(),
  date: z.date(),
  witnesses: z.custom<SelectedWitness[]>(),
});

type ProjectTransactionFormValues = z.infer<typeof formSchema>;

interface ProjectTransactionFormProps {
  projectId?: string;
  onSuccess?: () => void;
  onCancel?: () => void;
  className?: string;
}

export function ProjectTransactionForm({
  projectId: initialProjectId,
  onSuccess,
  onCancel,
  className,
}: ProjectTransactionFormProps) {
  const { projects, loading: loadingProjects } = useProjects();
  
  const [logTransaction, { loading: logging }] = useMutation(LOG_PROJECT_TRANSACTION, {
    refetchQueries: [
      { query: GET_MY_PROJECTS },
      ...(initialProjectId ? [{ query: GET_PROJECT, variables: { id: initialProjectId } }] : []),
    ],
  });

  const form = useForm<ProjectTransactionFormValues>({
    resolver: zodResolver(formSchema) as Resolver<ProjectTransactionFormValues>,
    defaultValues: {
      projectId: initialProjectId || "",
      type: ProjectTransactionType.Expense,
      amount: 0,
      category: "",
      description: "",
      date: new Date(),
      witnesses: [],
    },
  });

  // Watch projectId to potentially refetch specific project if needed, 
  // but GET_MY_PROJECTS should be enough for the list.
  // If user selects a project, we might want to refetch that project's details too if we were displaying them,
  // but here we just log a transaction.

  async function onSubmit(values: z.infer<typeof formSchema>) {
    try {
      const witnesses = values.witnesses || [];
      const witnessUserIds = witnesses
        .filter((w) => w.userId)
        .map((w) => w.userId as string);
        
      const witnessInvites = witnesses
        .map((w) => w.invite)
        .filter((invite): invite is NonNullable<typeof invite> => !!invite)
        .map((invite) => ({
          ...invite,
          email: invite.email.trim().toLowerCase(),
        }));

      await logTransaction({
        variables: {
          input: {
            projectId: values.projectId,
            amount: values.amount,
            type: values.type,
            category: values.category || undefined,
            description: values.description || undefined,
            date: values.date.toISOString(),
            witnessUserIds: witnessUserIds.length > 0 ? witnessUserIds : undefined,
            witnessInvites: witnessInvites.length > 0 ? witnessInvites : undefined,
          },
        },
      });

      toast.success("Transaction logged successfully");
      form.reset();
      onSuccess?.();
    } catch (error) {
      console.error(error);
      toast.error("Failed to log transaction");
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className={cn("space-y-6", className)}>
        {!initialProjectId && (
          <FormField
            control={form.control}
            name="projectId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Project</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a project" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {loadingProjects ? (
                      <div className="flex items-center justify-center p-2">
                        <BrandLoader size="sm" />
                      </div>
                    ) : projects.length === 0 ? (
                      <div className="p-2 text-sm text-muted-foreground text-center">
                        No projects found
                      </div>
                    ) : (
                      projects.map((project: any) => (
                        <SelectItem key={project.id} value={project.id}>
                          {project.name}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="type"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Type</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value={ProjectTransactionType.Income}>Income</SelectItem>
                    <SelectItem value={ProjectTransactionType.Expense}>Expense</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="date"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Date</FormLabel>
                <Popover>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        variant={"outline"}
                        className={cn(
                          "w-full pl-3 text-left font-normal",
                          !field.value && "text-muted-foreground"
                        )}
                      >
                        {field.value ? (
                          format(field.value, "PPP")
                        ) : (
                          <span>Pick a date</span>
                        )}
                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={field.value}
                      onSelect={field.onChange}
                      disabled={(date) =>
                        date > new Date() || date < new Date("1900-01-01")
                      }
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

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

        <FormField
          control={form.control}
          name="category"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Category (Optional)</FormLabel>
              <FormControl>
                <Input placeholder="e.g., Materials, Labor, Contribution" {...field} />
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
                  placeholder="Add notes about this transaction"
                  className="resize-none"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="space-y-2">
          <FormLabel>Witnesses (Optional)</FormLabel>
          <WitnessSelector
            selectedWitnesses={form.watch("witnesses") || []}
            onChange={(witnesses) => form.setValue("witnesses", witnesses)}
          />
        </div>

        <div className="flex justify-end gap-2 pt-4">
          {onCancel && (
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
          )}
          <Button type="submit" disabled={logging}>
            {logging && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {logging ? "Logging..." : "Log Transaction"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
