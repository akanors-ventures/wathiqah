import { createFileRoute, Link } from "@tanstack/react-router";
import { format } from "date-fns";
import {
  ArrowDownLeft,
  ArrowRightLeft,
  ArrowUpRight,
  Download,
  Filter,
  Package,
  Plus,
  Search,
} from "lucide-react";
import { useState } from "react";
import { LedgerPhilosophy } from "@/components/dashboard/LedgerPhilosophy";
import { ItemsList } from "@/components/items/ItemsList";
import { TransactionTypeHelp } from "@/components/transactions/TransactionTypeHelp";
import { Badge } from "@/components/ui/badge";
import { BalanceIndicator } from "@/components/ui/balance-indicator";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { BrandLoader } from "@/components/ui/page-loader";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useItems } from "@/hooks/useItems";
import { useTransactions } from "@/hooks/useTransactions";
import { formatCurrency } from "@/lib/utils/formatters";
import { AssetCategory } from "@/types/__generated__/graphql";
import { authGuard } from "@/utils/auth";

export const Route = createFileRoute("/transactions/")({
  component: TransactionsPage,
  beforeLoad: (ctx) => authGuard({ location: ctx.location }),
  validateSearch: (search: Record<string, unknown>) => ({
    tab: (search.tab as string) || "funds",
  }),
});

function TransactionsPage() {
  const { tab } = Route.useSearch();
  const [activeTab, setActiveTab] = useState(tab);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("ALL");
  const { transactions, loading, summary } = useTransactions();
  const { items, loading: loadingItems, refetch: refetchItems } = useItems();

  const filteredTransactions = transactions.filter((tx) => {
    const matchesSearch =
      (tx.description?.toLowerCase() || "").includes(search.toLowerCase()) ||
      (tx.contact?.name?.toLowerCase() || "").includes(search.toLowerCase());
    const matchesType = typeFilter === "ALL" || tx.type === typeFilter;
    return matchesSearch && matchesType;
  });

  const handleExport = () => {
    // Simple CSV export implementation
    if (activeTab === "funds") {
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
    } else {
      const headers = ["Last Updated", "Item Name", "Quantity", "Contact", "Status"];
      const csvContent = [
        headers.join(","),
        ...items.map((item) =>
          [
            format(new Date(item.lastUpdated), "yyyy-MM-dd"),
            `"${item.itemName}"`,
            item.quantity,
            item.contactName || "Unknown",
            item.status,
          ].join(","),
        ),
      ].join("\n");

      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = `items_export_${format(new Date(), "yyyyMMdd")}.csv`;
      link.click();
    }
  };

  return (
    <Tabs
      value={activeTab}
      onValueChange={setActiveTab}
      className="container mx-auto py-8 space-y-8"
    >
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
        <div className="flex-1 min-w-0 w-full">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight truncate">
            The Wathȋqah Ledger
          </h1>
          <p className="text-muted-foreground text-sm sm:text-base truncate">
            Manage your funds and physical items history.
          </p>
        </div>
        <div className="flex flex-col md:flex-row gap-4 w-full lg:w-auto shrink-0 relative z-10">
          <TabsList className="grid w-full grid-cols-2 md:w-[300px] h-12 p-1.5">
            <TabsTrigger value="funds" className="flex items-center gap-2 py-2">
              <ArrowRightLeft className="w-4 h-4" />
              Funds
            </TabsTrigger>
            <TabsTrigger value="items" className="flex items-center gap-2 py-2">
              <Package className="w-4 h-4" />
              Items
            </TabsTrigger>
          </TabsList>

          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={handleExport}
              className="flex-1 sm:flex-none h-12 sm:h-10"
            >
              <Download className="w-4 h-4 mr-2" /> Export
            </Button>
            <Button asChild className="flex-1 sm:flex-none h-12 sm:h-10">
              <Link
                to={activeTab === "funds" ? "/transactions/new" : "/items/new"}
                search={{ contactId: undefined }}
              >
                <Plus className="w-4 h-4 mr-2" /> New{" "}
                {activeTab === "funds" ? "Transaction" : "Item"}
              </Link>
            </Button>
          </div>
        </div>
      </div>

      <LedgerPhilosophy />

      <div className="space-y-4">
        <TabsContent value="funds" className="space-y-4">
          {/* Summary Cards */}
          {summary && (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Net Balance</CardTitle>
                  <div className="h-4 w-4 text-muted-foreground">💰</div>
                </CardHeader>
                <CardContent>
                  <BalanceIndicator
                    amount={summary.netBalance}
                    className="text-2xl px-3 py-1 h-auto"
                  />
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Given</CardTitle>
                  <ArrowUpRight className="h-4 w-4 text-blue-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-blue-600">
                    {formatCurrency(summary.totalGiven)}
                  </div>
                  <p className="text-xs text-muted-foreground">You lent out</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Received</CardTitle>
                  <ArrowDownLeft className="h-4 w-4 text-red-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-red-600">
                    {formatCurrency(summary.totalReceived)}
                  </div>
                  <p className="text-xs text-muted-foreground">You borrowed</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Returned</CardTitle>
                  <ArrowRightLeft className="h-4 w-4 text-green-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">
                    {formatCurrency(summary.totalReturned)}
                  </div>
                  <p className="text-xs text-muted-foreground">Repayments</p>
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
                <SelectItem value="GIVEN">Given (Lent)</SelectItem>
                <SelectItem value="RECEIVED">Received (Borrowed)</SelectItem>
                <SelectItem value="RETURNED">Returned</SelectItem>
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
                    <TableHead className="text-right">Amount / Item</TableHead>
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
                              tx.type === "GIVEN"
                                ? "text-blue-600 border-blue-200 bg-blue-50"
                                : tx.type === "RECEIVED"
                                  ? "text-red-600 border-red-200 bg-red-50"
                                  : (tx.type as string) === "RETURNED" ||
                                      (tx.type as string) === "COLLECTED"
                                    ? "text-green-600 border-green-200 bg-green-50"
                                    : "text-gray-600 border-gray-200 bg-gray-50"
                            }
                          >
                            {tx.type}
                          </Badge>
                        </TableCell>
                        <TableCell
                          className="max-w-[200px] truncate"
                          title={tx.description || undefined}
                        >
                          {tx.category === AssetCategory.Item ? (
                            <div className="flex items-center gap-1.5 font-medium text-foreground">
                              <Package className="h-4 w-4 text-muted-foreground" />
                              <span>
                                {tx.quantity}x {tx.itemName}
                              </span>
                            </div>
                          ) : (
                            tx.description || "-"
                          )}
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
                            tx.category === AssetCategory.Item
                              ? "text-muted-foreground font-normal italic text-xs"
                              : tx.type === "GIVEN"
                                ? "text-blue-600"
                                : tx.type === "RECEIVED"
                                  ? "text-red-600"
                                  : "text-green-600"
                          }`}
                        >
                          {tx.category === AssetCategory.Item ? (
                            "Physical Item"
                          ) : (
                            <>
                              {tx.type === "GIVEN" ? "+" : tx.type === "RECEIVED" ? "-" : "+"}
                              {formatCurrency(tx.amount)}
                            </>
                          )}
                        </TableCell>
                        <TableCell>
                          <Button variant="ghost" size="sm" asChild className="h-9 px-3">
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
        </TabsContent>

        <TabsContent value="items">
          <ItemsList items={items} isLoading={loadingItems} onRefresh={refetchItems} />
        </TabsContent>
      </div>
    </Tabs>
  );
}
