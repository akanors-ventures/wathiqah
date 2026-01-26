import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@apollo/client/react";
import { GET_CONTACT } from "@/lib/apollo/queries/contacts";
import { GET_TRANSACTIONS } from "@/lib/apollo/queries/transactions";
import { authGuard } from "@/utils/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, ArrowUpRight, ArrowDownLeft, ArrowRightLeft } from "lucide-react";
import { formatCurrency } from "@/lib/utils/formatters";
import { format } from "date-fns";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { PageLoader, BrandLoader } from "@/components/ui/page-loader";
import { TransactionTypeHelp } from "@/components/transactions/TransactionTypeHelp";

export const Route = createFileRoute("/contacts/$contactId")({
  component: ContactDetailsPage,
  beforeLoad: authGuard,
});

function ContactDetailsPage() {
  const { contactId } = Route.useParams();

  const {
    data: contactData,
    loading: contactLoading,
    error: contactError,
  } = useQuery(GET_CONTACT, {
    variables: { id: contactId },
  });

  const { data: txData, loading: txLoading } = useQuery(GET_TRANSACTIONS, {
    variables: { filter: { contactId } },
  });

  if (contactLoading) return <PageLoader />;
  if (contactError)
    return <div className="p-8 text-center text-red-500">Error: {contactError.message}</div>;
  if (!contactData?.contact) return <div className="p-8 text-center">Contact not found</div>;

  const contact = contactData.contact;
  const transactions = txData?.transactions.items || [];
  const summary = txData?.transactions.summary;

  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link to="/contacts">
            <ArrowLeft className="w-4 h-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{contact.name}</h1>
          <div className="text-muted-foreground flex gap-4 text-sm mt-1">
            {contact.email && <span>{contact.email}</span>}
            {contact.phoneNumber && <span>{contact.phoneNumber}</span>}
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Net Balance with Contact</CardTitle>
              <div className="h-4 w-4 text-muted-foreground">💰</div>
            </CardHeader>
            <CardContent>
              <div
                className={`text-2xl font-bold ${summary.netBalance >= 0 ? "text-green-600" : "text-red-600"}`}
              >
                {formatCurrency(summary.netBalance)}
              </div>
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

      {/* Transactions Table */}
      <Card>
        <CardHeader>
          <CardTitle>Transaction History</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>
                  <div className="flex items-center gap-1">
                    Type
                    <TransactionTypeHelp />
                  </div>
                </TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {txLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-10">
                    <div className="flex justify-center">
                      <BrandLoader size="sm" />
                    </div>
                  </TableCell>
                </TableRow>
              ) : transactions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-10 text-muted-foreground">
                    No transactions found with this contact.
                  </TableCell>
                </TableRow>
              ) : (
                transactions.map((tx) => (
                  <TableRow key={tx.id}>
                    <TableCell className="font-medium">
                      {format(new Date(tx.date as string), "MMM d, yyyy")}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={
                          tx.type === "GIVEN"
                            ? "text-red-600 border-red-200 bg-red-50"
                            : tx.type === "RECEIVED"
                              ? "text-green-600 border-green-200 bg-green-50"
                              : "text-blue-600 border-blue-200 bg-blue-50"
                        }
                      >
                        {tx.type}
                      </Badge>
                    </TableCell>
                    <TableCell className="max-w-[300px] truncate" title={tx.description as string}>
                      {tx.description || "-"}
                    </TableCell>
                    <TableCell
                      className={`text-right font-bold ${
                        tx.type === "GIVEN" ? "text-red-600" : "text-green-600"
                      }`}
                    >
                      {tx.type === "GIVEN" ? "-" : "+"}
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
