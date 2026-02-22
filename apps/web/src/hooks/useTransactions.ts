import { useMutation, useQuery } from "@apollo/client/react";
import {
  CREATE_TRANSACTION,
  GET_TRANSACTIONS,
  REMOVE_TRANSACTION,
} from "@/lib/apollo/queries/transactions";
import type { CreateTransactionInput, FilterTransactionInput } from "@/types/__generated__/graphql";

export function useTransactions(filter?: FilterTransactionInput) {
  const { data, loading, error, refetch } = useQuery(GET_TRANSACTIONS, {
    variables: { filter },
    fetchPolicy: "cache-and-network",
  });

  const [createTransactionMutation, { loading: creating }] = useMutation(CREATE_TRANSACTION, {
    onCompleted: () => refetch(),
    refetchQueries: ["TotalBalance"],
  });

  const [removeTransactionMutation, { loading: removing }] = useMutation(REMOVE_TRANSACTION, {
    onCompleted: () => refetch(),
    refetchQueries: ["TotalBalance"],
  });

  const createTransaction = async (input: CreateTransactionInput) => {
    return createTransactionMutation({ variables: { input } });
  };

  const removeTransaction = async (id: string) => {
    return removeTransactionMutation({ variables: { id } });
  };

  return {
    transactions: data?.transactions.items || [],
    summary: data?.transactions.summary,
    loading,
    error,
    createTransaction,
    creating,
    removeTransaction,
    removing,
    refetch,
  };
}
