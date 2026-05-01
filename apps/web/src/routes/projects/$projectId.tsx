import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Filter, Target, TrendingDown, TrendingUp, Wallet } from "lucide-react";
import { useState } from "react";
import { StatsCard } from "@/components/dashboard/StatsCard";
import { EditProjectDialog } from "@/components/projects/EditProjectDialog";
import type { ProjectTransactionCardTransaction } from "@/components/projects/ProjectTransactionCard";
import { ProjectTransactionCard } from "@/components/projects/ProjectTransactionCard";
import { ProjectTransactionDialog } from "@/components/projects/ProjectTransactionDialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { Input } from "@/components/ui/input";
import { BrandLoader } from "@/components/ui/page-loader";
import { Pagination } from "@/components/ui/pagination";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useProject } from "@/hooks/useProjects";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/utils/formatters";
import type { ProjectTransactionType } from "@/types/__generated__/graphql";
import { authGuard } from "@/utils/auth";

export const Route = createFileRoute("/projects/$projectId")({
  component: ProjectDetailsPage,
  beforeLoad: (ctx) => authGuard({ location: ctx.location }),
});

function getStatusBadgeClass(status: string): string {
  switch (status) {
    case "ACTIVE":
      return "text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20 border-emerald-100 dark:border-emerald-900/30";
    case "COMPLETED":
      return "text-blue-600 bg-blue-50 dark:bg-blue-900/20 border-blue-100";
    case "ARCHIVED":
      return "text-zinc-500 bg-zinc-100 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700";
    default:
      return "text-zinc-500 bg-zinc-100 border-zinc-200";
  }
}

function ProjectDetailsPage() {
  const { projectId } = Route.useParams();
  const navigate = useNavigate();

  const [txFilter, setTxFilter] = useState<{
    type?: ProjectTransactionType;
    category?: string;
    startDate?: string;
    endDate?: string;
    page: number;
    limit: number;
  }>({ page: 1, limit: 25 });

  const [editingTx, setEditingTx] = useState<ProjectTransactionCardTransaction | null>(null);
  const [editTxOpen, setEditTxOpen] = useState(false);

  const {
    project,
    transactions,
    transactionsTotal,
    transactionsPage,
    transactionsLimit,
    loading,
    updateProject,
    updating,
  } = useProject(projectId, txFilter);

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <BrandLoader size="md" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center py-20">
          <h3 className="text-lg font-medium">Project not found</h3>
          <Button className="mt-4" onClick={() => navigate({ to: "/projects" })}>
            Back to Projects
          </Button>
        </div>
      </div>
    );
  }

  const totalIncome = project.totalIncome ?? 0;
  const totalExpenses = project.totalExpenses ?? 0;
  const budgetUtilization = project.budget
    ? Math.min((totalExpenses / project.budget) * 100, 100)
    : 0;
  const budgetRemaining = project.budget ? project.budget - totalExpenses : null;

  const handleEditTx = (tx: ProjectTransactionCardTransaction) => {
    setEditingTx(tx);
    setEditTxOpen(true);
  };

  return (
    <div className="container mx-auto py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-4 min-w-0">
          <Button
            variant="ghost"
            size="icon"
            className="shrink-0"
            onClick={() => navigate({ to: "/projects" })}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-3xl font-black tracking-tight truncate">{project.name}</h1>
              <span
                className={cn(
                  "text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border shrink-0",
                  getStatusBadgeClass(project.status),
                )}
              >
                {project.status.toLowerCase()}
              </span>
            </div>
            {project.description && (
              <p className="text-sm text-muted-foreground font-medium mt-0.5 truncate">
                {project.description}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <EditProjectDialog
            project={{
              id: project.id,
              name: project.name,
              description: project.description,
              budget: project.budget,
              currency: project.currency,
              status: project.status,
            }}
            onUpdate={updateProject}
            updating={updating}
          />
          <ProjectTransactionDialog projectId={projectId} />
        </div>
      </div>

      {/* Analytics Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          variant="primary"
          title="Current Balance"
          value={formatCurrency(project.balance, project.currency)}
          icon={<Wallet className="h-4 w-4" />}
          description="Net funds available"
        />
        <StatsCard
          title="Total Income"
          value={
            <span className="text-emerald-600">
              {formatCurrency(totalIncome, project.currency)}
            </span>
          }
          icon={<TrendingUp className="h-4 w-4" />}
          description="Funds received"
        />
        <StatsCard
          title="Total Expenses"
          value={
            <span className="text-rose-600">{formatCurrency(totalExpenses, project.currency)}</span>
          }
          icon={<TrendingDown className="h-4 w-4" />}
          description="Funds spent"
        />
        {project.budget ? (
          <StatsCard
            title="Budget Remaining"
            value={
              <span
                className={budgetRemaining != null && budgetRemaining < 0 ? "text-rose-600" : ""}
              >
                {formatCurrency(budgetRemaining ?? 0, project.currency)}
              </span>
            }
            icon={<Target className="h-4 w-4" />}
            description={`${Math.round(budgetUtilization)}% of ${formatCurrency(project.budget, project.currency)} used`}
            descriptionSlot={<Progress value={budgetUtilization} className="h-1.5 mt-2" />}
          />
        ) : (
          <StatsCard
            title="Budget"
            value={<span className="text-muted-foreground">—</span>}
            icon={<Target className="h-4 w-4" />}
            description="No budget set"
          />
        )}
      </div>

      {/* Transaction History */}
      <Card className="rounded-[32px] border-border/50 overflow-hidden transition-all duration-500 hover:shadow-[0_20px_50px_rgba(0,0,0,0.05)]">
        <CardHeader className="flex flex-row items-start justify-between gap-4 pb-4 p-4 sm:p-6">
          <div>
            <CardTitle className="text-lg font-black tracking-tight uppercase opacity-60">
              Transaction History
            </CardTitle>
            <p className="text-[10px] sm:text-xs text-muted-foreground font-medium mt-1">
              All income and expenses for this project.
            </p>
          </div>
          {/* Filters */}
          <div className="flex flex-wrap gap-2 items-center justify-end">
            <Select
              value={txFilter.type ?? "ALL"}
              onValueChange={(v) =>
                setTxFilter((f) => ({
                  ...f,
                  type: v === "ALL" ? undefined : (v as ProjectTransactionType),
                  page: 1,
                }))
              }
            >
              <SelectTrigger className="w-[130px] h-8 text-xs">
                <Filter className="w-3 h-3 mr-1.5 text-muted-foreground" />
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Types</SelectItem>
                <SelectItem value="INCOME">Income</SelectItem>
                <SelectItem value="EXPENSE">Expense</SelectItem>
              </SelectContent>
            </Select>
            <Input
              placeholder="Category…"
              value={txFilter.category ?? ""}
              onChange={(e) =>
                setTxFilter((f) => ({
                  ...f,
                  category: e.target.value || undefined,
                  page: 1,
                }))
              }
              className="w-[130px] h-8 text-xs"
            />
            <DateRangePicker
              value={{
                from: txFilter.startDate ? txFilter.startDate.split("T")[0] : null,
                to: txFilter.endDate ? txFilter.endDate.split("T")[0] : null,
              }}
              onChange={(range) =>
                setTxFilter((f) => ({
                  ...f,
                  startDate: range.from ? new Date(range.from).toISOString() : undefined,
                  endDate: range.to ? new Date(range.to).toISOString() : undefined,
                  page: 1,
                }))
              }
            />
          </div>
        </CardHeader>
        <CardContent className="p-4 sm:p-6 pt-0 space-y-4">
          {transactions.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground rounded-[24px] border border-dashed border-border/40">
              No transactions yet. Start by logging an income or expense.
            </div>
          ) : (
            <div className="grid gap-3 lg:grid-cols-2">
              {transactions.map((tx) => (
                <ProjectTransactionCard
                  key={tx.id}
                  transaction={{
                    id: tx.id,
                    type: tx.type,
                    amount: tx.amount,
                    category: tx.category,
                    description: tx.description,
                    date: tx.date,
                    witnesses: tx.witnesses,
                    history: tx.history,
                  }}
                  currency={project.currency}
                  onEdit={handleEditTx}
                />
              ))}
            </div>
          )}
          <Pagination
            total={transactionsTotal}
            page={transactionsPage}
            limit={transactionsLimit}
            onPageChange={(p) => setTxFilter((f) => ({ ...f, page: p }))}
            onLimitChange={(l) => setTxFilter((f) => ({ ...f, limit: l, page: 1 }))}
          />
        </CardContent>
      </Card>

      {/* Controlled edit dialog driven by card pencil button */}
      {editingTx && (
        <ProjectTransactionDialog
          projectId={projectId}
          editTransaction={{
            id: editingTx.id,
            amount: editingTx.amount ?? 0,
            type: editingTx.type as ProjectTransactionType,
            category: editingTx.category,
            description: editingTx.description,
            date: editingTx.date as string,
          }}
          open={editTxOpen}
          onOpenChange={(v) => {
            setEditTxOpen(v);
            if (!v) setEditingTx(null);
          }}
        />
      )}
    </div>
  );
}
