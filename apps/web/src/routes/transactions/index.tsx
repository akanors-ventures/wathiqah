import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useTransactions } from "@/hooks/useTransactions";
import { authGuard } from "@/utils/auth";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { formatCurrency } from "@/lib/utils/formatters";
import {
  ArrowUpRight,
  ArrowDownLeft,
  Search,
  Filter,
  Download,
  Plus,
  ArrowRightLeft,
} from "lucide-react";
import { BrandLoader } from "@/components/ui/page-loader";
import { TransactionTypeHelp } from "@/components/transactions/TransactionTypeHelp";

export const Route = createFileRoute("/transactions/")({
  component: TransactionsPage,
  beforeLoad: authGuard,
});

function TransactionsPage() {
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("ALL");
  const { transactions, loading, summary } = useTransactions();

  const filteredTransactions = transactions.filter((tx) => {
    const matchesSearch =
      (tx.description?.toLowerCase() || "").includes(search.toLowerCase()) ||
      (tx.contact?.name?.toLowerCase() || "").includes(search.toLowerCase());
    const matchesType = typeFilter === "ALL" || tx.type === typeFilter;
    return matchesSearch && matchesType;
  });

  const handleExport = () => {
    // Simple CSV export implementation
    const headers = ["Date", "Type", "Contact", "Description", "Amount", "Status"];
    const csvContent = [
      headers.join(","),
      ...filteredTransactions.map((tx) =>
        [
          format(new Date(tx.date as string), "yyyy-MM-dd"),
          tx.type,
          tx.contact?.name || "Unknown",
          `"${tx.description || ""}"`,
          tx.amount || 0,
          "Completed",
        ].join(","),
      ),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `transactions_export_${format(new Date(), "yyyyMMdd")}.csv`;
    link.click();
  };

  return (
    <div className="container mx-auto py-8 space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Transactions</h1>
          <p className="text-muted-foreground">Manage and track your financial history.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExport}>
            <Download className="w-4 h-4 mr-2" /> Export
          </Button>
          <Button asChild>
            <Link to="/transactions/new">
              <Plus className="w-4 h-4 mr-2" /> New Transaction
            </Link>
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Net Balance</CardTitle>
              <div className="h-4 w-4 text-muted-foreground">💰</div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(summary.netBalance)}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Given</CardTitle>
              <ArrowUpRight className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                {formatCurrency(summary.totalGiven)}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Received</CardTitle>
              <ArrowDownLeft className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {formatCurrency(summary.totalReceived)}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Collected</CardTitle>
              <ArrowRightLeft className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">
                {formatCurrency(summary.totalCollected)}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 items-center bg-card p-4 rounded-lg border">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by description or contact..."
            className="pl-8"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <Filter className="w-4 h-4 mr-2 text-muted-foreground" />
            <SelectValue placeholder="Filter Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Types</SelectItem>
            <SelectItem value="GIVEN">Given</SelectItem>
            <SelectItem value="RECEIVED">Received</SelectItem>
            <SelectItem value="COLLECTED">Collected</SelectItem>
            <SelectItem value="EXPENSE">Expense</SelectItem>
            <SelectItem value="INCOME">Income</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Transactions Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>
                  <div className="flex items-center gap-1">
                    Type
                    <TransactionTypeHelp />
                  </div>
                </TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Witnesses</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-10">
                    <div className="flex justify-center">
                      <BrandLoader size="sm" />
                    </div>
                  </TableCell>
                </TableRow>
              ) : filteredTransactions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-10 text-muted-foreground">
                    No transactions found matching your criteria.
                  </TableCell>
                </TableRow>
              ) : (
                filteredTransactions.map((tx) => (
                  <TableRow key={tx.id}>
                    <TableCell className="font-medium">
                      {format(new Date(tx.date as string), "MMM d, yyyy")}
                    </TableCell>
                    <TableCell>
                      <span className="font-medium text-foreground">
                        {tx.contact?.name || (
                          <span className="text-muted-foreground italic">Personal</span>
                        )}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={
                          tx.type === "GIVEN" || tx.type === "EXPENSE"
                            ? "text-red-600 border-red-200 bg-red-50"
                            : tx.type === "RECEIVED" || tx.type === "INCOME"
                              ? "text-green-600 border-green-200 bg-green-50"
                              : "text-blue-600 border-blue-200 bg-blue-50"
                        }
                      >
                        {tx.type}
                      </Badge>
                    </TableCell>
                    <TableCell
                      className="max-w-[200px] truncate"
                      title={tx.description || undefined}
                    >
                      {tx.description || "-"}
                    </TableCell>
                    <TableCell>
                      <div className="flex -space-x-2">
                        {tx.witnesses && tx.witnesses.length > 0 ? (
                          tx.witnesses
                            .filter((w) => w !== null)
                            .map((w) => (
                              <div
                                key={w.id}
                                className={`w-6 h-6 rounded-full border-2 border-background flex items-center justify-center text-[10px] text-white ${
                                  w.status === "ACKNOWLEDGED"
                                    ? "bg-green-500"
                                    : w.status === "DECLINED"
                                      ? "bg-red-500"
                                      : "bg-yellow-500"
                                }`}
                                title={`Status: ${w.status}`}
                              >
                                {w.status[0]}
                              </div>
                            ))
                        ) : (
                          <span className="text-xs text-muted-foreground">None</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell
                      className={`text-right font-bold ${
                        tx.type === "GIVEN" || tx.type === "EXPENSE"
                          ? "text-red-600"
                          : "text-green-600"
                      }`}
                    >
                      {tx.type === "GIVEN" || tx.type === "EXPENSE" ? "-" : "+"}
                      {formatCurrency(tx.amount)}
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm" asChild>
                        <Link to="/transactions/$id" params={{ id: tx.id }}>
                          View
                        </Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
