import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import {
  type MyWitnessRequestsQuery,
  WitnessStatus,
} from "@/types/__generated__/graphql";
import { WitnessStatusBadge } from "./WitnessStatusBadge";

interface WitnessCardProps {
  request: MyWitnessRequestsQuery["myWitnessRequests"][0];
  onAcknowledge: (id: string) => void;
  onDecline: (id: string) => void;
  isLoading?: boolean;
}

export function WitnessCard({
  request,
  onAcknowledge,
  onDecline,
  isLoading,
}: WitnessCardProps) {
  const { transaction, status, invitedAt } = request;

  return (
    <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg p-6 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex flex-col md:flex-row justify-between gap-4">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-lg">
              {transaction.createdBy.name}
            </span>
            <span className="text-neutral-500 text-sm">
              requested your witness
            </span>
          </div>

          <div className="grid grid-cols-2 gap-x-8 gap-y-1 text-sm">
            <span className="text-neutral-500">Amount:</span>
            <span className="font-medium">
              ${transaction.amount?.toFixed(2)}
            </span>

            <span className="text-neutral-500">Date:</span>
            <span>
              {format(new Date(transaction.date as string), "MMM d, yyyy")}
            </span>

            <span className="text-neutral-500">Type:</span>
            <span className="capitalize">{transaction.type.toLowerCase()}</span>
          </div>

          {transaction.description && (
            <div className="mt-2 text-sm text-neutral-600 dark:text-neutral-300 bg-neutral-50 dark:bg-neutral-800 p-2 rounded">
              {transaction.description}
            </div>
          )}
        </div>

        <div className="flex flex-col justify-center items-end gap-2 min-w-[140px]">
          {status === WitnessStatus.Pending ? (
            <>
              <Button
                onClick={() => onAcknowledge(request.id)}
                disabled={isLoading}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
                size="sm"
              >
                Acknowledge
              </Button>
              <Button
                onClick={() => onDecline(request.id)}
                disabled={isLoading}
                variant="outline"
                className="w-full text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/20 border-red-200 dark:border-red-900"
                size="sm"
              >
                Decline
              </Button>
            </>
          ) : (
            <WitnessStatusBadge status={status} />
          )}
          <span className="text-xs text-neutral-400">
            Invited {format(new Date(invitedAt as string), "MMM d")}
          </span>
        </div>
      </div>
    </div>
  );
}
