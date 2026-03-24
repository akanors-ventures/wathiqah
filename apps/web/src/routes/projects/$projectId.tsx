import { createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  ArrowDownCircle,
  ArrowLeft,
  ArrowUpCircle,
  Clock,
  Filter,
  Target,
  TrendingDown,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { useState } from "react";
import { ProjectTransactionDialog } from "@/components/projects/ProjectTransactionDialog";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { BrandLoader } from "@/components/ui/page-loader";
import { PaginationControls } from "@/components/ui/pagination-controls";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useProject } from "@/hooks/useProjects";
import { formatCurrency } from "@/lib/utils/formatters";
import type { ProjectTransactionType } from "@/types/__generated__/graphql";
import { authGuard } from "@/utils/auth";
import { format } from "date-fns";

export const Route = createFileRoute("/projects/$projectId")({
  component: ProjectDetailsPage,
  beforeLoad: (ctx) => authGuard({ location: ctx.location }),
});

function ProjectDetailsPage() {
  const { projectId } = Route.useParams();
  const navigate = useNavigate();
  const [txType, setTxType] = useState<string>("ALL");
  const [txCategory, setTxCategory] = useState("");
  const [txStartDate, setTxStartDate] = useState("");
  const [txEndDate, setTxEndDate] = useState("");
  const [txPage, setTxPage] = useState(1);

  const { project, transactions, transactionsTotal, transactionsPage, transactionsLimit, loading } =
    useProject(projectId, {
      type: txType === "ALL" ? undefined : (txType as ProjectTransactionType),
      category: txCategory || undefined,
      startDate: txStartDate ? new Date(txStartDate) : undefined,
      endDate: txEndDate ? new Date(txEndDate) : undefined,
      page: txPage,
      limit: 25,
    });

  const handleTxFilterChange = (setter: (v: string) => void) => (v: string) => {
    setter(v);
    setTxPage(1);
  };

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

  return (
    <div className="container mx-auto py-8 space-y-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate({ to: "/projects" })}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{project.name}</h1>
            {project.description && <p className="text-muted-foreground">{project.description}</p>}
          </div>
        </div>
        <ProjectTransactionDialog projectId={projectId} />
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

      {/* Transactions Table */}
      <Card>
        <CardHeader>
          <CardTitle>Transaction History</CardTitle>
          <div className="flex flex-col sm:flex-row gap-2 pt-2">
            <Select value={txType} onValueChange={handleTxFilterChange(setTxType)}>
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
              placeholder="Category..."
              value={txCategory}
              onChange={(e) => { setTxCategory(e.target.value); setTxPage(1); }}
              className="sm:w-[160px] h-9"
            />
            <Input
              type="date"
              value={txStartDate}
              onChange={(e) => { setTxStartDate(e.target.value); setTxPage(1); }}
              className="sm:w-[150px] h-9"
            />
            <Input
              type="date"
              value={txEndDate}
              onChange={(e) => { setTxEndDate(e.target.value); setTxPage(1); }}
              className="sm:w-[150px] h-9"
            />
          </div>
        </CardHeader>
        <CardContent>
          {transactions.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">
              No transactions yet. Start by logging an income or expense.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Witnesses</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead className="w-16" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactions.map((tx) => (
                  <TableRow key={tx.id}>
                    <TableCell className="font-medium">
                      {format(new Date(tx.date), "MMM d, yyyy")}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={
                          tx.type === "INCOME"
                            ? "text-green-600 border-green-200 bg-green-50"
                            : "text-red-600 border-red-200 bg-red-50"
                        }
                      >
                        {tx.type === "INCOME" ? (
                          <TrendingUp className="w-3 h-3 mr-1" />
                        ) : (
                          <TrendingDown className="w-3 h-3 mr-1" />
                        )}
                        {tx.type}
                      </Badge>
                    </TableCell>
                    <TableCell>{tx.category || "-"}</TableCell>
                    <TableCell className="max-w-[200px] truncate">
                      {tx.description || "-"}
                    </TableCell>
                    <TableCell>
                      <TooltipProvider>
                        <div className="flex items-center gap-1">
                          {tx.witnesses && tx.witnesses.length > 0 ? (
                            <div className="flex -space-x-2 overflow-hidden">
                              {tx.witnesses.map((w) => (
                                <Tooltip key={w.id}>
                                  <TooltipTrigger asChild>
                                    <Avatar className="inline-block h-6 w-6 rounded-full ring-2 ring-background cursor-help">
                                      <AvatarFallback className="text-[10px] bg-primary/10 text-primary">
                                        {w.user?.firstName?.[0]}
                                        {w.user?.lastName?.[0]}
                                      </AvatarFallback>
                                    </Avatar>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p className="text-xs">
                                      {w.user?.firstName} {w.user?.lastName}
                                    </p>
                                    <p className="text-[10px] text-muted-foreground capitalize">
                                      {w.status.toLowerCase()}
                                    </p>
                                  </TooltipContent>
                                </Tooltip>
                              ))}
                            </div>
                          ) : (
                            <span className="text-muted-foreground text-xs">-</span>
                          )}
                          {tx.history && tx.history.length > 0 && (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span className="ml-1 cursor-help">
                                  <Clock className="w-3.5 h-3.5 text-muted-foreground/60" />
                                </span>
                              </TooltipTrigger>
                              <TooltipContent className="max-w-[260px]">
                                <p className="text-xs font-semibold mb-1">Edit History</p>
                                {tx.history.slice(0, 5).map((h) => (
                                  <div
                                    key={h.id}
                                    className="text-[10px] text-muted-foreground mb-0.5"
                                  >
                                    <span className="text-foreground">{h.changeType}</span>
                                    {" · "}
                                    {format(new Date(h.createdAt), "MMM d, h:mm a")}
                                  </div>
                                ))}
                              </TooltipContent>
                            </Tooltip>
                          )}
                        </div>
                      </TooltipProvider>
                    </TableCell>
                    <TableCell
                      className={`text-right font-bold ${
                        tx.type === "INCOME" ? "text-green-600" : "text-red-600"
                      }`}
                    >
                      <span className="whitespace-nowrap">
                        {tx.type === "INCOME" ? "+" : "-"}
                        {formatCurrency(tx.amount, project.currency)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <ProjectTransactionDialog
                        projectId={projectId}
                        editTransaction={{
                          id: tx.id,
                          amount: tx.amount,
                          type: tx.type,
                          category: tx.category,
                          description: tx.description,
                          date: tx.date,
                        }}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
          <PaginationControls
            page={transactionsPage}
            limit={transactionsLimit}
            total={transactionsTotal}
            onPageChange={setTxPage}
          />
        </CardContent>
      </Card>
    </div>
  );
}
