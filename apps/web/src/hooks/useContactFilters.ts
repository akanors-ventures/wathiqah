import { useState, useEffect } from "react";
import type { ContactBalanceStanding } from "@/types/__generated__/graphql";

export function useContactFilters() {
  const [search, setSearch] = useState("");
  const [balanceStanding, setBalanceStanding] = useState<
    ContactBalanceStanding | "ALL"
  >("ALL");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);

  // biome-ignore lint/correctness/useExhaustiveDependencies: intentional page reset on filter change
  useEffect(() => {
    setPage(1);
  }, [search, balanceStanding]);

  const variables = {
    filter: {
      ...(search && { search }),
      ...(balanceStanding !== "ALL" && {
        balanceStanding: balanceStanding as ContactBalanceStanding,
      }),
      page,
      limit,
    },
  };

  return {
    search,
    setSearch,
    balanceStanding,
    setBalanceStanding,
    page,
    setPage,
    limit,
    setLimit,
    variables,
  };
}
