import { useMutation, useQuery } from "@apollo/client/react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { format } from "date-fns";
import {
  ArrowDownLeft,
  ArrowLeft,
  ArrowRightLeft,
  ArrowUpRight,
  ChevronRight,
  Clock,
  Download,
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
import { SupporterBadge } from "@/components/ui/supporter-badge";
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
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/utils/formatters";
import { AssetCategory, type Transaction } from "@/types/__generated__/graphql";
import { authGuard } from "@/utils/auth";

export const Route = createFileRoute("/contacts/$contactId")({
  component: ContactDetailsPage,
  beforeLoad: (ctx) => authGuard({ location: ctx.location }),
});

function ContactDetailsPage() {
  const navigate = useNavigate();
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
  const transactions = (txData?.transactions.items as Transaction[]) || [];
  const summary = txData?.transactions.summary;

  const exportToCSV = (items: Transaction[], contactName: string) => {
    const headers = ["Date", "Type", "Description", "Amount", "Currency", "Category"];
    const csvData = items.map((tx) => [
      format(new Date(tx.date), "yyyy-MM-dd"),
      tx.type,
      tx.description ||
        (tx.category === AssetCategory.Item ? `${tx.quantity}x ${tx.itemName}` : "-"),
      tx.amount,
      tx.currency || "NGN",
      tx.category,
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...csvData.map((row) => row.join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `transactions_${contactName.replace(/\s+/g, "_")}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

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
              {contact.isSupporter && <SupporterBadge />}
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
      <Card className="rounded-[32px] border-border/50 overflow-hidden shadow-sm">
        <CardHeader className="p-6 border-b border-border/30">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-black tracking-tight uppercase opacity-60">
              Transaction History
            </CardTitle>
            {transactions.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="h-8 text-[10px] font-bold uppercase tracking-wider"
                onClick={() => exportToCSV(transactions, contact.name)}
              >
                <Download className="mr-2 h-3.5 w-3.5" />
                CSV
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {txLoading ? (
            <div className="flex justify-center py-20">
              <BrandLoader size="sm" />
            </div>
          ) : transactions.length === 0 ? (
            <div className="text-center py-20 text-muted-foreground">
              <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4 opacity-20">
                <Package className="w-8 h-8" />
              </div>
              <p className="font-bold text-sm">No transactions found with this contact.</p>
            </div>
          ) : (
            <>
              {/* Desktop View */}
              <div className="hidden md:block">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/30 border-b border-border/30">
                      <TableHead className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 h-12 pl-6">
                        Date
                      </TableHead>
                      <TableHead className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 h-12">
                        <div className="flex items-center gap-1">
                          Type
                          <TransactionTypeHelp />
                        </div>
                      </TableHead>
                      <TableHead className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 h-12">
                        Description
                      </TableHead>
                      <TableHead className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 h-12 text-right">
                        Amount
                      </TableHead>
                      <TableHead className="w-10"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {transactions.map((tx) => {
                      const isCreator = user?.id === tx.createdBy?.id;
                      return (
                        <TableRow
                          key={tx.id}
                          className="group hover:bg-muted/50 transition-colors cursor-pointer border-b border-border/30 last:border-0"
                          onClick={() =>
                            navigate({
                              to: "/transactions/$id",
                              params: { id: tx.id },
                            })
                          }
                        >
                          <TableCell className="pl-6 font-medium text-xs text-muted-foreground/80">
                            {format(new Date(tx.date as string), "MMM d, yyyy")}
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col gap-1.5">
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
                              {!isCreator && (
                                <span className="flex items-center gap-1 text-[10px] font-bold text-amber-600 bg-amber-50 dark:bg-amber-900/20 px-1.5 py-0.5 rounded border border-amber-100 dark:border-amber-900/30 w-fit">
                                  <UserCircle className="w-2.5 h-2.5" />
                                  SHARED
                                </span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="max-w-[200px] truncate text-xs text-muted-foreground/90">
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
                            className={cn(
                              "text-right font-bold text-sm",
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
                                          : "text-emerald-600",
                            )}
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
                                {formatCurrency(tx.amount, tx.currency || "NGN")}
                              </>
                            )}
                          </TableCell>
                          <TableCell className="pr-6">
                            <ChevronRight className="h-4 w-4 text-muted-foreground/30 group-hover:text-primary/50 transition-colors" />
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>

              {/* Mobile View */}
              <div className="md:hidden space-y-3 p-4">
                {transactions.map((tx) => {
                  const isCreator = user?.id === tx.createdBy?.id;
                  return (
                    <Card
                      key={tx.id}
                      className="overflow-hidden border-border/50 hover:border-primary/30 transition-all active:scale-[0.98]"
                      onClick={() =>
                        navigate({
                          to: "/transactions/$id",
                          params: { id: tx.id },
                        })
                      }
                    >
                      <div className="p-4 space-y-3">
                        <div className="flex justify-between items-start">
                          <div className="space-y-1">
                            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                              {format(new Date(tx.date as string), "MMM d, yyyy")}
                            </p>
                            <div className="flex flex-col gap-1">
                              <Badge
                                variant="outline"
                                className={cn(
                                  "text-[10px] font-bold px-2 py-0.5 w-fit",
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
                              {!isCreator && (
                                <span className="flex items-center gap-1 text-[9px] font-bold text-amber-600 bg-amber-50 dark:bg-amber-900/20 px-1.5 py-0.5 rounded border border-amber-100 dark:border-amber-900/30 w-fit">
                                  <UserCircle className="w-2 h-2" />
                                  SHARED
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="text-right">
                            {tx.category === AssetCategory.Item ? (
                              <div className="text-[10px] font-medium text-muted-foreground italic">
                                Physical Item
                              </div>
                            ) : (
                              <div
                                className={cn(
                                  "font-bold text-sm",
                                  tx.type === "GIVEN"
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
                                            : "text-emerald-600",
                                )}
                              >
                                {tx.type === "GIVEN" ||
                                (tx.type === "RETURNED" && tx.returnDirection === "TO_ME") ||
                                tx.type === "INCOME" ||
                                (tx.type === "GIFT" && tx.returnDirection === "TO_ME")
                                  ? "+"
                                  : "-"}
                                {formatCurrency(tx.amount, tx.currency || "NGN")}
                              </div>
                            )}
                          </div>
                        </div>
                        {(tx.description || tx.category === AssetCategory.Item) && (
                          <div className="text-xs text-muted-foreground/90 line-clamp-1 border-t border-border/30 pt-2">
                            {tx.category === AssetCategory.Item ? (
                              <div className="flex items-center gap-1.5">
                                <Package className="h-3 w-3" />
                                <span>
                                  {tx.quantity}x {tx.itemName}
                                </span>
                              </div>
                            ) : (
                              tx.description
                            )}
                          </div>
                        )}
                      </div>
                    </Card>
                  );
                })}
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
