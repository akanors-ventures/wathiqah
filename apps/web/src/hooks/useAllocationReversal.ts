import { useState } from "react";
import { toast } from "sonner";
import { useAllocations } from "@/hooks/useAllocations";

/** Reverses a single allocation from the transaction detail page. */
export function useAllocationReversal() {
  const [reversingId, setReversingId] = useState<string | null>(null);
  const { reverseAllocation } = useAllocations();

  const handleReverse = async (allocationId: string) => {
    setReversingId(allocationId);
    try {
      // reverseAllocation's mutation already lists "Transaction" (this
      // page's GET_TRANSACTION) in its refetchQueries — an explicit
      // refetch() here would just double-fetch the same query.
      await reverseAllocation(allocationId);
      toast.success("Allocation reversed");
    } catch (err) {
      console.error(err);
      toast.error("Failed to reverse allocation");
    } finally {
      setReversingId(null);
    }
  };

  return { reversingId, handleReverse };
}
