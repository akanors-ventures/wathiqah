import { useEffect, useState } from "react";
import type { ContactBalanceStanding } from "@/types/__generated__/graphql";
import { useDebounce } from "./useDebounce";

export function useContactFilters() {
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search);
  const [balanceStanding, setBalanceStanding] = useState<ContactBalanceStanding | "ALL">("ALL");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);

  // biome-ignore lint/correctness/useExhaustiveDependencies: intentional page reset on filter change
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, balanceStanding]);

  const variables = {
    filter: {
      ...(debouncedSearch && { search: debouncedSearch }),
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
