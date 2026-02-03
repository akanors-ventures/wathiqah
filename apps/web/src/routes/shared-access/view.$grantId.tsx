import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Calendar, Eye, Lock, Package, User } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useSharedData } from "@/hooks/useSharedData";
import { formatCurrency, formatDate } from "@/lib/utils/formatters";
import { AssetCategory } from "@/types/__generated__/graphql";

export const Route = createFileRoute("/shared-access/view/$grantId")({
  component: SharedAccessView,
});

function SharedAccessView() {
  const { grantId } = Route.useParams();
  const { data, loading, error } = useSharedData(grantId);

  if (loading) return <PageLoader />;
  if (error)
    return (
      <div className="p-8 text-center">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-destructive/10 text-destructive mb-4">
          <Lock className="w-6 h-6" />
        </div>
        <h2 className="text-xl font-bold mb-2">Access Denied</h2>
        <p className="text-muted-foreground mb-6">
          {error.message || "You do not have permission to view this profile."}
        </p>
        <Button asChild>
          <Link to="/settings">Return to Settings</Link>
        </Button>
      </div>
    );

  if (!data) return <div className="p-8">No data found.</div>;

  const { user, transactions, promises } = data;

  return (
    <div className="container mx-auto py-8 space-y-8 max-w-6xl">
      {/* Header Bar */}
      <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 rounded-lg p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3 text-amber-800 dark:text-amber-200">
          <div className="p-2 bg-amber-100 dark:bg-amber-900/50 rounded-full">
            <Eye className="w-5 h-5" />
          </div>
          <div>
            <h1 className="font-semibold text-lg">Read-Only View</h1>
            <p className="text-sm opacity-90">
              You are viewing{" "}
              <span className="font-bold">
                {user?.firstName} {user?.lastName}
              </span>
              's shared data.
            </p>
          </div>
        </div>
        <Button variant="outline" size="sm" asChild className="whitespace-nowrap bg-background">
          <Link to="/settings">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to My Profile
          </Link>
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-[300px_1fr]">
        {/* Sidebar / Profile Card */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <User className="w-5 h-5" />
                Profile Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <div className="text-xs font-semibold uppercase text-muted-foreground tracking-wider">
                  Full Name
                </div>
                <div className="text-lg font-medium mt-1">
                  {user?.firstName} {user?.lastName}
                </div>
              </div>

              <div>
                <div className="text-xs font-semibold uppercase text-muted-foreground tracking-wider">
                  Email
                </div>
                <div className="text-base mt-1 break-all">{user?.email}</div>
              </div>

              <div className="pt-4 border-t">
                <p className="text-xs text-muted-foreground">
                  This information is shared with you securely. You cannot edit or modify any of
                  these records.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <div className="space-y-6">
          <Tabs defaultValue="transactions" className="w-full">
            <TabsList className="w-full justify-start border-b rounded-none h-auto p-0 bg-transparent space-x-6">
              <TabsTrigger
                value="transactions"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-3"
              >
                Transactions
                <Badge variant="secondary" className="ml-2">
                  {transactions?.length}
                </Badge>
              </TabsTrigger>
              <TabsTrigger
                value="promises"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-3"
              >
                Promises
                <Badge variant="secondary" className="ml-2">
                  {promises?.length}
                </Badge>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="transactions" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle>Transaction History</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Contact</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {transactions?.length === 0 ? (
                        <TableRow>
                          <TableCell
                            colSpan={5}
                            className="text-center py-12 text-muted-foreground"
                          >
                            No transactions shared.
                          </TableCell>
                        </TableRow>
                      ) : (
                        transactions?.map((tx) => (
                          <TableRow key={tx.id}>
                            <TableCell>{formatDate(tx.date as string)}</TableCell>
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
                            <TableCell>{tx.contact?.name || "-"}</TableCell>
                            <TableCell
                              className="max-w-[200px] truncate"
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
                                    ? "text-red-600"
                                    : "text-green-600"
                              }`}
                            >
                              {tx.category === AssetCategory.Item ? (
                                "Physical Item"
                              ) : (
                                <>
                                  {tx.type === "GIVEN" ? "-" : "+"}
                                  {formatCurrency(tx.amount, tx.currency)}
                                </>
                              )}
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="promises" className="mt-6">
              <div className="grid gap-4 md:grid-cols-2">
                {promises?.map((p) => (
                  <Card key={p.id} className="border-l-4 border-l-primary">
                    <CardContent className="pt-6">
                      <div className="flex justify-between items-start mb-2">
                        <div className="space-y-1">
                          <span className="text-xs font-semibold text-muted-foreground uppercase">
                            Promise To
                          </span>
                          <h3 className="font-semibold text-lg">{p.promiseTo}</h3>
                        </div>
                        <Badge
                          variant={p.status === "PENDING" ? "outline" : "secondary"}
                          className={
                            p.status === "PENDING"
                              ? "bg-yellow-50 text-yellow-700 border-yellow-200"
                              : ""
                          }
                        >
                          {p.status}
                        </Badge>
                      </div>
                      <p className="text-sm text-foreground/80 mb-4 line-clamp-2 bg-muted/30 p-2 rounded">
                        "{p.description}"
                      </p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground mt-4 pt-4 border-t">
                        <Calendar className="w-3.5 h-3.5" />
                        <span>Due: {formatDate(p.dueDate as string)}</span>
                        <span className="mx-1">•</span>
                        <span className="capitalize">{p.priority.toLowerCase()} Priority</span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
                {promises?.length === 0 && (
                  <div className="col-span-full text-center py-12 text-muted-foreground bg-muted/30 rounded-lg border border-dashed">
                    No promises shared.
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
