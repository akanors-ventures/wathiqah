import { useState, useEffect } from "react";
import type {
  ProjectStatus,
  ProjectBalanceStanding,
} from "@/types/__generated__/graphql";

export function useProjectFilters() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<ProjectStatus | "ALL">("ALL");
  const [balanceStanding, setBalanceStanding] = useState<
    ProjectBalanceStanding | "ALL"
  >("ALL");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);

  // biome-ignore lint/correctness/useExhaustiveDependencies: intentional page reset on filter change
  useEffect(() => {
    setPage(1);
  }, [search, status, balanceStanding]);

  const variables = {
    filter: {
      ...(search && { search }),
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
