import { useMutation, useQuery } from "@apollo/client/react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { format } from "date-fns";
import {
  ArrowDownLeft,
  ArrowLeft,
  ArrowRightLeft,
  ArrowUpRight,
  Clock,
  Package,
  Plus,
  ShieldCheck,
  UserCircle,
  UserPlus,
} from "lucide-react";
import { TransactionTypeHelp } from "@/components/transactions/TransactionTypeHelp";
import { Badge } from "@/components/ui/badge";
import { BalanceIndicator } from "@/components/ui/balance-indicator";
import { Button } from "@/components/ui/button";
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
import { useAuth } from "@/hooks/use-auth";
import { GET_CONTACT, GET_CONTACTS, INVITE_CONTACT } from "@/lib/apollo/queries/contacts";
import { GET_TRANSACTIONS } from "@/lib/apollo/queries/transactions";
import { formatCurrency } from "@/lib/utils/formatters";
import { AssetCategory } from "@/types/__generated__/graphql";
import { authGuard } from "@/utils/auth";

export const Route = createFileRoute("/contacts/$contactId")({
  component: ContactDetailsPage,
  beforeLoad: (ctx) => authGuard({ location: ctx.location }),
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

  const [inviteContact] = useMutation(INVITE_CONTACT, {
    refetchQueries: [{ query: GET_CONTACT, variables: { id: contactId } }, { query: GET_CONTACTS }],
  });

  const handleInvite = async () => {
    try {
      await inviteContact({ variables: { contactId } });
    } catch (err) {
      console.error("Failed to invite contact:", err);
    }
  };

  const { user } = useAuth();

  if (contactLoading) return <PageLoader />;
  if (contactError)
    return <div className="p-8 text-center text-red-500">Error: {contactError.message}</div>;
  if (!contactData?.contact) return <div className="p-8 text-center">Contact not found</div>;

  const contact = contactData.contact;
  const transactions = txData?.transactions.items || [];
  const summary = txData?.transactions.summary;

  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link to="/contacts">
              <ArrowLeft className="w-4 h-4" />
            </Link>
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold tracking-tight">{contact.name}</h1>
              {contact.isOnPlatform ? (
                <Badge
                  variant="outline"
                  className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 flex items-center gap-1.5 py-1.5 px-4 shadow-sm animate-in fade-in zoom-in duration-300"
                >
                  <ShieldCheck className="w-4 h-4" />
                  <span className="font-bold">Platform Member</span>
                </Badge>
              ) : contact.hasPendingInvitation ? (
                <Badge
                  variant="outline"
                  className="bg-amber-500/10 text-amber-600 border-amber-500/20 flex items-center gap-1.5 py-1.5 px-4 shadow-sm animate-in fade-in zoom-in duration-300"
                >
                  <Clock className="w-4 h-4" />
                  <span className="font-bold">Invitation Sent</span>
                </Badge>
              ) : contact.email ? (
                <Button
                  variant="default"
                  size="sm"
                  onClick={handleInvite}
                  className="h-9 px-4 text-[11px] font-bold uppercase tracking-widest flex items-center gap-2 shadow-md hover:shadow-lg transition-all active:scale-95"
                >
                  <UserPlus className="w-4 h-4" />
                  Invite to Platform
                </Button>
              ) : (
                <Badge
                  variant="outline"
                  className="bg-muted/50 text-muted-foreground border-border/50 flex items-center gap-1.5 py-1.5 px-4 italic opacity-70"
                >
                  Add Email to Invite
                </Badge>
              )}
            </div>
            <div className="text-muted-foreground flex gap-4 text-sm mt-1">
              {contact.email && <span>{contact.email}</span>}
              {contact.phoneNumber && <span>{contact.phoneNumber}</span>}
            </div>
          </div>
        </div>
        <Button asChild>
          <Link to="/transactions/new" search={{ contactId: contact.id }}>
            <Plus className="w-4 h-4 mr-2" />
            Add Transaction
          </Link>
        </Button>
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
              <BalanceIndicator
                amount={summary.netBalance}
                currency="NGN"
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
                {formatCurrency(summary.totalGiven, "NGN")}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Received</CardTitle>
              <ArrowDownLeft className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                {formatCurrency(summary.totalReceived, "NGN")}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Returned</CardTitle>
              <ArrowRightLeft className="h-4 w-4 text-emerald-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-emerald-600">
                {formatCurrency(summary.totalReturned, "NGN")}
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
                transactions.map((tx) => {
                  const isCreator = user?.id === tx.createdBy?.id;
                  return (
                    <TableRow key={tx.id}>
                      <TableCell className="font-medium">
                        {format(new Date(tx.date as string), "MMM d, yyyy")}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1.5">
                          <Badge
                            variant="outline"
                            className={
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
                                        : "text-gray-600 border-gray-200 bg-gray-50"
                            }
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
                          {!isCreator && (
                            <span className="flex items-center gap-1 text-[10px] font-bold text-amber-600 bg-amber-50 dark:bg-amber-900/20 px-1.5 py-0.5 rounded border border-amber-100 dark:border-amber-900/30 w-fit">
                              <UserCircle className="w-2.5 h-2.5" />
                              SHARED
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell
                        className="max-w-[300px] truncate"
                        title={tx.description as string}
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
                      <TableCell
                        className={`text-right font-bold ${
                          tx.category === AssetCategory.Item
                            ? "text-muted-foreground font-normal italic text-xs"
                            : tx.type === "GIVEN"
                              ? "text-blue-600"
                              : tx.type === "RECEIVED" || tx.type === "EXPENSE"
                                ? "text-red-600"
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
                                      : "text-emerald-600"
                        }`}
                      >
                        {tx.category === AssetCategory.Item ? (
                          "Physical Item"
                        ) : (
                          <>
                            {tx.type === "GIVEN" ||
                            (tx.type === "RETURNED" && tx.returnDirection === "TO_ME") ||
                            tx.type === "INCOME" ||
                            (tx.type === "GIFT" && tx.returnDirection === "TO_ME")
                              ? "+"
                              : "-"}
                            {formatCurrency(tx.amount, tx.currency)}
                          </>
                        )}
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm" asChild>
                          <Link to="/transactions/$id" params={{ id: tx.id }}>
                            View
                          </Link>
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
  );
}
