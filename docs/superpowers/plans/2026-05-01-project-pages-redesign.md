# Project Pages Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bring the Projects list page and Project detail page into visual alignment with the dashboard's gold-standard design language.

**Architecture:** Three coordinated file changes — a new `ProjectCard` component for the list page, a header/card-grid upgrade to the list route, and a header/analytics/section-wrapper upgrade to the detail route. `StatsCard` already has the `descriptionSlot` prop added (committed). No backend changes.

**Tech Stack:** React 19, TanStack Router, Apollo Client, Shadcn UI, Tailwind CSS, lucide-react

---

## File Map

| Action       | File                                               | Purpose                                                                                              |
| ------------ | -------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| Already done | `apps/web/src/components/dashboard/StatsCard.tsx`  | `descriptionSlot?: React.ReactNode` added                                                            |
| Create       | `apps/web/src/components/projects/ProjectCard.tsx` | Rich project card with avatar, mini-stats, budget bar                                                |
| Modify       | `apps/web/src/routes/projects/index.tsx`           | Replace plain Card grid; upgrade header & empty state                                                |
| Modify       | `apps/web/src/routes/projects/$projectId.tsx`      | Upgrade header typography + status badge; replace analytics with StatsCard; wrap transaction section |

---

## Task 1: Create `ProjectCard` component

**Files:**

- Create: `apps/web/src/components/projects/ProjectCard.tsx`

- [ ] **Step 1: Create `ProjectCard.tsx`**

```tsx
// apps/web/src/components/projects/ProjectCard.tsx
import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/utils/formatters";
import type { ProjectFieldsFragment } from "@/types/__generated__/graphql";

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

interface ProjectCardProps {
  project: ProjectFieldsFragment;
}

export function ProjectCard({ project }: ProjectCardProps) {
  const initials = project.name
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const totalExpenses = project.totalExpenses ?? 0;
  const totalIncome = project.totalIncome ?? 0;
  const balance = project.balance ?? 0;

  const budgetUtilization = project.budget
    ? Math.min((totalExpenses / project.budget) * 100, 100)
    : 0;

  return (
    <Link
      to="/projects/$projectId"
      params={{ projectId: project.id }}
      className="block no-underline group"
    >
      <div
        className={cn(
          "relative overflow-hidden rounded-[24px] border border-border/50 bg-card p-5",
          "transition-all duration-500 hover:shadow-[0_20px_50px_rgba(0,0,0,0.08)] hover:-translate-y-1 hover:border-primary/30",
        )}
      >
        {/* Top row: avatar + status badge */}
        <div className="flex items-start justify-between mb-4">
          <div className="w-11 h-11 rounded-[14px] bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-sm font-black text-white shadow-lg shrink-0">
            {initials}
          </div>
          <span
            className={cn(
              "text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border",
              getStatusBadgeClass(project.status),
            )}
          >
            {project.status.toLowerCase()}
          </span>
        </div>

        {/* Name + description */}
        <div className="mb-4">
          <h3 className="text-base font-bold tracking-tight leading-tight truncate">
            {project.name}
          </h3>
          {project.description && (
            <p className="text-[11px] text-muted-foreground opacity-70 truncate mt-0.5">
              {project.description}
            </p>
          )}
        </div>

        {/* Mini-stat cells */}
        <div className="grid grid-cols-3 gap-2 mb-4">
          <div className="bg-muted/40 rounded-[10px] p-2.5">
            <p className="text-[8px] font-bold uppercase tracking-wider text-muted-foreground/60 mb-0.5">
              Balance
            </p>
            <p
              className={cn(
                "text-sm font-black tracking-tight",
                balance < 0
                  ? "text-rose-600"
                  : balance > 0
                    ? "text-emerald-600"
                    : "text-foreground",
              )}
            >
              {formatCurrency(balance, project.currency)}
            </p>
          </div>
          <div className="bg-muted/40 rounded-[10px] p-2.5">
            <p className="text-[8px] font-bold uppercase tracking-wider text-muted-foreground/60 mb-0.5">
              Income
            </p>
            <p
              className={cn(
                "text-sm font-black tracking-tight",
                totalIncome > 0 ? "text-emerald-600" : "text-foreground",
              )}
            >
              {formatCurrency(totalIncome, project.currency)}
            </p>
          </div>
          <div className="bg-muted/40 rounded-[10px] p-2.5">
            <p className="text-[8px] font-bold uppercase tracking-wider text-muted-foreground/60 mb-0.5">
              Expenses
            </p>
            <p
              className={cn(
                "text-sm font-black tracking-tight",
                totalExpenses > 0 ? "text-rose-600" : "text-foreground",
              )}
            >
              {formatCurrency(totalExpenses, project.currency)}
            </p>
          </div>
        </div>

        {/* Budget row */}
        <div className="flex items-center gap-3">
          <div className="flex-1 min-w-0">
            {project.budget ? (
              <>
                <div className="h-[3px] rounded-full bg-secondary/50 overflow-hidden mb-1">
                  <div
                    className="h-full bg-indigo-500 rounded-full transition-all duration-500"
                    style={{ width: `${budgetUtilization}%` }}
                  />
                </div>
                <p className="text-[9px] font-medium text-muted-foreground">
                  {Math.round(budgetUtilization)}% of{" "}
                  {formatCurrency(project.budget, project.currency)}
                </p>
              </>
            ) : (
              <p className="text-[9px] font-medium text-muted-foreground italic">
                No budget set
              </p>
            )}
          </div>
          <div className="w-8 h-8 rounded-full bg-muted/50 flex items-center justify-center shrink-0">
            <ArrowRight className="w-3.5 h-3.5 text-muted-foreground" />
          </div>
        </div>

        {/* Decorative glow */}
        <div className="absolute -right-10 -bottom-10 w-28 h-28 rounded-full bg-indigo-500/5 blur-3xl group-hover:bg-indigo-500/10 transition-colors duration-500" />
      </div>
    </Link>
  );
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
cd /Users/fawazabdganiyu/akanors-ventures/apps/wathiqah && pnpm --filter web typecheck 2>&1 | grep -i "error" | head -20
```

Expected: no errors referencing `ProjectCard.tsx`.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/components/projects/ProjectCard.tsx
git commit -m "feat(projects): add rich ProjectCard component with mini-stats and budget bar"
```

---

## Task 2: Upgrade Projects list page (`projects/index.tsx`)

**Files:**

- Modify: `apps/web/src/routes/projects/index.tsx`

Changes: upgrade header typography, swap plain `Card` grid for `ProjectCard`, upgrade empty state with `FolderKanban` icon.

- [ ] **Step 1: Replace `apps/web/src/routes/projects/index.tsx`**

```tsx
// apps/web/src/routes/projects/index.tsx
import { createFileRoute, Link } from "@tanstack/react-router";
import { Filter, FolderKanban, Plus, Search } from "lucide-react";
import { ProjectCard } from "@/components/projects/ProjectCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { BrandLoader } from "@/components/ui/page-loader";
import { Pagination } from "@/components/ui/pagination";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useProjectFilters } from "@/hooks/useProjectFilters";
import { useProjects } from "@/hooks/useProjects";
import type { ProjectFieldsFragment } from "@/types/__generated__/graphql";
import { authGuard } from "@/utils/auth";

export const Route = createFileRoute("/projects/")({
  component: ProjectsPage,
  beforeLoad: (ctx) => authGuard({ location: ctx.location }),
});

function ProjectsPage() {
  const {
    search,
    setSearch,
    status,
    setStatus,
    balanceStanding,
    setBalanceStanding,
    page,
    setPage,
    limit,
    setLimit,
    variables,
  } = useProjectFilters();

  const { projects, total, loading } = useProjects(variables.filter);

  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-black tracking-tight">Projects</h1>
          <p className="text-sm text-muted-foreground font-medium opacity-70">
            Manage your project funds and expenses.
          </p>
        </div>
        <Button
          asChild
          className="shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-transform"
        >
          <Link to="/projects/new">
            <Plus className="w-4 h-4 mr-2" /> New Project
          </Link>
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search projects..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select
          value={status}
          onValueChange={(v) => setStatus(v as typeof status)}
        >
          <SelectTrigger className="sm:w-[160px]">
            <Filter className="w-4 h-4 mr-2 text-muted-foreground" />
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Status</SelectItem>
            <SelectItem value="ACTIVE">Active</SelectItem>
            <SelectItem value="COMPLETED">Completed</SelectItem>
            <SelectItem value="ARCHIVED">Archived</SelectItem>
          </SelectContent>
        </Select>
        <Select
          value={balanceStanding}
          onValueChange={(v) => setBalanceStanding(v as typeof balanceStanding)}
        >
          <SelectTrigger className="sm:w-[180px]">
            <SelectValue placeholder="Budget Standing" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Projects</SelectItem>
            <SelectItem value="UNDER_BUDGET">Under Budget</SelectItem>
            <SelectItem value="OVER_BUDGET">Over Budget</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex justify-center py-10">
          <BrandLoader size="md" />
        </div>
      ) : projects.length === 0 ? (
        <div className="rounded-[24px] border border-dashed border-border/40 py-20 text-center">
          <div className="flex justify-center mb-4">
            <div className="w-14 h-14 bg-primary/5 rounded-full flex items-center justify-center">
              <FolderKanban className="w-7 h-7 text-primary/40" />
            </div>
          </div>
          <h3 className="text-lg font-semibold tracking-tight">
            No projects found
          </h3>
          <p className="text-sm text-muted-foreground mt-1 mb-5">
            {search || status !== "ALL" || balanceStanding !== "ALL"
              ? "Try adjusting your filters."
              : "Create a project to start tracking funds."}
          </p>
          {!search && status === "ALL" && balanceStanding === "ALL" && (
            <Button asChild variant="outline">
              <Link to="/projects/new">Create Project</Link>
            </Button>
          )}
        </div>
      ) : (
        <>
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {projects.map((project: ProjectFieldsFragment) => (
              <ProjectCard key={project.id} project={project} />
            ))}
          </div>
          <Pagination
            total={total}
            page={page}
            limit={limit}
            onPageChange={setPage}
            onLimitChange={setLimit}
          />
        </>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
cd /Users/fawazabdganiyu/akanors-ventures/apps/wathiqah && pnpm --filter web typecheck 2>&1 | grep -i "error" | head -20
```

Expected: no errors referencing `index.tsx`.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/routes/projects/index.tsx
git commit -m "feat(projects): upgrade list page with ProjectCard grid and improved empty state"
```

---

## Task 3: Upgrade Project detail page (`$projectId.tsx`)

**Files:**

- Modify: `apps/web/src/routes/projects/$projectId.tsx`

Three changes:

1. Header: `font-black` typography + status badge below project name
2. Analytics: replace 4 plain `Card` elements with `StatsCard`; budget card uses `descriptionSlot` for progress bar
3. Transaction section: wrap in `rounded-[32px]` Card; filters move into `CardHeader`

- [ ] **Step 1: Replace `apps/web/src/routes/projects/$projectId.tsx`**

```tsx
// apps/web/src/routes/projects/$projectId.tsx
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  ArrowLeft,
  Filter,
  Target,
  TrendingDown,
  TrendingUp,
  Wallet,
} from "lucide-react";
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
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/utils/formatters";
import { useProject } from "@/hooks/useProjects";
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

  const [editingTx, setEditingTx] =
    useState<ProjectTransactionCardTransaction | null>(null);
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
          <Button
            className="mt-4"
            onClick={() => navigate({ to: "/projects" })}
          >
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
  const budgetRemaining = project.budget
    ? project.budget - totalExpenses
    : null;

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
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-3xl font-black tracking-tight truncate">
                {project.name}
              </h1>
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
            <span className="text-rose-600">
              {formatCurrency(totalExpenses, project.currency)}
            </span>
          }
          icon={<TrendingDown className="h-4 w-4" />}
          description="Funds spent"
        />
        {project.budget ? (
          <StatsCard
            title="Budget Remaining"
            value={
              <span
                className={
                  budgetRemaining != null && budgetRemaining < 0
                    ? "text-rose-600"
                    : ""
                }
              >
                {formatCurrency(budgetRemaining ?? 0, project.currency)}
              </span>
            }
            icon={<Target className="h-4 w-4" />}
            description={`${Math.round(budgetUtilization)}% of ${formatCurrency(project.budget, project.currency)} used`}
            descriptionSlot={
              <Progress value={budgetUtilization} className="h-1.5 mt-2" />
            }
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

      {/* Transaction History — wrapped in dashboard-style section card */}
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
                from: txFilter.startDate
                  ? txFilter.startDate.split("T")[0]
                  : null,
                to: txFilter.endDate ? txFilter.endDate.split("T")[0] : null,
              }}
              onChange={(range) =>
                setTxFilter((f) => ({
                  ...f,
                  startDate: range.from
                    ? new Date(range.from).toISOString()
                    : undefined,
                  endDate: range.to
                    ? new Date(range.to).toISOString()
                    : undefined,
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
            onLimitChange={(l) =>
              setTxFilter((f) => ({ ...f, limit: l, page: 1 }))
            }
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
```

- [ ] **Step 2: Verify TypeScript**

```bash
cd /Users/fawazabdganiyu/akanors-ventures/apps/wathiqah && pnpm --filter web typecheck 2>&1 | grep -i "error" | head -30
```

Expected: no errors. Common issues to fix:

- If `tx.amount` type is `Decimal | null` from generated types, cast to `(tx.amount as unknown as number)` in the `ProjectTransactionCard` mapping
- If `budgetRemaining` type check fails, ensure null guard is correct

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/routes/projects/$projectId.tsx
git commit -m "feat(projects): upgrade detail page with StatsCard analytics and section wrapper"
```

---

## Task 4: Visual verification

- [ ] **Step 1: Ensure the dev server is running**

```bash
# Check if already running on port 3000
lsof -ti:3000 | head -1
# If nothing, start it:
pnpm --filter web dev
```

- [ ] **Step 2: Verify Projects list page**

Navigate to `http://localhost:3000/projects`. Check:

- Header: "Projects" in `font-black` heavier weight, subtitle slightly muted
- "New Project" button: subtle shadow and scale-on-hover
- Project cards: indigo avatar, status badge pill, three mini-stat cells, budget bar (or "No budget set"), arrow circle, hover lift + glow

- [ ] **Step 3: Verify Project detail page**

Navigate to a project detail page. Check:

- Header: project name in `font-black`, status badge pill inline with name, description in `font-medium`
- Analytics row: four `StatsCard` components with rotating icon on hover, lift shadow, the budget card shows a `Progress` bar below description text
- Transaction History: wrapped in a rounded-[32px] card; filters are in the card header (right side); transaction cards render in a 2-column grid

- [ ] **Step 4: Take screenshot as proof**

Use the preview screenshot tool to capture the list page and detail page.
