import { useEffect, useState } from "react";
import type { ProjectBalanceStanding, ProjectStatus } from "@/types/__generated__/graphql";
import { useDebounce } from "./useDebounce";

export function useProjectFilters() {
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search);
  const [status, setStatus] = useState<ProjectStatus | "ALL">("ALL");
  const [balanceStanding, setBalanceStanding] = useState<ProjectBalanceStanding | "ALL">("ALL");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);

  // biome-ignore lint/correctness/useExhaustiveDependencies: intentional page reset on filter change
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, status, balanceStanding]);

  const variables = {
    filter: {
      ...(debouncedSearch && { search: debouncedSearch }),
      ...(status !== "ALL" && { status: status as ProjectStatus }),
      ...(balanceStanding !== "ALL" && {
        balanceStanding: balanceStanding as ProjectBalanceStanding,
      }),
      page,
      limit,
    },
  };

  return {
    search,
    setSearch,
    status,
    setStatus,
    balanceStanding,
    setBalanceStanding,
    page,
    setPage,
    limit,
    setLimit,
    variables,
  };
}
