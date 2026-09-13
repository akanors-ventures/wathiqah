import { useState } from "react";
import { toast } from "sonner";
import { useRemoveWitness, useResendWitnessInvitation } from "@/hooks/useWitnesses";

/** Resend/remove witness handlers for the transaction detail page. */
export function useTransactionWitnessActions(refetch: () => void) {
  const [resendingId, setResendingId] = useState<string | null>(null);
  const [removingWitnessId, setRemovingWitnessId] = useState<string | null>(null);

  const { resend } = useResendWitnessInvitation(() => {
    toast.success("Invitation resent successfully");
    setResendingId(null);
  });

  const { remove: removeWitness } = useRemoveWitness(() => {
    toast.success("Witness removed successfully");
    setRemovingWitnessId(null);
    refetch();
  });

  const handleResendWitness = async (witnessId: string) => {
    setResendingId(witnessId);
    try {
      await resend(witnessId);
    } catch (_err) {
      toast.error("Failed to resend invitation");
      setResendingId(null);
    }
  };

  const handleRemoveWitness = async (witnessId: string) => {
    setRemovingWitnessId(witnessId);
    try {
      await removeWitness(witnessId);
    } catch (_err) {
      toast.error("Failed to remove witness");
      setRemovingWitnessId(null);
    }
  };

  return { resendingId, removingWitnessId, handleResendWitness, handleRemoveWitness };
}
