import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import { Loader2, Plus } from "lucide-react";
import { type Resolver, useForm } from "react-hook-form";
import { useMemo, useState, useId } from "react";
import { toast } from "sonner";
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
import { Textarea } from "@/components/ui/textarea";
import { type SelectedWitness, WitnessSelector } from "@/components/witnesses/WitnessSelector";
import { useProjects } from "@/hooks/useProjects";
import { useMutation } from "@apollo/client/react";
import {
  LOG_PROJECT_TRANSACTION,
  GET_PROJECT,
  GET_MY_PROJECTS,
} from "@/lib/apollo/queries/projects";
import { ProjectTransactionType, type GetMyProjectsQuery } from "@/types/__generated__/graphql";
import { cn } from "@/lib/utils";
import { BrandLoader } from "@/components/ui/page-loader";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { formatCurrency } from "@/lib/utils/formatters";
import { useAmountInput } from "@/hooks/useAmountInput";

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
  const { projects, loading: loadingProjects, createProject, creating } = useProjects();
  const [isProjectDialogOpen, setIsProjectDialogOpen] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");
  const [newProjectDescription, setNewProjectDescription] = useState("");
  const [newProjectBudget, setNewProjectBudget] = useState("");
  const [newProjectCurrency, setNewProjectCurrency] = useState("NGN");
  const [newlyCreatedProject, setNewlyCreatedProject] = useState<{
    id: string;
    name: string;
  } | null>(null);

  const projectNameId = useId();
  const projectDescriptionId = useId();
  const projectBudgetId = useId();
  const projectCurrencyId = useId();

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

  const selectedProject = useMemo(
    () =>
      (projects as GetMyProjectsQuery["myProjects"]).find((p) => p.id === form.watch("projectId")),
    [projects, form.watch],
  );
  const currencyCode = selectedProject?.currency || "NGN";

  const {
    amountDisplay,
    handleAmountChange,
    handleBlur,
    reset: resetAmount,
  } = useAmountInput({
    currencyCode,
    onChange: (value) =>
      form.setValue("amount", value, { shouldValidate: false, shouldDirty: true }),
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    try {
      const witnesses = values.witnesses || [];
      const witnessUserIds = witnesses.filter((w) => w.userId).map((w) => w.userId as string);

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
      resetAmount();
      onSuccess?.();
    } catch (error) {
      console.error(error);
      toast.error("Failed to log transaction");
    }
  }

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjectName.trim()) {
      toast.error("Please enter a project name");
      return;
    }
    try {
      const result = await createProject({
        name: newProjectName.trim(),
        description: newProjectDescription.trim() || undefined,
        budget: newProjectBudget ? Number.parseFloat(newProjectBudget) : undefined,
        currency: newProjectCurrency,
      });
      const created = result.data?.createProject;
      if (created?.id) {
        toast.success("Project created");
        setNewlyCreatedProject(created);
        setTimeout(() => {
          form.setValue("projectId", created.id, { shouldDirty: true, shouldValidate: true });
        }, 0);
        setIsProjectDialogOpen(false);
        setNewProjectName("");
        setNewProjectDescription("");
        setNewProjectBudget("");
        setNewProjectCurrency("NGN");
      } else {
        throw new Error("No project returned");
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to create project");
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className={cn("space-y-6", className)}>
        {!initialProjectId && (
          <FormField
            control={form.control}
            name="projectId"
            render={({ field }) => (
              <FormItem>
                <div className="flex items-center justify-between">
                  <FormLabel>Project</FormLabel>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-6 px-2 text-xs text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                    onClick={() => setIsProjectDialogOpen(true)}
                  >
                    <Plus className="h-3 w-3 mr-1" />
                    New Project
                  </Button>
                </div>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a project" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {loadingProjects && !newlyCreatedProject ? (
                      <div className="flex items-center justify-center p-2">
                        <BrandLoader size="sm" />
                      </div>
                    ) : (projects as GetMyProjectsQuery["myProjects"]).length === 0 &&
                      !newlyCreatedProject ? (
                      <div className="p-2 text-sm text-muted-foreground text-center">
                        No projects found
                      </div>
                    ) : (
                      <>
                        {newlyCreatedProject &&
                          !(projects as GetMyProjectsQuery["myProjects"]).find(
                            (p) => p.id === newlyCreatedProject.id,
                          ) && (
                            <SelectItem key={newlyCreatedProject.id} value={newlyCreatedProject.id}>
                              {newlyCreatedProject.name}
                            </SelectItem>
                          )}
                        {(projects as GetMyProjectsQuery["myProjects"]).map((project) => (
                          <SelectItem key={project.id} value={project.id}>
                            {project.name}
                          </SelectItem>
                        ))}
                      </>
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
            render={() => (
              <FormItem>
                <FormLabel>Date</FormLabel>
                <FormControl>
                  <Input
                    type="date"
                    value={form.watch("date") ? format(form.watch("date"), "yyyy-MM-dd") : ""}
                    onChange={(e) => {
                      const date = e.target.value ? new Date(e.target.value) : new Date();
                      form.setValue("date", date, { shouldValidate: true, shouldDirty: true });
                    }}
                    max={format(new Date(), "yyyy-MM-dd")}
                    className="h-10 text-sm"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="amount"
          render={() => (
            <FormItem>
              <FormLabel>Amount</FormLabel>
              <FormControl>
                <Input
                  type="text"
                  inputMode="decimal"
                  placeholder={formatCurrency(0, currencyCode, 0)}
                  value={amountDisplay}
                  onChange={handleAmountChange}
                  onBlur={() => handleBlur(form.getValues("amount"))}
                />
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
      <Dialog open={isProjectDialogOpen} onOpenChange={setIsProjectDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>New Project</DialogTitle>
            <DialogDescription>Create a project to log this transaction under.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateProject} className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label htmlFor={projectNameId}>Project Name</Label>
              <Input
                id={projectNameId}
                value={newProjectName}
                onChange={(e) => setNewProjectName(e.target.value)}
                required
                placeholder="e.g., Kitchen Renovation"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor={projectDescriptionId}>Description (Optional)</Label>
              <Textarea
                id={projectDescriptionId}
                value={newProjectDescription}
                onChange={(e) => setNewProjectDescription(e.target.value)}
                rows={3}
                placeholder="What is this project about?"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor={projectBudgetId}>Budget (Optional)</Label>
                <Input
                  id={projectBudgetId}
                  type="number"
                  step="0.01"
                  value={newProjectBudget}
                  onChange={(e) => setNewProjectBudget(e.target.value)}
                  placeholder="0.00"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor={projectCurrencyId}>Currency</Label>
                <Select value={newProjectCurrency} onValueChange={setNewProjectCurrency}>
                  <SelectTrigger id={projectCurrencyId}>
                    <SelectValue placeholder="Select currency" />
                  </SelectTrigger>
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
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsProjectDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" isLoading={creating}>
                Create Project
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </Form>
  );
}
