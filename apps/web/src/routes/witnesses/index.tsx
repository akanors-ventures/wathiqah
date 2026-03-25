import { createFileRoute } from "@tanstack/react-router";
import { Search } from "lucide-react";
import { useEffect, useState } from "react";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { Input } from "@/components/ui/input";
import { PageLoader } from "@/components/ui/page-loader";
import { Pagination } from "@/components/ui/pagination";
import { WitnessList } from "@/components/witnesses/WitnessList";
import { useWitnessFilters } from "@/hooks/useWitnessFilters";
import { useAcknowledgeWitness, useMyWitnessRequests } from "@/hooks/useWitnesses";
import { WitnessStatus } from "@/types/__generated__/graphql";
import { authGuard } from "@/utils/auth";

export const Route = createFileRoute("/witnesses/")({
  component: WitnessRequestsPage,
  beforeLoad: (ctx) => authGuard({ location: ctx.location }),
});

function WitnessRequestsPage() {
  const [activeTab, setActiveTab] = useState<"pending" | "history">("pending");
  const {
    search,
    setSearch,
    dateRange,
    setDateRange,
    page,
    setPage,
    limit,
    setLimit,
    variables,
  } = useWitnessFilters();

  // biome-ignore lint/correctness/useExhaustiveDependencies: intentional page reset on tab change
  useEffect(() => {
    setPage(1);
  }, [activeTab]);

  const { requests, total, loading, error, refetch } = useMyWitnessRequests(
    activeTab === "pending" ? WitnessStatus.Pending : undefined,
    variables.filter,
  );

  const { acknowledge, loading: mutationLoading } = useAcknowledgeWitness(() => refetch());

  if (loading) {
    return <PageLoader />;
  }

  if (error) {
    return (
      <div className="p-4 text-center text-destructive">
        Error loading requests: {error.message}
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 max-w-4xl">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Witness Requests</h1>
          <p className="text-muted-foreground mt-1">
            Manage transactions you've been asked to verify.
          </p>
        </div>

        <div className="flex space-x-2 bg-muted p-1 rounded-lg">
          <button
            type="button"
            onClick={() => setActiveTab("pending")}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === "pending"
                ? "bg-background text-primary shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Pending
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("history")}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === "history"
                ? "bg-background text-primary shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            History
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center mb-6">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by description or contact..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <DateRangePicker value={dateRange} onChange={setDateRange} />
      </div>

      <WitnessList
        requests={requests}
        activeTab={activeTab}
        onAction={acknowledge}
        isLoading={mutationLoading}
      />
      <Pagination
        total={total}
        page={page}
        limit={limit}
        onPageChange={setPage}
        onLimitChange={setLimit}
      />
    </div>
  );
}
