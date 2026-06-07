import { useQuery } from "@apollo/client/react";
import { Link } from "@tanstack/react-router";
import { endOfMonth, endOfYear, format, startOfMonth, startOfYear } from "date-fns";
import {
  CalendarClock,
  CalendarDays,
  CreditCard,
  FileCheck,
  Plus,
  UserPlus,
  Users,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
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
import { useOrgContext } from "@/context/OrgContext";
import { useAuth } from "@/hooks/use-auth";
import { useBalance } from "@/hooks/useBalance";
import { useContacts } from "@/hooks/useContacts";
import { usePersonalEntrySummary } from "@/hooks/usePersonalEntries";
import { usePromises } from "@/hooks/usePromises";
import { useTransactions } from "@/hooks/useTransactions";
import { useMyWitnessRequests } from "@/hooks/useWitnesses";
import { ORG_UPCOMING_EVENTS_QUERY } from "@/lib/apollo/queries/organisations";
import { OrgRole, PromiseStatus, WitnessStatus } from "@/types/__generated__/graphql";
import { OrgHero } from "../org/org-hero";
import { OrgStatsRow } from "../org/org-stats-row";
import { OnboardingChecklist } from "./OnboardingChecklist";
import { ProjectsWidget } from "./ProjectsWidget";
import { StatsCard } from "./StatsCard";

type Period = "ALL" | "MONTH" | "YEAR";

export function Dashboard() {
  const { user } = useAuth();
  const { activeOrg, isOrgMode } = useOrgContext();
  const [selectedCurrency, setSelectedCurrency] = useState<string | undefined>();
  const [period, setPeriod] = useState<Period>("MONTH");

  useEffect(() => {
    if (user?.preferredCurrency) {
      setSelectedCurrency(user.preferredCurrency);
    }
  }, [user?.preferredCurrency]);

  const dateFilter = useMemo(() => {
    const now = new Date();
    if (period === "MONTH") {
      return {
        startDate: startOfMonth(now).toISOString(),
        endDate: endOfMonth(now).toISOString(),
      };
    }
    if (period === "YEAR") {
      return {
        startDate: startOfYear(now).toISOString(),
        endDate: endOfYear(now).toISOString(),
      };
    }
    return undefined;
  }, [period]);

  const { transactions, loading: loadingTx } = useTransactions({ limit: 6, ...(dateFilter ?? {}) });
  const { contacts, loading: loadingContacts } = useContacts();

  // 1. Total Balance (Always All Time)
  const { balance: totalBalanceData, loading: loadingTotalBalance } = useBalance(selectedCurrency);

  // 2. Period Stats (Inflow/Outflow)
  const { balance: periodBalanceData, loading: loadingPeriodBalance } = useBalance(
    selectedCurrency,
    dateFilter,
  );

  const { requests: witnessRequests, loading: loadingWitnesses } = useMyWitnessRequests();
  const { promises, loading: loadingPromises } = usePromises();
  const { summary: cashSummary, loading: loadingCashSummary } = usePersonalEntrySummary();

  // Org-specific data
  const isAdmin =
    isOrgMode && activeOrg
      ? activeOrg.members.find((m) => m.userId === user?.id)?.role === OrgRole.Admin
      : false;

  const { data: eventsData } = useQuery(ORG_UPCOMING_EVENTS_QUERY, {
    skip: !activeOrg,
  });
  const upcomingEvents = eventsData?.orgUpcomingEvents ?? [];

  const quickActions =
    isOrgMode && activeOrg
      ? [
          {
            icon: Plus,
            label: "Record transaction",
            sub: "Log a sale, payment or loan",
            href: "/transactions/new",
            search: { contactId: undefined } as never,
          },
          {
            icon: CalendarDays,
            label: "Add event",
            sub: "Vaccination, Eid, breeding",
            href: `/org/${activeOrg.slug}/events`,
            search: undefined,
          },
          {
            icon: UserPlus,
            label: "Add contact",
            sub: "Buyer, vet, partner",
            href: "/contacts/new",
            search: undefined,
          },
          {
            icon: Users,
            label: "Invite member",
            sub: "Add staff or operator",
            href: `/org/${activeOrg.slug}/members`,
            search: undefined,
          },
        ]
      : [];

  const loading =
    loadingTx ||
    loadingContacts ||
    loadingWitnesses ||
    loadingPromises ||
    loadingTotalBalance ||
    loadingPeriodBalance ||
    loadingCashSummary;

  // Calculate Stats
  const totalBalance = totalBalanceData?.netBalance || 0;

  // Use period data for Inflow/Outflow
  const periodIncome =
    (periodBalanceData?.totalLoanReceived || 0) +
    (periodBalanceData?.totalRepaymentReceived || 0) +
    (periodBalanceData?.totalGiftReceived || 0) +
    (periodBalanceData?.totalAdvanceReceived || 0) +
    (periodBalanceData?.totalDepositReceived || 0) +
    (periodBalanceData?.totalEscrowed || 0);

  const periodExpense =
    (periodBalanceData?.totalLoanGiven || 0) +
    (periodBalanceData?.totalRepaymentMade || 0) +
    (periodBalanceData?.totalGiftGiven || 0) +
    (periodBalanceData?.totalAdvancePaid || 0) +
    (periodBalanceData?.totalDepositPaid || 0) +
    (periodBalanceData?.totalRemitted || 0);

  const balanceCurrency = totalBalanceData?.currency || "NGN";
  const isDebtByRule = totalBalance < 0;
  const activePromises = promises.filter((p) => p.status === PromiseStatus.Pending).length;
  const pendingWitnessRequests = witnessRequests.filter(
    (r) => r.status === WitnessStatus.Pending || r.status === WitnessStatus.Modified,
  ).length;
  const totalContacts = contacts.length;
  const currencies = ["NGN", "USD", "EUR", "GBP", "CAD", "AED", "SAR"];

  const recentTransactions = transactions;

  const getPeriodLabel = () => {
    if (period === "MONTH") return "This Month";
    if (period === "YEAR") return "This Year";
    return "All Time";
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <DashboardSkeleton />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Org Hero — only in org mode, replaces the page title section */}
      {isOrgMode && activeOrg && (
        <>
          <OrgHero org={activeOrg} isAdmin={isAdmin} />
          <OrgStatsRow
            transactionCount={activeOrg.transactionCount}
            contactCount={activeOrg.contactCount}
            upcomingEventCount={upcomingEvents.length}
            activeProjectCount={activeOrg.activeProjectCount}
          />
        </>
      )}

      {/* Header — title in personal mode; period selector + mobile button always */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
        {!isOrgMode && (
          <div className="space-y-1 w-full sm:w-auto text-center sm:text-left">
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground capitalize">
              Dashboard
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground font-medium capitalize tracking-tight opacity-70">
              Personal ledger for loans, promises, and shared expenses
            </p>
          </div>
        )}
        {/* sm:ml-auto pushes this group to the right whether or not the title is present */}
        <div className="flex gap-3 w-full sm:w-auto items-center sm:ml-auto">
          <Select value={period} onValueChange={(v) => setPeriod(v as Period)}>
            <SelectTrigger className="flex-1 sm:w-[120px] h-11 sm:h-12 bg-background border-input shadow-sm">
              <div className="flex items-center gap-2">
                <CalendarDays className="h-4 w-4 text-muted-foreground" />
                <SelectValue />
              </div>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="MONTH">This Month</SelectItem>
              <SelectItem value="YEAR">This Year</SelectItem>
              <SelectItem value="ALL">All Time</SelectItem>
            </SelectContent>
          </Select>

          {/* Personal mode: always show; Org mode: mobile only (OrgHero has it on desktop) */}
          <Button
            asChild
            className={
              isOrgMode
                ? "flex-1 sm:flex-none sm:w-auto h-11 sm:h-12 px-6 sm:px-8 rounded-md font-bold shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all md:hidden"
                : "flex-1 sm:flex-none sm:w-auto h-11 sm:h-12 px-6 sm:px-8 rounded-md font-bold shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
            }
          >
            <Link to="/transactions/new" search={{ contactId: undefined }}>
              New Transaction
            </Link>
          </Button>
        </div>
      </div>

      {/* Financial Stats
          Layout: 2-col on mobile/tablet, 4-col on lg+
          Total Balance + Cash Position each span full width below lg so they
          never leave an orphaned card — Inflow/Outflow always sit side-by-side. */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        {/* Total Balance — full width below lg */}
        <div className="col-span-2 lg:col-span-1">
          <StatsCard
            title="Total Balance"
            variant="primary"
            extra={
              <Select
                value={selectedCurrency || balanceCurrency}
                onValueChange={(v) => setSelectedCurrency(v)}
              >
                <SelectTrigger className="h-7 w-[70px] text-[10px] font-medium border-none bg-muted/50 hover:bg-muted transition-colors focus:ring-0 flex-shrink-0">
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
                className="text-xl sm:text-2xl h-auto px-2 py-0 border-0 bg-transparent"
              />
            }
            icon={<CreditCard className="h-4 w-4 text-muted-foreground" />}
            description="Net amount owed to / by your contacts (All Time)"
          />
        </div>

        {/* Cash Position — full width below lg */}
        <div className="col-span-2 lg:col-span-1">
          <StatsCard
            title="Cash Position"
            value={
              <BalanceIndicator
                amount={cashSummary?.netCashPosition ?? 0}
                currency={balanceCurrency}
                overrideColor={(cashSummary?.netCashPosition ?? 0) < 0 ? "red" : "green"}
                className="text-base sm:text-xl h-auto px-2 py-0 border-0 bg-transparent"
              />
            }
            icon={<CreditCard className="h-4 w-4 text-muted-foreground" />}
            description="Personal income minus expenses (All Time)"
          />
        </div>

        {/* Inflow + Outflow — always side-by-side (1 col each) */}
        <StatsCard
          title={`Inflow (${getPeriodLabel()})`}
          value={
            <BalanceIndicator
              amount={periodIncome}
              currency={balanceCurrency}
              overrideColor="green"
              className="text-base sm:text-xl h-auto px-2 py-0 border-0 bg-transparent"
            />
          }
          icon={<CreditCard className="h-4 w-4 text-muted-foreground" />}
          description="Earnings & received funds"
        />
        <StatsCard
          title={`Outflow (${getPeriodLabel()})`}
          value={
            <BalanceIndicator
              amount={periodExpense}
              currency={balanceCurrency}
              overrideColor="red"
              className="text-base sm:text-xl h-auto px-2 py-0 border-0 bg-transparent"
            />
          }
          icon={<CreditCard className="h-4 w-4 text-muted-foreground" />}
          description="Spending & given funds"
        />
      </div>

      {/* Activity Stats */}
      <div className="grid gap-3 grid-cols-3">
        <StatsCard
          compact
          title="Promises"
          value={activePromises.toString()}
          icon={<CalendarClock className="h-4 w-4 text-muted-foreground" />}
          description="Pending commitments"
          link="/promises"
        />
        <StatsCard
          compact
          title="Witnesses"
          value={pendingWitnessRequests.toString()}
          icon={<FileCheck className="h-4 w-4 text-muted-foreground" />}
          description="Pending requests"
          link="/witnesses"
        />
        <StatsCard
          compact
          title="Contacts"
          value={totalContacts.toString()}
          icon={<Users className="h-4 w-4 text-muted-foreground" />}
          description="Active connections"
          link="/contacts"
        />
      </div>

      {/* Org Quick Actions — only in org mode */}
      {isOrgMode && activeOrg && quickActions.length > 0 && (
        <div>
          <h2 className="text-[11px] font-black uppercase tracking-widest text-muted-foreground mb-3">
            Quick actions
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {quickActions.map(({ icon: Icon, label, sub, href, search }) => (
              <Link
                key={label}
                to={href as never}
                search={search as never}
                className="flex flex-col gap-1 p-4 rounded-xl border border-border bg-card hover:border-primary/30 hover:bg-primary/5 transition-all duration-150"
              >
                <Icon className="h-5 w-5 text-muted-foreground mb-1" />
                <span className="text-[13px] font-semibold">{label}</span>
                <span className="text-[11px] text-muted-foreground">{sub}</span>
              </Link>
            ))}
          </div>
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-7">
        <div className="lg:col-span-4">
          <ProjectsWidget />
        </div>

        {/* Quick Actions / Recent Promises */}
        <Card className="lg:col-span-3 h-full rounded-[32px] border-border/50 overflow-hidden group/promises transition-all duration-500 hover:shadow-[0_20px_50px_rgba(0,0,0,0.05)]">
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
      <Card className="rounded-[32px] border-border/50 overflow-hidden transition-all duration-500 hover:shadow-[0_20px_50px_rgba(0,0,0,0.05)]">
        <CardHeader className="flex flex-row items-start justify-between gap-4 pb-4 sm:pb-6 p-4 sm:p-6">
          <div className="min-w-0">
            <CardTitle className="text-lg font-black tracking-tight uppercase opacity-60">
              Recent activity
            </CardTitle>
            <p className="text-[10px] sm:text-xs text-muted-foreground font-medium mt-1">
              Your latest financial interactions.
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            asChild
            className="shrink-0 rounded-md font-bold capitalize tracking-tight text-[10px] sm:text-[11px] h-8 sm:h-9 px-4 sm:px-5 border-primary/20 hover:bg-primary hover:text-primary-foreground transition-all"
          >
            <Link to="/transactions" search={{ tab: "funds" }}>
              View all
            </Link>
          </Button>
        </CardHeader>
        <CardContent className="p-4 sm:p-6 pt-0">
          <div className="space-y-4 sm:space-y-6">
            {recentTransactions.length === 0 ? (
              <div className="p-4 sm:p-6">
                <OnboardingChecklist
                  hasContacts={totalContacts > 0}
                  hasTransactions={false}
                  hasInvitedWitness={false}
                />
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

      {/* Upcoming Events — only in org mode */}
      {isOrgMode && activeOrg && upcomingEvents.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-[11px] font-black uppercase tracking-widest text-muted-foreground">
              Upcoming events
            </h2>
            <Button asChild variant="ghost" size="sm" className="text-xs">
              <Link to={`/org/${activeOrg.slug}/events` as never}>View all →</Link>
            </Button>
          </div>
          <div className="space-y-2">
            {upcomingEvents.slice(0, 3).map((event) => (
              <div
                key={event.id}
                className="flex items-center gap-3 p-3 rounded-lg border border-border bg-card"
              >
                <div className="flex-shrink-0 w-10 text-center">
                  <p className="text-[9px] font-bold uppercase text-muted-foreground">
                    {new Date(event.date).toLocaleDateString("en-NG", { month: "short" })}
                  </p>
                  <p className="text-lg font-black leading-tight">
                    {new Date(event.date).getDate()}
                  </p>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-semibold truncate">{event.title}</p>
                  <p className="text-[11px] text-muted-foreground">{event.category}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
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
