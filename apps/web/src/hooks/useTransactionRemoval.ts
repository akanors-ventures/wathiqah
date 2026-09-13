import type { useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { useTransactions } from "@/hooks/useTransactions";

/** Removes the transaction detail page's own transaction and navigates home. */
export function useTransactionRemoval(id: string, navigate: ReturnType<typeof useNavigate>) {
  const [isRemoveDialogOpen, setIsRemoveDialogOpen] = useState(false);
  const { removeTransaction, removing } = useTransactions();

  const handleRemove = async () => {
    try {
      await removeTransaction(id);
      toast.success("Transaction removed successfully");
      setIsRemoveDialogOpen(false);
      navigate({ to: "/" });
    } catch (err) {
      toast.error("Failed to remove transaction");
      console.error(err);
    }
  };

  return { isRemoveDialogOpen, setIsRemoveDialogOpen, removing, handleRemove };
}
