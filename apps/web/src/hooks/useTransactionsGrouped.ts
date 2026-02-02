import { useQuery } from "@apollo/client/react";
import { GET_TRANSACTIONS_GROUPED_BY_CONTACT } from "@/lib/apollo/queries/transactions";
import type { FilterTransactionInput } from "@/types/__generated__/graphql";

export function useTransactionsGroupedByContact(filter?: FilterTransactionInput) {
  const { data, loading, error, refetch } = useQuery(GET_TRANSACTIONS_GROUPED_BY_CONTACT, {
    variables: { filter },
    fetchPolicy: "cache-and-network",
  });

  return {
    groupedData: data?.transactionsGroupedByContact || [],
    loading,
    error,
    refetch,
  };
}
