import { type MyWitnessRequestsQuery, WitnessStatus } from "@/types/__generated__/graphql";
import { WitnessCard } from "./WitnessCard";

interface WitnessListProps {
  requests: MyWitnessRequestsQuery["myWitnessRequests"];
  activeTab: "pending" | "history";
  onAction: (id: string, status: WitnessStatus) => void;
  isLoading?: boolean;
}

export function WitnessList({ requests, activeTab, onAction, isLoading }: WitnessListProps) {
  // Client-side filtering logic from the original implementation
  const filteredRequests =
    activeTab === "pending"
      ? requests.filter(
          (r) => r.status === WitnessStatus.Pending || r.status === WitnessStatus.Modified,
        )
      : requests.filter(
          (r) => r.status !== WitnessStatus.Pending && r.status !== WitnessStatus.Modified,
        );

  if (filteredRequests.length === 0) {
    return (
      <div className="text-center py-16 bg-muted/5 rounded-3xl border-2 border-dashed border-border/50 group">
        <div className="w-16 h-16 bg-muted/20 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 group-hover:bg-primary/5 transition-all duration-500">
          <p className="text-2xl opacity-40 group-hover:opacity-100 transition-opacity">
            {activeTab === "pending" ? "🔔" : "📜"}
          </p>
        </div>
        <h3 className="text-base font-black text-foreground uppercase tracking-widest">
          No {activeTab} requests
        </h3>
        <p className="mt-2 text-[11px] text-muted-foreground font-medium max-w-[240px] mx-auto leading-relaxed">
          {activeTab === "pending"
            ? "You don't have any witness requests waiting for your verification at the moment."
            : "Your history of witness verification requests will appear here once actioned."}
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
