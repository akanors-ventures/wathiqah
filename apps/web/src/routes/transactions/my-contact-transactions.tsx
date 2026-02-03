import { useQuery } from "@apollo/client/react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { format } from "date-fns";
import { Info, Package } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BrandLoader, PageLoader } from "@/components/ui/page-loader";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { GET_MY_CONTACT_TRANSACTIONS } from "@/lib/apollo/queries/transactions";
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
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Transactions Involving Me</h1>
        <p className="text-muted-foreground mt-1">
          View all transactions where you are listed as the contact
        </p>
      </div>

      <div className="rounded-lg border border-blue-100 bg-blue-50 p-4 dark:border-blue-900/30 dark:bg-blue-900/10">
        <div className="flex gap-3">
          <Info className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          <p className="text-sm text-blue-700 dark:text-blue-300">
            These are transactions that others have documented involving you. You can see the
            details including any witnesses who have verified these transactions.
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Transaction History</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {transactions.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <p>No transactions found where you are listed as a contact.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Created By</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-right">Amount/Item</TableHead>
                  <TableHead>Witnesses</TableHead>
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
                ) : (
                  transactions.map((tx) => (
                    <TableRow
                      key={tx.id}
                      className="cursor-pointer hover:bg-muted/50 transition-colors"
                      onClick={() => navigate({ to: "/transactions/$id", params: { id: tx.id } })}
                    >
                      <TableCell className="font-medium">
                        {format(new Date(tx.date as string), "MMM d, yyyy")}
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{tx.createdBy?.name}</div>
                          <div className="text-xs text-muted-foreground">{tx.createdBy?.email}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            tx.type === "GIVEN"
                              ? "destructive"
                              : tx.type === "RECEIVED"
                                ? "default"
                                : "outline"
                          }
                        >
                          {tx.type}
                        </Badge>
                      </TableCell>
                      <TableCell>{tx.category}</TableCell>
                      <TableCell className="max-w-xs truncate">{tx.description || "-"}</TableCell>
                      <TableCell className="text-right">
                        {tx.category === AssetCategory.Funds ? (
                          <span className={tx.type === "GIVEN" ? "text-red-600" : "text-green-600"}>
                            {formatCurrency(tx.amount || 0, tx.currency)}
                          </span>
                        ) : (
                          <div className="flex items-center justify-end gap-1 font-medium text-foreground">
                            <Package size={14} className="text-muted-foreground" />
                            <span>
                              {tx.quantity}x {tx.itemName}
                            </span>
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        {tx.witnesses && tx.witnesses.length > 0 ? (
                          <div className="flex flex-col gap-1">
                            {tx.witnesses.map((witness) => (
                              <div key={witness?.id} className="flex items-center gap-2">
                                <Badge variant="secondary" className="text-[10px] px-1 py-0">
                                  {witness?.status}
                                </Badge>
                                <span className="text-[10px] text-muted-foreground truncate max-w-[80px]">
                                  {witness?.user?.name || witness?.user?.email}
                                </span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground italic">No witnesses</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
