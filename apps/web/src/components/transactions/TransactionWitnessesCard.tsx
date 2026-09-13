import { UserPlus } from "lucide-react";
import { TransactionWitnessList } from "@/components/transactions/TransactionWitnessList";
import { Button } from "@/components/ui/button";
import type { Witness } from "@/types/__generated__/graphql";

interface TransactionWitnessesCardProps {
  witnesses: Witness[];
  onAddWitness: () => void;
  resendingId: string | null;
  removingWitnessId: string | null;
  onResend: (witnessId: string) => void;
  onRemove: (witnessId: string) => void;
}

export function TransactionWitnessesCard({
  witnesses,
  onAddWitness,
  resendingId,
  removingWitnessId,
  onResend,
  onRemove,
}: TransactionWitnessesCardProps) {
  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-6 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <UserPlus size={20} className="text-emerald-600" />
          Witnesses
        </h3>
        <Button variant="outline" size="sm" onClick={onAddWitness}>
          Add Witness
        </Button>
      </div>
      <TransactionWitnessList
        witnesses={witnesses}
        onResend={onResend}
        onRemove={onRemove}
        isResendingId={resendingId}
        isRemovingId={removingWitnessId}
      />
    </div>
  );
}
