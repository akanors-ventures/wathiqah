import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ArrowDownCircle, ArrowLeft, ArrowUpCircle, Filter, Target, Wallet } from "lucide-react";
import { useState } from "react";
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
import { formatCurrency } from "@/lib/utils/formatters";
import type { ProjectTransactionType } from "@/types/__generated__/graphql";
import { authGuard } from "@/utils/auth";

export const Route = createFileRoute("/projects/$projectId")({
  component: ProjectDetailsPage,
  beforeLoad: (ctx) => authGuard({ location: ctx.location }),
});

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
      <div className="flex items-start justify-between gap-4">
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
            <h1 className="text-3xl font-bold tracking-tight truncate">{project.name}</h1>
            {project.description && (
              <p className="text-muted-foreground mt-0.5 truncate">{project.description}</p>
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
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Current Balance</CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(project.balance, project.currency)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Net funds available</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Income</CardTitle>
            <ArrowUpCircle className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600">
              {formatCurrency(totalIncome, project.currency)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Funds received</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Expenses</CardTitle>
            <ArrowDownCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {formatCurrency(totalExpenses, project.currency)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Funds spent</p>
          </CardContent>
        </Card>

        {project.budget ? (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Budget Remaining</CardTitle>
              <Target className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div
                className={`text-2xl font-bold ${budgetRemaining != null && budgetRemaining < 0 ? "text-red-600" : ""}`}
              >
                {formatCurrency(budgetRemaining ?? 0, project.currency)}
              </div>
              <div className="mt-2 space-y-1">
                <Progress value={budgetUtilization} className="h-1.5" />
                <p className="text-xs text-muted-foreground">
                  {Math.round(budgetUtilization)}% of{" "}
                  {formatCurrency(project.budget, project.currency)} budget used
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Budget</CardTitle>
              <Target className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-muted-foreground">—</div>
              <p className="text-xs text-muted-foreground mt-1">No budget set</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Transaction History */}
      <div className="space-y-4">
        {/* Section header + filters */}
        <div className="flex flex-wrap gap-2 items-center">
          <h2 className="text-xl font-semibold tracking-tight flex-1 min-w-[140px]">
            Transaction History
          </h2>
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
            <SelectTrigger className="sm:w-[150px]">
              <Filter className="w-4 h-4 mr-2 text-muted-foreground" />
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
            className="sm:w-[160px] h-9"
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

        {/* Card grid */}
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
      </div>

      {/* Controlled edit dialog triggered by card pencil button */}
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
