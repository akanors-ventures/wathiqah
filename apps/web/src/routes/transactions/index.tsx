import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { format } from "date-fns";
import {
  ArrowDownLeft,
  ArrowRight,
  ArrowRightLeft,
  ArrowUpRight,
  Download,
  Filter,
  Package,
  Plus,
  Search,
  UserCircle,
} from "lucide-react";
import { useState } from "react";
import { LedgerPhilosophy } from "@/components/dashboard/LedgerPhilosophy";
import { ItemsList } from "@/components/items/ItemsList";
import { TransactionCharts } from "@/components/transactions/TransactionCharts";
import { TransactionTypeHelp } from "@/components/transactions/TransactionTypeHelp";
import { Badge } from "@/components/ui/badge";
import { BalanceIndicator } from "@/components/ui/balance-indicator";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DateRangePicker } from "@/components/ui/date-range-picker";
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
import { SupporterBadge } from "@/components/ui/supporter-badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/use-auth";
import { useItems } from "@/hooks/useItems";
import { useTransactionFilters } from "@/hooks/useTransactionFilters";
import { useTransactions } from "@/hooks/useTransactions";
import { formatCurrency } from "@/lib/utils/formatters";
import { getTransactionTheme } from "@/lib/utils/transactionDisplay";
import { AssetCategory } from "@/types/__generated__/graphql";
import { authGuard } from "@/utils/auth";

function getTypeBadgeClass(type: string): string {
  return getTransactionTheme(type).badgeClass;
}

function getTypeAmountClass(type: string): string {
  return getTransactionTheme(type).textClass;
}

function isPositiveType(type: string): boolean {
  return getTransactionTheme(type).isIncoming;
}

export const Route = createFileRoute("/transactions/")({
  component: TransactionsPage,
  beforeLoad: (ctx) => authGuard({ location: ctx.location }),
  validateSearch: (search: Record<string, unknown>) => ({
    tab: (search.tab as string) || "funds",
  }),
});

function TransactionsPage() {
  const { tab } = Route.useSearch();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState(tab);
  const {
    search,
    setSearch,
    types,
    setTypes,
    status,
    setStatus,
    currency,
    setCurrency,
    dateRange,
    setDateRange,
    page,
    setPage,
    limit,
    setLimit,
    variables,
  } = useTransactionFilters();
  const { transactions, loading, summary, total } = useTransactions(variables.filter);
  const { items, loading: loadingItems, refetch: refetchItems } = useItems();

  const filteredTransactions = transactions;

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
      className="container mx-auto px-4 py-8 space-y-8 overflow-x-hidden"
    >
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
        <div className="flex-1 min-w-0 w-full">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight truncate">
            The Wathīqah Ledger
          </h1>
          <p className="text-muted-foreground text-sm sm:text-base truncate">
            Manage your transaction history.
          </p>
        </div>
        <div className="flex gap-3 w-full lg:w-auto shrink-0 relative z-10">
          <Button
            variant="outline"
            onClick={handleExport}
            className="flex-1 h-12 sm:h-10 lg:flex-none lg:w-auto"
          >
            <Download className="w-4 h-4 mr-2" /> Export
          </Button>
          <Button asChild className="flex-1 h-12 sm:h-10 lg:flex-none lg:w-auto">
            <Link
              to={activeTab === "funds" ? "/transactions/new" : "/items/new"}
              search={{ contactId: undefined }}
            >
              <Plus className="w-4 h-4 mr-2" /> New {activeTab === "funds" ? "Transaction" : "Item"}
            </Link>
          </Button>
        </div>
      </div>

      <LedgerPhilosophy />

      <div className="sticky top-0 z-20 -mx-4 px-4 py-3 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b lg:border-none lg:bg-transparent lg:static lg:p-0 flex justify-center">
        <TabsList className="grid w-full max-w-[500px] grid-cols-3 h-12 p-1.5 bg-muted/50 shadow-sm lg:shadow-none">
          <TabsTrigger value="funds" className="flex items-center gap-2 py-2">
            <ArrowRightLeft className="w-4 h-4" />
            Funds
          </TabsTrigger>
          <TabsTrigger value="items" className="flex items-center gap-2 py-2">
            <Package className="w-4 h-4" />
            Items
          </TabsTrigger>
          <TabsTrigger value="analytics" className="flex items-center gap-2 py-2">
            Analytics
          </TabsTrigger>
        </TabsList>
      </div>

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
                    currency={summary.currency}
                    className="text-2xl px-3 py-1 h-auto"
                  />
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Loan Given</CardTitle>
                  <ArrowUpRight className="h-4 w-4 text-blue-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-blue-600">
                    {formatCurrency(summary.totalLoanGiven, summary.currency)}
                  </div>
                  <p className="text-xs text-muted-foreground">You lent out</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Loan Received</CardTitle>
                  <ArrowDownLeft className="h-4 w-4 text-red-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-red-600">
                    {formatCurrency(summary.totalLoanReceived, summary.currency)}
                  </div>
                  <p className="text-xs text-muted-foreground">You borrowed</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Repayments</CardTitle>
                  <ArrowRightLeft className="h-4 w-4 text-emerald-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-emerald-600">
                    {formatCurrency(
                      (summary.totalRepaymentMade ?? 0) + (summary.totalRepaymentReceived ?? 0),
                      summary.currency,
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">Repayments</p>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Filters */}
          <div className="flex flex-col gap-3 bg-card p-4 rounded-lg border">
            <div className="flex flex-col sm:flex-row gap-3 items-center">
              <div className="relative flex-1 w-full">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by description or contact..."
                  className="pl-8 w-full"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <div className="flex flex-wrap sm:flex-nowrap gap-2 w-full sm:w-auto">
                <Select
                  value={types[0] ?? "ALL"}
                  onValueChange={(v) => setTypes(v === "ALL" ? [] : [v as (typeof types)[number]])}
                >
                  <SelectTrigger className="flex-1 sm:w-[150px]">
                    <Filter className="w-4 h-4 mr-2 text-muted-foreground" />
                    <SelectValue placeholder="Filter Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All Types</SelectItem>
                    <SelectItem value="LOAN_GIVEN">Loan Given</SelectItem>
                    <SelectItem value="LOAN_RECEIVED">Loan Received</SelectItem>
                    <SelectItem value="REPAYMENT_MADE">Repayment Made</SelectItem>
                    <SelectItem value="REPAYMENT_RECEIVED">Repayment Received</SelectItem>
                    <SelectItem value="GIFT_GIVEN">Gift Given</SelectItem>
                    <SelectItem value="GIFT_RECEIVED">Gift Received</SelectItem>
                    <SelectItem value="ADVANCE_PAID">Advance Paid</SelectItem>
                    <SelectItem value="ADVANCE_RECEIVED">Advance Received</SelectItem>
                    <SelectItem value="DEPOSIT_PAID">Deposit Paid</SelectItem>
                    <SelectItem value="DEPOSIT_RECEIVED">Deposit Received</SelectItem>
                    <SelectItem value="ESCROWED">Escrowed</SelectItem>
                    <SelectItem value="REMITTED">Remitted</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={status} onValueChange={(v) => setStatus(v as typeof status)}>
                  <SelectTrigger className="flex-1 sm:w-[150px]">
                    <Package className="w-4 h-4 mr-2 text-muted-foreground" />
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All Status</SelectItem>
                    <SelectItem value="COMPLETED">Completed</SelectItem>
                    <SelectItem value="PENDING">Pending</SelectItem>
                    <SelectItem value="CANCELLED">Cancelled</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={currency} onValueChange={setCurrency}>
                  <SelectTrigger className="flex-1 sm:w-[150px]">
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground font-medium">$</span>
                      <SelectValue placeholder="Currency" />
                    </div>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All Currencies</SelectItem>
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
            <DateRangePicker value={dateRange} onChange={setDateRange} />
          </div>

          {/* Transactions Table */}
          <div className="hidden md:block">
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
                      filteredTransactions.map((tx) => {
                        const isCreator = user?.id === tx.createdBy?.id;
                        return (
                          <TableRow
                            key={tx.id}
                            className="cursor-pointer hover:bg-muted/50 transition-colors group"
                            onClick={() =>
                              navigate({ to: "/transactions/$id", params: { id: tx.id } })
                            }
                          >
                            <TableCell className="font-medium">
                              {format(new Date(tx.date as string), "MMM d, yyyy")}
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-col gap-1">
                                <span className="font-medium text-foreground flex items-center gap-1.5">
                                  {isCreator
                                    ? tx.contact?.name || (
                                        <span className="text-muted-foreground italic">
                                          Personal
                                        </span>
                                      )
                                    : tx.createdBy?.name}
                                  {(isCreator
                                    ? tx.contact?.isSupporter
                                    : tx.createdBy?.isSupporter) && (
                                    <SupporterBadge className="h-4 px-1 text-[9px]" />
                                  )}
                                </span>
                                {!isCreator && (
                                  <span className="flex items-center gap-1 text-[10px] font-bold text-amber-600 bg-amber-50 dark:bg-amber-900/20 px-1.5 py-0.5 rounded border border-amber-100 dark:border-amber-900/30 w-fit">
                                    <UserCircle className="w-2.5 h-2.5" />
                                    SHARED
                                  </span>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className={getTypeBadgeClass(tx.type)}>
                                {tx.type.toLowerCase().replace(/_/g, " ")}
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
                                  : getTypeAmountClass(tx.type)
                              }`}
                            >
                              {tx.category === AssetCategory.Item ? (
                                "Physical Item"
                              ) : (
                                <>
                                  {isPositiveType(tx.type) ? "+" : "-"}
                                  {formatCurrency(tx.amount, tx.currency)}
                                </>
                              )}
                            </TableCell>
                            <TableCell>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-9 w-9 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                <ArrowRight className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>

          <Pagination
            total={total}
            page={page}
            limit={limit}
            onPageChange={setPage}
            onLimitChange={setLimit}
          />

          {/* Mobile Transactions List */}
          <div className="md:hidden space-y-4">
            {loading ? (
              <div className="flex justify-center py-10">
                <BrandLoader size="sm" />
              </div>
            ) : filteredTransactions.length === 0 ? (
              <div className="text-center py-10 text-muted-foreground bg-card rounded-lg border">
                No transactions found matching your criteria.
              </div>
            ) : (
              filteredTransactions.map((tx) => {
                const isCreator = user?.id === tx.createdBy?.id;
                return (
                  <Card
                    key={tx.id}
                    className="active:scale-[0.98] transition-transform cursor-pointer"
                    onClick={() => navigate({ to: "/transactions/$id", params: { id: tx.id } })}
                  >
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start mb-2">
                        <div className="space-y-1">
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(tx.date as string), "MMM d, yyyy")}
                          </p>
                          <div className="flex flex-col gap-1">
                            <p className="font-semibold text-foreground">
                              {isCreator
                                ? tx.contact?.name || <span className="italic">Personal</span>
                                : tx.createdBy?.name}
                            </p>
                            {!isCreator && (
                              <span className="flex items-center gap-1 text-[10px] font-bold text-amber-600 bg-amber-50 dark:bg-amber-900/20 px-1.5 py-0.5 rounded border border-amber-100 dark:border-amber-900/30 w-fit">
                                <UserCircle className="w-2.5 h-2.5" />
                                SHARED
                              </span>
                            )}
                          </div>
                        </div>
                        <Badge variant="outline" className={getTypeBadgeClass(tx.type)}>
                          {tx.type.toLowerCase().replace(/_/g, " ")}
                        </Badge>
                      </div>

                      <div className="flex justify-between items-end mt-4">
                        <div className="flex-1 min-w-0 mr-4">
                          {tx.category === AssetCategory.Item ? (
                            <div className="flex items-center gap-1.5 text-sm font-medium">
                              <Package className="h-3.5 w-3.5 text-muted-foreground" />
                              <span className="truncate">
                                {tx.quantity}x {tx.itemName}
                              </span>
                            </div>
                          ) : (
                            <p className="text-sm text-muted-foreground truncate">
                              {tx.description || "No description"}
                            </p>
                          )}
                        </div>
                        <div
                          className={`font-bold whitespace-nowrap ${
                            tx.category === AssetCategory.Item
                              ? "text-muted-foreground font-normal italic text-xs"
                              : getTypeAmountClass(tx.type)
                          }`}
                        >
                          {tx.category === AssetCategory.Item ? (
                            "Physical Item"
                          ) : (
                            <>
                              {isPositiveType(tx.type) ? "+" : "-"}
                              {formatCurrency(tx.amount, tx.currency)}
                            </>
                          )}
                        </div>
                      </div>

                      {tx.witnesses && tx.witnesses.length > 0 && (
                        <div className="mt-3 pt-3 border-t flex items-center justify-between">
                          <span className="text-xs text-muted-foreground">Witnesses</span>
                          <div className="flex -space-x-1.5">
                            {tx.witnesses
                              .filter((w) => w !== null)
                              .map((w) => (
                                <div
                                  key={w.id}
                                  className={`w-5 h-5 rounded-full border-2 border-background flex items-center justify-center text-[8px] text-white ${
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
                              ))}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>
        </TabsContent>

        <TabsContent value="items">
          <ItemsList items={items} isLoading={loadingItems} onRefresh={refetchItems} />
        </TabsContent>

        <TabsContent value="analytics">
          <TransactionCharts />
        </TabsContent>
      </div>
    </Tabs>
  );
}
