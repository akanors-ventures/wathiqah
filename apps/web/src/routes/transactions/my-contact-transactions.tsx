import { useQuery } from "@apollo/client/react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { format } from "date-fns";
import { Info, Package } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageLoader } from "@/components/ui/page-loader";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { GET_MY_CONTACT_TRANSACTIONS } from "@/lib/apollo/queries/transactions";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/utils/formatters";
import { AssetCategory } from "@/types/__generated__/graphql";
import { authGuard } from "@/utils/auth";

export const Route = createFileRoute("/transactions/my-contact-transactions")({
  component: MyContactTransactionsPage,
  beforeLoad: (ctx) => authGuard({ location: ctx.location }),
});

function MyContactTransactionsPage() {
  const navigate = useNavigate();
  const { data, loading, error } = useQuery(GET_MY_CONTACT_TRANSACTIONS);

  if (loading) return <PageLoader />;
  if (error) return <div className="p-8 text-center text-red-500">Error: {error.message}</div>;

  const transactions = data?.myContactTransactions || [];

  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground">
            Transactions Involving Me
          </h1>
          <p className="text-sm text-muted-foreground font-medium opacity-70">
            View all transactions where you are listed as the contact
          </p>
        </div>
      </div>

      <div className="rounded-[24px] border border-blue-100 bg-blue-50/50 p-5 dark:border-blue-900/30 dark:bg-blue-900/10">
        <div className="flex gap-4">
          <div className="p-2.5 rounded-2xl bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 shrink-0">
            <Info className="h-5 w-5" />
          </div>
          <div className="space-y-2">
            <p className="text-sm font-bold text-blue-800 dark:text-blue-300 leading-relaxed">
              These are transactions documented by others involving you.
            </p>
            <p className="text-[11px] font-black text-blue-600/70 dark:text-blue-400/70 italic uppercase tracking-widest">
              Note: Colors and signs (+/-) are shown from your perspective.
            </p>
          </div>
        </div>
      </div>

      <Card className="rounded-[32px] border-border/50 overflow-hidden shadow-sm">
        <CardHeader className="p-6 border-b border-border/30">
          <CardTitle className="text-lg font-black tracking-tight uppercase opacity-60">
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
                      <TableHead className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 h-12 pl-6">
                        Date
                      </TableHead>
                      <TableHead className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 h-12">
                        Created By
                      </TableHead>
                      <TableHead className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 h-12">
                        Type
                      </TableHead>
                      <TableHead className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 h-12">
                        Description
                      </TableHead>
                      <TableHead className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 h-12 text-right">
                        Amount/Item
                      </TableHead>
                      <TableHead className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 h-12 pr-6">
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
                            <div className="font-bold text-sm text-foreground">
                              {tx.createdBy?.name}
                            </div>
                            <div className="text-[10px] text-muted-foreground font-medium truncate max-w-[150px]">
                              {tx.createdBy?.email}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="py-4">
                          <Badge
                            variant="outline"
                            className={cn(
                              "text-[10px] font-bold px-2 py-0.5",
                              tx.type === "GIVEN"
                                ? "text-blue-600 border-blue-200 bg-blue-50"
                                : tx.type === "RECEIVED" || tx.type === "EXPENSE"
                                  ? "text-red-600 border-red-200 bg-red-50"
                                  : tx.type === "RETURNED"
                                    ? tx.returnDirection === "TO_ME"
                                      ? "text-green-600 border-green-200 bg-green-50"
                                      : "text-blue-600 border-blue-200 bg-blue-50"
                                    : tx.type === "INCOME"
                                      ? "text-green-600 border-green-200 bg-green-50"
                                      : tx.type === "GIFT"
                                        ? tx.returnDirection === "TO_ME"
                                          ? "text-purple-600 border-purple-200 bg-purple-50"
                                          : "text-pink-600 border-pink-200 bg-pink-50"
                                        : "text-gray-600 border-gray-200 bg-gray-50",
                            )}
                          >
                            {tx.type === "RETURNED"
                              ? tx.returnDirection === "TO_ME"
                                ? "RETURNED TO ME"
                                : "RETURNED TO CONTACT"
                              : tx.type === "GIFT"
                                ? tx.returnDirection === "TO_ME"
                                  ? "GIFT RECEIVED"
                                  : "GIFT GIVEN"
                                : tx.type}
                          </Badge>
                        </TableCell>
                        <TableCell className="py-4 max-w-[200px]">
                          <div className="text-sm text-muted-foreground truncate font-medium">
                            {tx.description || "-"}
                          </div>
                        </TableCell>
                        <TableCell className="text-right py-4">
                          {tx.category === AssetCategory.Funds ? (
                            <span
                              className={cn(
                                "text-sm font-black",
                                tx.type === "RECEIVED" || tx.type === "EXPENSE"
                                  ? "text-red-600"
                                  : tx.type === "GIVEN"
                                    ? "text-blue-600"
                                    : tx.type === "RETURNED"
                                      ? tx.returnDirection === "TO_ME"
                                        ? "text-green-600"
                                        : "text-blue-600"
                                      : tx.type === "INCOME"
                                        ? "text-green-600"
                                        : tx.type === "GIFT"
                                          ? tx.returnDirection === "TO_ME"
                                            ? "text-purple-600"
                                            : "text-pink-600"
                                          : "text-foreground",
                              )}
                            >
                              {tx.type === "GIVEN" ||
                              (tx.type === "RETURNED" && tx.returnDirection === "TO_ME") ||
                              tx.type === "INCOME" ||
                              (tx.type === "GIFT" && tx.returnDirection === "TO_ME")
                                ? "+"
                                : "-"}
                              {formatCurrency(tx.amount || 0, tx.currency)}
                            </span>
                          ) : (
                            <div className="flex items-center justify-end gap-1.5 font-black text-sm text-foreground">
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
                                    "w-6 h-6 rounded-full border-2 border-background flex items-center justify-center text-[10px] font-black text-white",
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
                            <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/40 italic">
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
                        <Badge
                          variant="outline"
                          className={cn(
                            "text-[10px] font-bold px-2 py-0.5",
                            tx.type === "GIVEN"
                              ? "text-blue-600 border-blue-200 bg-blue-50"
                              : tx.type === "RECEIVED" || tx.type === "EXPENSE"
                                ? "text-red-600 border-red-200 bg-red-50"
                                : tx.type === "RETURNED"
                                  ? tx.returnDirection === "TO_ME"
                                    ? "text-green-600 border-green-200 bg-green-50"
                                    : "text-blue-600 border-blue-200 bg-blue-50"
                                  : tx.type === "INCOME"
                                    ? "text-green-600 border-green-200 bg-green-50"
                                    : tx.type === "GIFT"
                                      ? tx.returnDirection === "TO_ME"
                                        ? "text-purple-600 border-purple-200 bg-purple-50"
                                        : "text-pink-600 border-pink-200 bg-pink-50"
                                      : "text-gray-600 border-gray-200 bg-gray-50",
                          )}
                        >
                          {tx.type === "RETURNED"
                            ? tx.returnDirection === "TO_ME"
                              ? "RETURNED TO ME"
                              : "RETURNED TO CONTACT"
                            : tx.type === "GIFT"
                              ? tx.returnDirection === "TO_ME"
                                ? "GIFT RECEIVED"
                                : "GIFT GIVEN"
                              : tx.type}
                        </Badge>
                      </div>

                      <div className="flex justify-between items-end pt-2 border-t border-border/30">
                        <div className="flex-1 min-w-0 mr-4">
                          <p className="text-xs font-medium text-muted-foreground truncate">
                            {tx.description || "No description"}
                          </p>
                        </div>
                        <div className="shrink-0">
                          {tx.category === AssetCategory.Funds ? (
                            <span
                              className={cn(
                                "text-sm font-black",
                                tx.type === "RECEIVED" || tx.type === "EXPENSE"
                                  ? "text-red-600"
                                  : tx.type === "GIVEN"
                                    ? "text-blue-600"
                                    : tx.type === "RETURNED"
                                      ? tx.returnDirection === "TO_ME"
                                        ? "text-green-600"
                                        : "text-blue-600"
                                      : tx.type === "INCOME"
                                        ? "text-green-600"
                                        : tx.type === "GIFT"
                                          ? tx.returnDirection === "TO_ME"
                                            ? "text-purple-600"
                                            : "text-pink-600"
                                          : "text-foreground",
                              )}
                            >
                              {tx.type === "GIVEN" ||
                              (tx.type === "RETURNED" && tx.returnDirection === "TO_ME") ||
                              tx.type === "INCOME" ||
                              (tx.type === "GIFT" && tx.returnDirection === "TO_ME")
                                ? "+"
                                : "-"}
                              {formatCurrency(tx.amount || 0, tx.currency)}
                            </span>
                          ) : (
                            <div className="flex items-center gap-1.5 font-black text-sm text-foreground">
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
        </CardContent>
      </Card>
    </div>
  );
}
