import { useMutation } from "@apollo/client/react";
import {
  ALLOCATE_TRANSACTIONS,
  REVERSE_TRANSACTION_ALLOCATION,
} from "@/lib/apollo/queries/transactions";
import type { AllocateTransactionsInput } from "@/types/__generated__/graphql";

/**
 * `Contacts` / `Contact` are in the refetch list for a reason the other
 * transaction hooks do not need: a cross-contact allocation moves a *second*
 * contact's standing (Ade's credit settling Musa's loan changes both), and no
 * existing refetch list covers that.
 */
const ALLOCATION_REFETCH = [
  "TotalBalance",
  "Transactions",
  "Transaction",
  "MyContactTransactions",
  "Contacts",
  "Contact",
];

const evictAllocationFields = (cache: {
  evict: (options: { fieldName: string }) => void;
  gc: () => void;
}) => {
  cache.evict({ fieldName: "transactions" });
  cache.evict({ fieldName: "totalBalance" });
  cache.evict({ fieldName: "contacts" });
  cache.gc();
};

export function useAllocations() {
  const [allocateMutation, { loading: allocating }] = useMutation(ALLOCATE_TRANSACTIONS, {
    refetchQueries: ALLOCATION_REFETCH,
    update: evictAllocationFields,
  });

  const [reverseMutation, { loading: reversing }] = useMutation(REVERSE_TRANSACTION_ALLOCATION, {
    refetchQueries: ALLOCATION_REFETCH,
    update: evictAllocationFields,
  });

  const allocateTransactions = async (input: AllocateTransactionsInput) =>
    allocateMutation({ variables: { input } });

  const reverseAllocation = async (id: string) => reverseMutation({ variables: { id } });

  return { allocateTransactions, allocating, reverseAllocation, reversing };
}
