import { useMutation, useQuery } from "@apollo/client/react";
import { GET_TRANSACTION, UPDATE_TRANSACTION } from "@/lib/apollo/queries/transactions";
import type { UpdateTransactionInput } from "@/types/__generated__/graphql";

export function useTransaction(id: string) {
  const { data, loading, error, refetch } = useQuery(GET_TRANSACTION, {
    variables: { id },
  });

  const [updateTransactionMutation, { loading: updating }] = useMutation(UPDATE_TRANSACTION, {
    onCompleted: () => refetch(),
    // Refetch by query name so every active observer (dashboard, contact page,
    // shared-ledger view) re-runs with its own filter variables.
    refetchQueries: ["TotalBalance", "Transactions", "MyContactTransactions"],
  });

  const updateTransaction = async (input: UpdateTransactionInput) => {
    return updateTransactionMutation({ variables: { input } });
  };

  return {
    transaction: data?.transaction,
    loading,
    error,
    updating,
    refetch,
    updateTransaction,
  };
}
