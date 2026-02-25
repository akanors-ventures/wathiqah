import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useProject } from "@/hooks/useProjects";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, TrendingDown, TrendingUp } from "lucide-react";
import { formatCurrency } from "@/lib/utils/formatters";
import { BrandLoader } from "@/components/ui/page-loader";
import { authGuard } from "@/utils/auth";
import { format } from "date-fns";
import { ProjectTransactionDialog } from "@/components/projects/ProjectTransactionDialog";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

export const Route = createFileRoute("/projects/$projectId")({
  component: ProjectDetailsPage,
  beforeLoad: (ctx) => authGuard({ location: ctx.location }),
});

function ProjectDetailsPage() {
  const { projectId } = Route.useParams();
  const navigate = useNavigate();
  const { project, loading } = useProject(projectId);

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <BrandLoader size="md" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="container mx-auto py-8">
        <div className="text-center py-20">
          <h3 className="text-lg font-medium">Project not found</h3>
          <Button className="mt-4" onClick={() => navigate({ to: "/projects" })}>
            Back to Projects
          </Button>
        </div>
      </div>
    );
  }

  const budgetPercentage = project.budget
    ? Math.min((project.balance / project.budget) * 100, 100)
    : 0;

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

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Current Balance</CardTitle>
            <div className="h-4 w-4 text-muted-foreground">💰</div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(project.balance, project.currency)}
            </div>
          </CardContent>
        </Card>

        {project.budget && (
          <>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Budget</CardTitle>
                <div className="h-4 w-4 text-muted-foreground">🎯</div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatCurrency(project.budget, project.currency)}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Remaining</CardTitle>
                <div className="h-4 w-4 text-muted-foreground">📊</div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatCurrency(project.budget - project.balance, project.currency)}
                </div>
                <div className="mt-2 h-2 bg-secondary rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary transition-all"
                    style={{ width: `${budgetPercentage}%` }}
                  />
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {/* Transactions Table */}
      <Card>
        <CardHeader>
          <CardTitle>Transaction History</CardTitle>
        </CardHeader>
        <CardContent>
          {!project.transactions || project.transactions.length === 0 ? (
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
                </TableRow>
              </TableHeader>
              <TableBody>
                {project.transactions.map((tx) => (
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
                      {tx.witnesses && tx.witnesses.length > 0 ? (
                        <div className="flex -space-x-2 overflow-hidden">
                          <TooltipProvider>
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
                          </TooltipProvider>
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-xs">-</span>
                      )}
                    </TableCell>
                    <TableCell
                      className={`text-right font-bold ${
                        tx.type === "INCOME" ? "text-green-600" : "text-red-600"
                      }`}
                    >
                      {tx.type === "INCOME" ? "+" : "-"}
                      {formatCurrency(tx.amount, project.currency)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
