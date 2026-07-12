import { Ban, Copy, MoreHorizontal, Pencil, Plus, RefreshCw } from "lucide-react";
import { useId, useState } from "react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAdminPlanMutations, useAdminPlans } from "@/hooks/useAdmin";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/utils/formatters";
import {
  type AdminPlanFieldsFragment,
  BillingInterval,
  PlanStatus,
  SubscriptionTier,
} from "@/types/__generated__/graphql";
import { formatDateTime } from "./admin-format";

const HEAD = "text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 h-12";

const STATUS_META: Record<PlanStatus, { label: string; className: string }> = {
  [PlanStatus.Active]: {
    label: "Active",
    className: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
  },
  [PlanStatus.Inactive]: {
    label: "Inactive",
    className: "bg-muted text-muted-foreground border-border",
  },
  [PlanStatus.Cancelled]: {
    label: "Cancelled",
    className: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20",
  },
};

function StatusBadge({ status }: { status: PlanStatus }) {
  const meta = STATUS_META[status];
  return (
    <Badge variant="outline" className={cn("font-semibold", meta.className)}>
      {meta.label}
    </Badge>
  );
}

function intervalLabel(interval: string): string {
  return interval.charAt(0).toUpperCase() + interval.slice(1);
}

const EMPTY_CREATE_FORM = {
  tier: SubscriptionTier.Pro,
  interval: BillingInterval.Monthly,
  currency: "NGN",
  amount: "",
  name: "",
  duration: "",
};

function NewPlanDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const { createPlan, creating } = useAdminPlanMutations();
  const [form, setForm] = useState(EMPTY_CREATE_FORM);
  const nameId = useId();
  const currencyId = useId();
  const amountId = useId();
  const durationId = useId();

  async function handleCreate() {
    const amount = Number(form.amount);
    if (!form.name.trim()) {
      toast.error("Plan name is required");
      return;
    }
    if (!Number.isFinite(amount) || amount <= 0) {
      toast.error("Amount must be a positive number");
      return;
    }

    try {
      await createPlan({
        tier: form.tier,
        interval: form.interval,
        currency: form.currency.trim().toUpperCase(),
        amount,
        name: form.name.trim(),
        duration: form.duration ? Number(form.duration) : undefined,
      });
      toast.success(`Created plan "${form.name.trim()}"`);
      setForm(EMPTY_CREATE_FORM);
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create plan");
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New payment plan</DialogTitle>
          <DialogDescription>
            Creates a recurring plan on Flutterwave and mirrors it here as the source of truth for
            checkout.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor={nameId}>Name</Label>
            <Input
              id={nameId}
              placeholder="Monthly Wathiqah Pro"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Tier</Label>
              <Select
                value={form.tier}
                onValueChange={(v) => setForm((f) => ({ ...f, tier: v as SubscriptionTier }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={SubscriptionTier.Pro}>Pro</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Interval</Label>
              <Select
                value={form.interval}
                onValueChange={(v) => setForm((f) => ({ ...f, interval: v as BillingInterval }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={BillingInterval.Monthly}>Monthly</SelectItem>
                  <SelectItem value={BillingInterval.Annual}>Annual</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor={currencyId}>Currency</Label>
              <Input
                id={currencyId}
                placeholder="NGN"
                maxLength={3}
                value={form.currency}
                onChange={(e) => setForm((f) => ({ ...f, currency: e.target.value.toUpperCase() }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor={amountId}>Amount</Label>
              <Input
                id={amountId}
                type="number"
                min="0"
                step="0.01"
                placeholder="2500"
                value={form.amount}
                onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor={durationId}>Duration (optional)</Label>
            <Input
              id={durationId}
              type="number"
              min="1"
              placeholder="Leave blank to bill indefinitely"
              value={form.duration}
              onChange={(e) => setForm((f) => ({ ...f, duration: e.target.value }))}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleCreate} isLoading={creating}>
            Create plan
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function EditPlanDialog({
  plan,
  onOpenChange,
}: {
  plan: AdminPlanFieldsFragment;
  onOpenChange: (open: boolean) => void;
}) {
  const { updatePlan, updating } = useAdminPlanMutations();
  const [name, setName] = useState(plan.name);
  const [status, setStatus] = useState<PlanStatus>(plan.status);
  const [tier, setTier] = useState<string>(plan.tier ?? "NONE");
  const nameId = useId();

  async function handleSave() {
    try {
      await updatePlan(plan.id, {
        name: name.trim() || undefined,
        status,
        tier: tier === "NONE" ? undefined : (tier as SubscriptionTier),
      });
      toast.success(`Updated plan "${name.trim() || plan.name}"`);
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update plan");
    }
  }

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit plan</DialogTitle>
          <DialogDescription>
            Name and status changes are pushed to Flutterwave. Tier is local-only — it controls
            which plan checkout selects.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor={nameId}>Name</Label>
            <Input id={nameId} value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select value={status} onValueChange={(v) => setStatus(v as PlanStatus)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={PlanStatus.Active}>Active</SelectItem>
                  <SelectItem value={PlanStatus.Inactive}>Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Tier</Label>
              <Select value={tier} onValueChange={setTier}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="NONE">Unassigned</SelectItem>
                  <SelectItem value={SubscriptionTier.Pro}>Pro</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} isLoading={updating}>
            Save changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function PlanRowActions({ plan }: { plan: AdminPlanFieldsFragment }) {
  const { cancelPlan, cancelling } = useAdminPlanMutations();
  const [editing, setEditing] = useState(false);
  const [confirmingCancel, setConfirmingCancel] = useState(false);
  const isCancelled = plan.status === PlanStatus.Cancelled;

  async function handleCancel() {
    try {
      await cancelPlan(plan.id);
      toast.success(`Cancelled plan "${plan.name}"`);
      setConfirmingCancel(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to cancel plan");
    }
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon-sm" aria-label={`Actions for ${plan.name}`}>
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuItem
            onSelect={() =>
              navigator.clipboard
                .writeText(plan.providerPlanId)
                .then(() => toast.success("Plan ID copied"))
            }
          >
            <Copy className="h-4 w-4" />
            Copy plan ID
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => setEditing(true)}>
            <Pencil className="h-4 w-4" />
            Edit
          </DropdownMenuItem>
          {!isCancelled && (
            <DropdownMenuItem
              onSelect={() => setConfirmingCancel(true)}
              className="text-rose-600 focus:text-rose-600 dark:text-rose-400"
            >
              <Ban className="h-4 w-4" />
              Cancel plan
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {editing && <EditPlanDialog plan={plan} onOpenChange={setEditing} />}

      <AlertDialog open={confirmingCancel} onOpenChange={setConfirmingCancel}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel this plan?</AlertDialogTitle>
            <AlertDialogDescription>
              This cancels <span className="font-semibold">{plan.name}</span> on Flutterwave. New
              checkouts can no longer use it; existing subscribers are unaffected until Flutterwave
              stops renewing them.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep plan</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleCancel();
              }}
              disabled={cancelling}
              className="bg-rose-600 hover:bg-rose-700 focus-visible:ring-rose-600"
            >
              Cancel plan
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

export function PlansTable() {
  const { plans, loading } = useAdminPlans();
  const { syncPlans, syncing } = useAdminPlanMutations();
  const [creatingPlan, setCreatingPlan] = useState(false);

  async function handleSync() {
    try {
      const result = await syncPlans();
      const count = result.data?.adminSyncPlans.length ?? 0;
      toast.success(`Synced ${count} plan(s) from Flutterwave`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to sync plans");
    }
  }

  return (
    <Card className="rounded-[24px] border-border/50">
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <CardTitle className="text-base font-black">Payment plans</CardTitle>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleSync} isLoading={syncing}>
            <RefreshCw className="h-4 w-4" />
            Sync from Flutterwave
          </Button>
          <Button size="sm" onClick={() => setCreatingPlan(true)}>
            <Plus className="h-4 w-4" />
            New plan
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {loading && plans.length === 0 ? (
          <div className="space-y-2">
            {[1, 2, 3].map((n) => (
              <Skeleton key={n} className="h-12 rounded-lg" />
            ))}
          </div>
        ) : plans.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            No plans yet. Sync from Flutterwave to import existing plans, or create a new one.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className={HEAD}>Plan name</TableHead>
                  <TableHead className={HEAD}>Plan ID</TableHead>
                  <TableHead className={HEAD}>Amount</TableHead>
                  <TableHead className={HEAD}>Interval</TableHead>
                  <TableHead className={HEAD}>Tier</TableHead>
                  <TableHead className={HEAD}>Status</TableHead>
                  <TableHead className={HEAD}>Created</TableHead>
                  <TableHead className={cn(HEAD, "text-right")}>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {plans.map((plan) => (
                  <TableRow key={plan.id}>
                    <TableCell className="font-medium">{plan.name}</TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {plan.providerPlanId}
                    </TableCell>
                    <TableCell>{formatCurrency(plan.amount, plan.currency, 2)}</TableCell>
                    <TableCell>{intervalLabel(plan.interval)}</TableCell>
                    <TableCell>
                      {plan.tier ? (
                        <Badge variant="outline">{plan.tier}</Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground">Unassigned</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={plan.status} />
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDateTime(plan.createdAt)}
                    </TableCell>
                    <TableCell className="text-right">
                      <PlanRowActions plan={plan} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>

      <NewPlanDialog open={creatingPlan} onOpenChange={setCreatingPlan} />
    </Card>
  );
}
