import { useQuery } from "@apollo/client/react";
import { GET_MY_CONTACT_TRANSACTIONS } from "@/lib/apollo/queries/transactions";
import type { FilterSharedHistoryInput } from "@/types/__generated__/graphql";

export function useMyContactTransactions(filter?: FilterSharedHistoryInput) {
  const { data, loading, error, refetch } = useQuery(
    GET_MY_CONTACT_TRANSACTIONS,
    {
      variables: { filter },
      fetchPolicy: "cache-and-network",
    },
  );

  return {
    transactions: data?.myContactTransactions?.items ?? [],
    total: data?.myContactTransactions?.total ?? 0,
    page: data?.myContactTransactions?.page ?? 1,
    limit: data?.myContactTransactions?.limit ?? 25,
    loading,
    error,
    refetch,
  };
}
