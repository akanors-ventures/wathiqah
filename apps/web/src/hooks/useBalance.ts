import { useQuery } from "@apollo/client/react";
import { GET_TOTAL_BALANCE } from "@/lib/apollo/queries/transactions";

export function useBalance(currency?: string) {
  const { data, loading, error, refetch } = useQuery(GET_TOTAL_BALANCE, {
    variables: { currency },
    fetchPolicy: "cache-and-network",
  });

  return {
    balance: data?.totalBalance,
    loading,
    error,
    refetch,
  };
}
