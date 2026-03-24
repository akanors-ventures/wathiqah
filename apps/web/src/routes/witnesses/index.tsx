import { createFileRoute } from "@tanstack/react-router";
import { Search } from "lucide-react";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { PageLoader } from "@/components/ui/page-loader";
import { PaginationControls } from "@/components/ui/pagination-controls";
import { WitnessList } from "@/components/witnesses/WitnessList";
import { useAcknowledgeWitness, useMyWitnessRequests } from "@/hooks/useWitnesses";
import { authGuard } from "@/utils/auth";

export const Route = createFileRoute("/witnesses/")({
  component: WitnessRequestsPage,
  beforeLoad: (ctx) => authGuard({ location: ctx.location }),
});

function WitnessRequestsPage() {
  const [activeTab, setActiveTab] = useState<"pending" | "history">("pending");
  const [search, setSearch] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [page, setPage] = useState(1);

  const { requests, total, limit, loading, error, refetch } = useMyWitnessRequests({
    search: search || undefined,
    startDate: startDate ? new Date(startDate) : undefined,
    endDate: endDate ? new Date(endDate) : undefined,
    page,
    limit: 25,
  });

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
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by description or contact..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="pl-10"
          />
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs text-muted-foreground whitespace-nowrap">From</label>
          <Input
            type="date"
            value={startDate}
            onChange={(e) => {
              setStartDate(e.target.value);
              setPage(1);
            }}
            className="h-9"
          />
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs text-muted-foreground whitespace-nowrap">To</label>
          <Input
            type="date"
            value={endDate}
            onChange={(e) => {
              setEndDate(e.target.value);
              setPage(1);
            }}
            className="h-9"
          />
        </div>
      </div>

      <WitnessList
        requests={requests}
        activeTab={activeTab}
        onAction={acknowledge}
        isLoading={mutationLoading}
      />
      <PaginationControls page={page} limit={limit} total={total} onPageChange={setPage} />
    </div>
  );
}
