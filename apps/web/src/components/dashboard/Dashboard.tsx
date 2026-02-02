import { Link, useNavigate } from "@tanstack/react-router";
import { format } from "date-fns";
import {
  ArrowDownLeft,
  ArrowUpRight,
  CalendarClock,
  CreditCard,
  FileCheck,
  Package,
  Users,
} from "lucide-react";
import { BalanceIndicator } from "@/components/ui/balance-indicator";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useContacts } from "@/hooks/useContacts";
import { usePromises } from "@/hooks/usePromises";
import { useTransactions } from "@/hooks/useTransactions";
import { useMyWitnessRequests } from "@/hooks/useWitnesses";
import { formatCurrency } from "@/lib/utils/formatters";
import { AssetCategory } from "@/types/__generated__/graphql";
import { LedgerPhilosophy } from "./LedgerPhilosophy";

export function Dashboard() {
  const navigate = useNavigate();
  const { transactions, loading: loadingTx, summary } = useTransactions();
  const { contacts, loading: loadingContacts } = useContacts();
  const { requests: witnessRequests, loading: loadingWitnesses } = useMyWitnessRequests();
  const { promises, loading: loadingPromises } = usePromises();

  const loading = loadingTx || loadingContacts || loadingWitnesses || loadingPromises;

  // Calculate Stats
  const totalBalance = summary?.netBalance || 0;
  const isDebtByRule = totalBalance < 0;
  const activePromises = promises.filter((p) => p.status === "PENDING").length;
  const pendingWitnessRequests = witnessRequests.length;
  const totalContacts = contacts.length;

  const recentTransactions = transactions.slice(0, 5);

  if (loading) {
    return (
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <DashboardSkeleton />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">
            Your personal ledger for loans, promises, and shared expenses.
          </p>
        </div>
        <div className="flex gap-2">
          <Button asChild>
            <Link to="/transactions/new" search={{ contactId: undefined }}>
              New Transaction
            </Link>
          </Button>
        </div>
      </div>

      {/* Use Case Focused Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="Total Balance"
          value={
            <BalanceIndicator
              amount={totalBalance}
              overrideColor={isDebtByRule ? "red" : "green"}
              className="text-2xl h-auto px-2 py-0 border-0 bg-transparent"
            />
          }
          icon={<CreditCard className="h-4 w-4 text-muted-foreground" />}
          description="Your current cash position"
        />
        <StatsCard
          title="Active Promises"
          value={activePromises.toString()}
          icon={<CalendarClock className="h-4 w-4 text-muted-foreground" />}
          description="Pending commitments to keep"
          link="/promises"
        />
        <StatsCard
          title="Pending Verifications"
          value={pendingWitnessRequests.toString()}
          icon={<FileCheck className="h-4 w-4 text-muted-foreground" />}
          description="Witness requests to review"
          link="/witnesses"
        />
        <StatsCard
          title="Relationships"
          value={totalContacts.toString()}
          icon={<Users className="h-4 w-4 text-muted-foreground" />}
          description="Active connections"
          link="/contacts"
        />
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-7">
        <div className="lg:col-span-4">
          <LedgerPhilosophy />
        </div>

        {/* Quick Actions / Recent Promises */}
        <Card className="lg:col-span-3 h-full">
          <CardHeader>
            <CardTitle>Your Promises</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {promises
                .filter((p) => p.status === "PENDING")
                .slice(0, 5)
                .map((promise) => (
                  <div
                    key={promise.id}
                    className="flex items-start justify-between border-b last:border-0 pb-4 last:pb-0"
                  >
                    <div>
                      <p className="text-sm font-medium">To: {promise.promiseTo}</p>
                      <p className="text-xs text-muted-foreground line-clamp-1">
                        {promise.description}
                      </p>
                    </div>
                    <div className="text-xs text-muted-foreground text-right">
                      {format(new Date(promise.dueDate as string), "MMM d")}
                    </div>
                  </div>
                ))}
              {promises.filter((p) => p.status === "PENDING").length === 0 && (
                <div className="text-center py-8">
                  <p className="text-sm text-muted-foreground mb-4">
                    No pending promises. Good job!
                  </p>
                  <Button variant="outline" size="sm" asChild>
                    <Link to="/promises">Make a Promise</Link>
                  </Button>
                </div>
              )}
              {promises.filter((p) => p.status === "PENDING").length > 0 && (
                <Button variant="outline" className="w-full" asChild>
                  <Link to="/promises">View All Promises</Link>
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity - Full Width at Bottom */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Recent Activity</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Your latest financial interactions across the platform.
            </p>
          </div>
          <Button variant="outline" size="sm" asChild>
            <Link to="/transactions" search={{ tab: "funds" }}>
              View All History
            </Link>
          </Button>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {recentTransactions.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-sm text-muted-foreground mb-4">
                  No transactions yet. Start by recording a loan or expense.
                </p>
                <Button variant="outline" size="sm" asChild>
                  <Link to="/transactions/new" search={{ contactId: undefined }}>
                    Record Transaction
                  </Link>
                </Button>
              </div>
            ) : (
              <div className="grid gap-6">
                {recentTransactions.map((tx) => (
                  <button
                    type="button"
                    key={tx.id}
                    className="w-full text-left flex items-center justify-between p-4 rounded-xl border bg-card/50 hover:bg-card transition-all cursor-pointer active:scale-[0.99] group focus:outline-none focus:ring-2 focus:ring-primary/50"
                    onClick={() => navigate({ to: "/transactions/$id", params: { id: tx.id } })}
                  >
                    <div className="flex items-center gap-4">
                      <div
                        className={`flex h-10 w-10 items-center justify-center rounded-full border ${
                          tx.type === "GIVEN"
                            ? "bg-blue-500/10 border-blue-500/20 text-blue-500"
                            : tx.type === "RETURNED"
                              ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-500"
                              : "bg-red-500/10 border-red-500/20 text-red-500"
                        }`}
                      >
                        {tx.type === "GIVEN" || tx.type === "RETURNED" ? (
                          <ArrowUpRight className="h-5 w-5" />
                        ) : (
                          <ArrowDownLeft className="h-5 w-5" />
                        )}
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-semibold leading-none">{tx.contact?.name}</p>
                          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-muted font-medium uppercase tracking-wider text-muted-foreground">
                            {tx.type}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(tx.date as string), "MMMM d, yyyy")} •{" "}
                          {tx.category === AssetCategory.Item ? (
                            <span className="inline-flex items-center gap-1">
                              <Package className="h-3 w-3" />
                              {tx.quantity}x {tx.itemName}
                            </span>
                          ) : (
                            tx.description || "No description"
                          )}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div
                        className={`text-sm font-bold ${
                          tx.category === AssetCategory.Item
                            ? "text-muted-foreground"
                            : tx.type === "GIVEN"
                              ? "text-blue-500"
                              : tx.type === "RETURNED"
                                ? "text-emerald-500"
                                : "text-red-500"
                        }`}
                      >
                        {tx.category === AssetCategory.Item ? (
                          <span className="text-xs italic font-normal">Physical Item</span>
                        ) : (
                          <>
                            {tx.type === "GIVEN" || tx.type === "RETURNED" ? "+" : "-"}
                            {formatCurrency(tx.amount)}
                          </>
                        )}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function StatsCard({
  title,
  value,
  icon,
  description,
  link,
}: {
  title: string;
  value: string | React.ReactNode;
  icon: React.ReactNode;
  description: string;
  link?: string;
}) {
  const content = (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        <p className="text-xs text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  );

  if (link) {
    return (
      <Link to={link} className="block transition-transform hover:scale-[1.02] active:scale-[0.98]">
        {content}
      </Link>
    );
  }

  return content;
}

function DashboardSkeleton() {
  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div className="space-y-2">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-4 w-64" />
        </div>
        <Skeleton className="h-10 w-32" />
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-4" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-20 mb-1" />
              <Skeleton className="h-3 w-32" />
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-7">
        <Card className="lg:col-span-4 h-64">
          <CardHeader>
            <Skeleton className="h-6 w-32" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-full w-full" />
          </CardContent>
        </Card>
        <Card className="lg:col-span-3 h-64">
          <CardHeader>
            <Skeleton className="h-6 w-32" />
          </CardHeader>
          <CardContent className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex justify-between">
                <div className="space-y-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-48" />
                </div>
                <Skeleton className="h-4 w-12" />
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-32" />
        </CardHeader>
        <CardContent className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center justify-between p-4 border rounded-xl">
              <div className="flex items-center gap-4">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="space-y-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-48" />
                </div>
              </div>
              <Skeleton className="h-6 w-16" />
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
