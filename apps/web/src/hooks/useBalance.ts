import { useQuery } from "@apollo/client/react";
import { GET_TOTAL_BALANCE } from "@/lib/apollo/queries/transactions";
import type { FilterTransactionInput } from "@/types/__generated__/graphql";

export function useBalance(currency?: string, filter?: FilterTransactionInput) {
  const { data, loading, error, refetch } = useQuery(GET_TOTAL_BALANCE, {
    variables: { currency, filter },
    fetchPolicy: "cache-and-network",
  });

  return {
    balance: data?.totalBalance,
    loading,
    error,
    refetch,
  };
}
