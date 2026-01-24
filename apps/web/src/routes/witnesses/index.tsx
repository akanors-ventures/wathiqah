import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import {
  useMyWitnessRequests,
  useAcknowledgeWitness,
} from "@/hooks/useWitnesses";
import { WitnessList } from "@/components/witnesses/WitnessList";

export const Route = createFileRoute("/witnesses/")({
  component: WitnessRequestsPage,
});

function WitnessRequestsPage() {
  const [activeTab, setActiveTab] = useState<"pending" | "history">("pending");

  // Note: We're fetching all and filtering client-side for now to match the UI behavior
  // Ideally, we'd pass the status to the hook based on the tab
  const { requests, loading, error, refetch } = useMyWitnessRequests();

  const { acknowledge, loading: mutationLoading } = useAcknowledgeWitness(() =>
    refetch(),
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <p className="text-muted-foreground">Loading requests...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 text-center text-red-500">
        Error loading requests: {error.message}
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 max-w-4xl">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-neutral-900 dark:text-neutral-50">
            Witness Requests
          </h1>
          <p className="text-neutral-500 dark:text-neutral-400 mt-1">
            Manage transactions you've been asked to verify.
          </p>
        </div>

        <div className="flex space-x-2 bg-neutral-100 dark:bg-neutral-800 p-1 rounded-lg">
          <button
            type="button"
            onClick={() => setActiveTab("pending")}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === "pending"
                ? "bg-white dark:bg-neutral-700 text-emerald-600 dark:text-emerald-400 shadow-sm"
                : "text-neutral-600 dark:text-neutral-400 hover:text-neutral-900"
            }`}
          >
            Pending
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("history")}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === "history"
                ? "bg-white dark:bg-neutral-700 text-emerald-600 dark:text-emerald-400 shadow-sm"
                : "text-neutral-600 dark:text-neutral-400 hover:text-neutral-900"
            }`}
          >
            History
          </button>
        </div>
      </div>

      <WitnessList
        requests={requests}
        activeTab={activeTab}
        onAction={acknowledge}
        isLoading={mutationLoading}
      />
    </div>
  );
}
