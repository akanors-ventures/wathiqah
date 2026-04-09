import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { format } from "date-fns";
import { Filter, Info, Package, Search } from "lucide-react";
import { TransactionAmount } from "@/components/transactions/TransactionAmount";
import { TransactionTypeBadge } from "@/components/transactions/TransactionTypeBadge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { Input } from "@/components/ui/input";
import { PageLoader } from "@/components/ui/page-loader";
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
import { useMyContactTransactions } from "@/hooks/useMyContactTransactions";
import { useSharedHistoryFilters } from "@/hooks/useSharedHistoryFilters";
import { cn } from "@/lib/utils";
import { AssetCategory } from "@/types/__generated__/graphql";
import { authGuard } from "@/utils/auth";

export const Route = createFileRoute("/transactions/my-contact-transactions")({
  component: MyContactTransactionsPage,
  beforeLoad: (ctx) => authGuard({ location: ctx.location }),
});

function MyContactTransactionsPage() {
  const navigate = useNavigate();
  const {
    search,
    setSearch,
    types,
    setTypes,
    dateRange,
    setDateRange,
    page,
    setPage,
    limit,
    setLimit,
    variables,
  } = useSharedHistoryFilters();

  const { transactions, total, loading, error } = useMyContactTransactions(variables.filter);

  if (loading) return <PageLoader />;
  if (error) return <div className="p-8 text-center text-red-500">Error: {error.message}</div>;

  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            Shared History
          </h1>
          <p className="text-sm text-muted-foreground font-medium opacity-70">
            View records where you are listed as the contact
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by description or contact..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select
          value={types[0] ?? "ALL"}
          onValueChange={(v) => setTypes(v === "ALL" ? [] : [v as (typeof types)[number]])}
        >
          <SelectTrigger className="sm:w-[160px]">
            <Filter className="w-4 h-4 mr-2 text-muted-foreground" />
            <SelectValue placeholder="Type" />
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
        <DateRangePicker value={dateRange} onChange={setDateRange} />
      </div>

      <div className="rounded-[24px] border border-blue-100 bg-blue-50/50 p-4 sm:p-5 dark:border-blue-900/30 dark:bg-blue-900/10">
        <div className="flex gap-3 sm:gap-4 items-start sm:items-center">
          <div className="p-2 sm:p-2.5 rounded-2xl bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 shrink-0">
            <Info className="h-4 w-4 sm:h-5 sm:w-5" />
          </div>
          <div className="space-y-1.5 sm:space-y-2">
            <p className="text-xs sm:text-sm font-bold text-blue-800 dark:text-blue-300 leading-relaxed">
              These are records documented by others involving you.
            </p>
            <p className="text-[10px] sm:text-[11px] font-bold text-blue-600/70 dark:text-blue-400/70 italic uppercase tracking-wider">
              Note: Colors and signs (+/-) are shown from your perspective.
            </p>
          </div>
        </div>
      </div>

      <Card className="rounded-[32px] border-border/50 overflow-hidden shadow-sm">
        <CardHeader className="p-4 sm:p-6 border-b border-border/30">
          <CardTitle className="text-base sm:text-lg font-bold tracking-tight uppercase opacity-60">
            Transaction History
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {transactions.length === 0 ? (
            <div className="text-center py-20 text-muted-foreground">
              <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4 opacity-20">
                <Package className="w-8 h-8" />
              </div>
              <p className="font-bold text-sm">
                No transactions found where you are listed as a contact.
              </p>
            </div>
          ) : (
            <>
              {/* Desktop Table */}
              <div className="hidden md:block">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/30 border-b border-border/30">
                      <TableHead className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60 h-12 pl-6">
                        Date
                      </TableHead>
                      <TableHead className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60 h-12">
                        Created By
                      </TableHead>
                      <TableHead className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60 h-12">
                        Type
                      </TableHead>
                      <TableHead className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60 h-12">
                        Description
                      </TableHead>
                      <TableHead className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60 h-12 text-right">
                        Amount/Item
                      </TableHead>
                      <TableHead className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60 h-12 pr-6">
                        Witnesses
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {transactions.map((tx) => (
                      <TableRow
                        key={tx.id}
                        className="cursor-pointer hover:bg-muted/30 transition-colors border-b border-border/20"
                        onClick={() => navigate({ to: "/transactions/$id", params: { id: tx.id } })}
                      >
                        <TableCell className="font-bold text-sm pl-6 py-4">
                          {format(new Date(tx.date as string), "MMM d, yyyy")}
                        </TableCell>
                        <TableCell className="py-4">
                          <div className="space-y-0.5">
                            <div className="font-bold text-sm text-foreground flex items-center gap-1.5">
                              {tx.createdBy?.name}
                              {tx.createdBy?.isSupporter && (
                                <SupporterBadge className="h-4 px-1 text-[9px]" />
                              )}
                            </div>
                            <div className="text-[10px] text-muted-foreground font-medium truncate max-w-[150px]">
                              {tx.createdBy?.email}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="py-4">
                          <TransactionTypeBadge type={tx.type} />
                        </TableCell>
                        <TableCell className="py-4 max-w-[200px]">
                          <div className="text-sm text-muted-foreground truncate font-medium">
                            {tx.description || "-"}
                          </div>
                        </TableCell>
                        <TableCell className="text-right py-4">
                          {tx.category === AssetCategory.Funds ? (
                            <TransactionAmount
                              type={tx.type}
                              amount={tx.amount}
                              currency={tx.currency}
                              className="text-sm"
                            />
                          ) : (
                            <div className="flex items-center justify-end gap-1.5 font-bold text-sm text-foreground">
                              <Package size={14} className="text-muted-foreground opacity-50" />
                              <span>
                                {tx.quantity}x {tx.itemName}
                              </span>
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="pr-6 py-4">
                          {tx.witnesses && tx.witnesses.length > 0 ? (
                            <div className="flex -space-x-1.5">
                              {tx.witnesses.map((witness) => (
                                <div
                                  key={witness?.id}
                                  className={cn(
                                    "w-6 h-6 rounded-full border-2 border-background flex items-center justify-center text-[10px] font-bold text-white",
                                    witness?.status === "ACKNOWLEDGED"
                                      ? "bg-green-500"
                                      : witness?.status === "DECLINED"
                                        ? "bg-red-500"
                                        : "bg-amber-500",
                                  )}
                                  title={`${witness?.user?.name || witness?.user?.email}: ${witness?.status}`}
                                >
                                  {(witness?.user?.name ||
                                    witness?.user?.email)?.[0]?.toUpperCase()}
                                </div>
                              ))}
                            </div>
                          ) : (
                            <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/40 italic">
                              None
                            </span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Mobile Card Stack */}
              <div className="md:hidden space-y-4 p-4">
                {transactions.map((tx) => (
                  <Card
                    key={tx.id}
                    className="overflow-hidden border-border/50 hover:border-primary/30 transition-all active:scale-[0.98]"
                    onClick={() => navigate({ to: "/transactions/$id", params: { id: tx.id } })}
                  >
                    <div className="p-4 space-y-4">
                      <div className="flex justify-between items-start">
                        <div className="space-y-1">
                          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                            {format(new Date(tx.date as string), "MMM d, yyyy")}
                          </p>
                          <div className="font-bold text-sm text-foreground">
                            {tx.createdBy?.name}
                          </div>
                          <div className="text-[10px] text-muted-foreground">
                            {tx.createdBy?.email}
                          </div>
                        </div>
                        <TransactionTypeBadge type={tx.type} />
                      </div>

                      <div className="flex justify-between items-end pt-2 border-t border-border/30">
                        <div className="flex-1 min-w-0 mr-4">
                          <p className="text-xs font-medium text-muted-foreground truncate">
                            {tx.description || "No description"}
                          </p>
                        </div>
                        <div className="shrink-0">
                          {tx.category === AssetCategory.Funds ? (
                            <TransactionAmount
                              type={tx.type}
                              amount={tx.amount}
                              currency={tx.currency}
                              className="text-sm"
                            />
                          ) : (
                            <div className="flex items-center gap-1.5 font-bold text-sm text-foreground">
                              <Package size={14} className="text-muted-foreground opacity-50" />
                              <span>
                                {tx.quantity}x {tx.itemName}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </>
          )}
          <Pagination
            total={total}
            page={page}
            limit={limit}
            onPageChange={setPage}
            onLimitChange={setLimit}
          />
        </CardContent>
      </Card>
    </div>
  );
}
