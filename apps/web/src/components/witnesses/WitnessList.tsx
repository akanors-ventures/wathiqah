import { WitnessCard } from "./WitnessCard";
import {
  type MyWitnessRequestsQuery,
  WitnessStatus,
} from "@/types/__generated__/graphql";

interface WitnessListProps {
  requests: MyWitnessRequestsQuery["myWitnessRequests"];
  activeTab: "pending" | "history";
  onAction: (id: string, status: WitnessStatus) => void;
  isLoading?: boolean;
}

export function WitnessList({
  requests,
  activeTab,
  onAction,
  isLoading,
}: WitnessListProps) {
  // Client-side filtering logic from the original implementation
  const filteredRequests =
    activeTab === "pending"
      ? requests.filter((r) => r.status === WitnessStatus.Pending)
      : requests.filter((r) => r.status !== WitnessStatus.Pending);

  if (filteredRequests.length === 0) {
    return (
      <div className="text-center py-12 bg-neutral-50 dark:bg-neutral-900 rounded-lg border border-neutral-200 dark:border-neutral-800">
        <p className="text-neutral-500">
          No {activeTab} witness requests found.
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-4">
      {filteredRequests.map((request) => (
        <WitnessCard
          key={request.id}
          request={request}
          onAcknowledge={(id) => onAction(id, WitnessStatus.Acknowledged)}
          onDecline={(id) => onAction(id, WitnessStatus.Declined)}
          isLoading={isLoading}
        />
      ))}
    </div>
  );
}
