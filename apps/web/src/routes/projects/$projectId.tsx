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
import { ArrowLeft, Plus, TrendingDown, TrendingUp } from "lucide-react";
import { formatCurrency } from "@/lib/utils/formatters";
import { BrandLoader } from "@/components/ui/page-loader";
import { authGuard } from "@/utils/auth";
import { format } from "date-fns";
import { useState, useId } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { ProjectTransactionType } from "@/types/__generated__/graphql";

export const Route = createFileRoute("/projects/$projectId")({
  component: ProjectDetailsPage,
  beforeLoad: (ctx) => authGuard({ location: ctx.location }),
});

function ProjectDetailsPage() {
  const { projectId } = Route.useParams();
  const navigate = useNavigate();
  const { project, loading, logTransaction, logging } = useProject(projectId);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [transactionType, setTransactionType] = useState<ProjectTransactionType>(
    ProjectTransactionType.Expense,
  );
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");

  const typeId = useId();
  const amountId = useId();
  const categoryId = useId();
  const descriptionId = useId();

  const handleLogTransaction = async () => {
    try {
      if (!amount || parseFloat(amount) <= 0) {
        toast.error("Please enter a valid amount");
        return;
      }

      await logTransaction({
        projectId,
        amount: parseFloat(amount),
        type: transactionType,
        category: category || undefined,
        description: description || undefined,
      });

      toast.success("Transaction logged successfully");
      setIsDialogOpen(false);
      setAmount("");
      setCategory("");
      setDescription("");
    } catch (error) {
      toast.error("Failed to log transaction");
      console.error(error);
    }
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
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" /> Log Transaction
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Log Transaction</DialogTitle>
              <DialogDescription>Add income or expense to this project.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label htmlFor={typeId}>Type</Label>
                <Select
                  value={transactionType}
                  onValueChange={(value: ProjectTransactionType) => setTransactionType(value)}
                >
                  <SelectTrigger id={typeId}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="INCOME">Income</SelectItem>
                    <SelectItem value="EXPENSE">Expense</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor={amountId}>Amount</Label>
                <Input
                  id={amountId}
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor={categoryId}>Category (Optional)</Label>
                <Input
                  id={categoryId}
                  placeholder="e.g., Materials, Labor, Donation"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor={descriptionId}>Description (Optional)</Label>
                <Textarea
                  id={descriptionId}
                  placeholder="Add notes about this transaction"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>
              <Button className="w-full" onClick={handleLogTransaction} disabled={logging}>
                {logging ? "Logging..." : "Log Transaction"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
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
