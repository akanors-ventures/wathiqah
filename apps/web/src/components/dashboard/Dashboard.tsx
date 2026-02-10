import { Link } from "@tanstack/react-router";
import { format } from "date-fns";
import { CalendarClock, CreditCard, FileCheck, Users } from "lucide-react";
import { useEffect, useState } from "react";
import { PromiseStatus, WitnessStatus } from "@/types/__generated__/graphql";
import { TransactionCard } from "@/components/transactions/TransactionCard";
import { BalanceIndicator } from "@/components/ui/balance-indicator";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/use-auth";
import { useBalance } from "@/hooks/useBalance";
import { useContacts } from "@/hooks/useContacts";
import { usePromises } from "@/hooks/usePromises";
import { useTransactions } from "@/hooks/useTransactions";
import { useMyWitnessRequests } from "@/hooks/useWitnesses";
import { LedgerPhilosophy } from "./LedgerPhilosophy";
import { StatsCard } from "./StatsCard";

export function Dashboard() {
  const { user } = useAuth();
  const [selectedCurrency, setSelectedCurrency] = useState<string | undefined>();

  useEffect(() => {
    if (user?.preferredCurrency) {
      setSelectedCurrency(user.preferredCurrency);
    }
  }, [user?.preferredCurrency]);

  const { transactions, loading: loadingTx } = useTransactions();
  const { contacts, loading: loadingContacts } = useContacts();
  const { balance, loading: loadingBalance } = useBalance(selectedCurrency);
  const { requests: witnessRequests, loading: loadingWitnesses } = useMyWitnessRequests();
  const { promises, loading: loadingPromises } = usePromises();

  const loading =
    loadingTx || loadingContacts || loadingWitnesses || loadingPromises || loadingBalance;

  // Calculate Stats
  const totalBalance = balance?.netBalance || 0;
  const balanceCurrency = balance?.currency || "NGN";
  const isDebtByRule = totalBalance < 0;
  const activePromises = promises.filter((p) => p.status === PromiseStatus.Pending).length;
  const pendingWitnessRequests = witnessRequests.filter(
    (r) => r.status === WitnessStatus.Pending || r.status === WitnessStatus.Modified,
  ).length;
  const totalContacts = contacts.length;
  const currencies = ["NGN", "USD", "EUR", "GBP", "CAD", "AED", "SAR"];

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
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
        <div className="space-y-1 w-full sm:w-auto text-center sm:text-left">
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground capitalize">
            Dashboard
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground font-medium capitalize tracking-tight opacity-70">
            Personal ledger for loans, promises, and shared expenses
          </p>
        </div>
        <div className="flex w-full sm:w-auto gap-3">
          <Button
            asChild
            className="w-full sm:w-auto h-11 sm:h-12 px-6 sm:px-8 rounded-md font-bold shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
          >
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
          extra={
            <Select
              value={selectedCurrency || balanceCurrency}
              onValueChange={(v) => setSelectedCurrency(v)}
            >
              <SelectTrigger className="h-7 w-[80px] text-[10px] font-medium border-none bg-muted/50 hover:bg-muted transition-colors focus:ring-0">
                <SelectValue placeholder="NGN" />
              </SelectTrigger>
              <SelectContent>
                {currencies.map((c) => (
                  <SelectItem key={c} value={c} className="text-xs">
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          }
          value={
            <BalanceIndicator
              amount={totalBalance}
              currency={balanceCurrency}
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
        <Card className="lg:col-span-3 h-full rounded-[20px] sm:rounded-[24px] border-border/50 overflow-hidden group/promises transition-all duration-500 hover:shadow-[0_20px_50px_rgba(0,0,0,0.05)]">
          <CardHeader className="pb-3 sm:pb-4 p-4 sm:p-5">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm sm:text-base font-bold capitalize tracking-tight text-muted-foreground group-hover/promises:text-primary transition-colors">
                Your promises
              </CardTitle>
              <div className="p-1.5 sm:p-2 rounded-lg sm:rounded-xl bg-primary/5 text-primary group-hover/promises:bg-primary group-hover/promises:text-primary-foreground transition-all duration-500 shadow-sm group-hover/promises:-rotate-3">
                <CalendarClock className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-4 sm:p-5 pt-0">
            <div className="space-y-2.5 sm:space-y-3">
              {promises
                .filter((p) => p.status === "PENDING")
                .slice(0, 5)
                .map((promise) => (
                  <div
                    key={promise.id}
                    className="flex items-start justify-between p-3 sm:p-4 rounded-xl sm:rounded-2xl bg-muted/20 border border-transparent hover:border-primary/20 hover:bg-background/50 transition-all duration-500 group/promise relative overflow-hidden"
                  >
                    <div className="min-w-0 flex-1 pr-3 sm:pr-4 relative z-10">
                      <p className="text-[9px] sm:text-[10px] font-bold text-muted-foreground capitalize tracking-tight mb-0.5 opacity-60">
                        To: {promise.promiseTo}
                      </p>
                      <p className="text-xs sm:text-sm font-bold text-foreground truncate group-hover/promise:text-primary transition-colors tracking-tight">
                        {promise.description}
                      </p>
                    </div>
                    <div className="text-[9px] sm:text-[10px] font-bold capitalize tracking-tight text-primary bg-primary/5 px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-md sm:rounded-lg border border-primary/10 shadow-sm relative z-10">
                      {format(new Date(promise.dueDate as string), "MMM d")}
                    </div>
                    {/* Hover decorative element */}
                    <div className="absolute right-0 top-0 w-1/2 h-full bg-gradient-to-l from-primary/[0.02] to-transparent translate-x-full group-hover/promise:translate-x-0 transition-transform duration-700" />
                  </div>
                ))}
              {promises.filter((p) => p.status === "PENDING").length === 0 && (
                <div className="text-center py-12">
                  <div className="w-16 h-16 bg-primary/5 rounded-full flex items-center justify-center mx-auto mb-4 group-hover/promises:scale-110 transition-transform duration-700">
                    <CalendarClock className="w-8 h-8 text-primary/30" />
                  </div>
                  <p className="text-[11px] font-bold text-muted-foreground capitalize tracking-tight mb-4 opacity-60">
                    No pending promises. Good job!
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    asChild
                    className="rounded-md font-bold capitalize tracking-tight text-[11px] h-9 px-6 border-primary/20 hover:bg-primary hover:text-primary-foreground transition-all"
                  >
                    <Link to="/promises">Make a Promise</Link>
                  </Button>
                </div>
              )}
              {promises.filter((p) => p.status === "PENDING").length > 0 && (
                <Button
                  variant="outline"
                  className="w-full rounded-xl font-bold capitalize tracking-tight text-[11px] h-10 mt-2 border-primary/20 hover:bg-primary hover:text-primary-foreground transition-all shadow-sm"
                  asChild
                >
                  <Link to="/promises">View all promises</Link>
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity - Full Width at Bottom */}
      <Card className="rounded-[24px] border-border/50 overflow-hidden transition-all duration-500 hover:shadow-[0_20px_50px_rgba(0,0,0,0.05)]">
        <CardHeader className="flex flex-row items-center justify-between pb-4 sm:pb-6 p-4 sm:p-6">
          <div>
            <CardTitle className="text-lg sm:text-xl font-bold tracking-tight capitalize">
              Recent activity
            </CardTitle>
            <p className="text-[10px] sm:text-xs text-muted-foreground font-medium mt-1">
              Your latest financial interactions across the platform.
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            asChild
            className="rounded-md font-bold capitalize tracking-tight text-[10px] sm:text-[11px] h-8 sm:h-9 px-4 sm:px-5 border-primary/20 hover:bg-primary hover:text-primary-foreground transition-all"
          >
            <Link to="/transactions" search={{ tab: "funds" }}>
              View all history
            </Link>
          </Button>
        </CardHeader>
        <CardContent className="p-4 sm:p-6 pt-0">
          <div className="space-y-4 sm:space-y-6">
            {recentTransactions.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-primary/5 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CreditCard className="w-8 h-8 text-primary/40" />
                </div>
                <p className="text-xs font-bold text-muted-foreground mb-4 capitalize">
                  No transactions yet. Start by recording a loan or expense.
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  asChild
                  className="rounded-md font-bold capitalize tracking-tight text-[11px] h-9 px-5 border-primary/20 hover:bg-primary hover:text-primary-foreground transition-all"
                >
                  <Link to="/transactions/new" search={{ contactId: undefined }}>
                    Record transaction
                  </Link>
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6 lg:gap-8">
                {recentTransactions.map((tx) => (
                  <TransactionCard key={tx.id} transaction={tx} />
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
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
