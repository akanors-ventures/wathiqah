import { WitnessStatus } from "@/types/__generated__/graphql";
import { format } from "date-fns";
import { User, Mail, Calendar, Users } from "lucide-react";
import { WitnessStatusBadge } from "../witnesses/WitnessStatusBadge";

interface Witness {
  id: string;
  status: WitnessStatus;
  invitedAt: any;
  acknowledgedAt?: any;
  user: {
    id: string;
    name: string;
    email: string;
  };
}

export function TransactionWitnessList({
  witnesses,
}: {
  witnesses: Witness[];
}) {
  if (witnesses.length === 0) {
    return (
      <div className="text-center py-8 border-2 border-dashed border-neutral-200 dark:border-neutral-800 rounded-xl">
        <Users className="mx-auto h-12 w-12 text-neutral-300 dark:text-neutral-700 mb-3" />
        <h3 className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
          No witnesses added
        </h3>
        <p className="mt-1 text-sm text-neutral-500">
          This transaction hasn't been shared with any witnesses yet.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold flex items-center gap-2">
        <Users size={20} className="text-emerald-600" />
        Witnesses
        <span className="ml-2 text-xs font-normal bg-neutral-100 dark:bg-neutral-800 text-neutral-500 px-2 py-0.5 rounded-full">
          {witnesses.length}
        </span>
      </h3>

      <div className="grid gap-3">
        {witnesses.map((witness) => (
          <div
            key={witness.id}
            className="group flex items-center justify-between p-4 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl hover:border-emerald-200 dark:hover:border-emerald-900/50 transition-all shadow-sm"
          >
            <div className="flex items-center gap-4">
              <div className="h-10 w-10 rounded-full bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center text-neutral-500 group-hover:bg-emerald-50 dark:group-hover:bg-emerald-950/30 group-hover:text-emerald-600 transition-colors">
                <User size={20} />
              </div>
              <div className="flex flex-col">
                <span className="font-medium text-neutral-900 dark:text-neutral-100">
                  {witness.user.name}
                </span>
                <div className="flex items-center gap-3 mt-0.5">
                  <span className="text-xs text-neutral-500 flex items-center gap-1">
                    <Mail size={12} /> {witness.user.email}
                  </span>
                  <span className="text-xs text-neutral-400 flex items-center gap-1">
                    <Calendar size={12} /> Invited{" "}
                    {format(new Date(witness.invitedAt), "MMM d, yyyy")}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex flex-col items-end gap-1.5">
              <WitnessStatusBadge status={witness.status} />
              {witness.acknowledgedAt && (
                <span className="text-[10px] text-neutral-400">
                  Actioned on{" "}
                  {format(new Date(witness.acknowledgedAt), "MMM d")}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
