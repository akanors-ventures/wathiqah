import { useState, useEffect } from "react";
import type {
  TransactionType,
  TransactionStatus,
} from "@/types/__generated__/graphql";

interface DateRange {
  from: string | null;
  to: string | null;
}

export function useSharedHistoryFilters() {
  const [search, setSearch] = useState("");
  const [types, setTypes] = useState<TransactionType[]>([]);
  const [status, setStatus] = useState<TransactionStatus | "ALL">("ALL");
  const [dateRange, setDateRange] = useState<DateRange>({
    from: null,
    to: null,
  });
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);

  // biome-ignore lint/correctness/useExhaustiveDependencies: intentional page reset on filter change
  useEffect(() => {
    setPage(1);
  }, [search, types, status, dateRange]);

  const variables = {
    filter: {
      ...(search && { search }),
      ...(types.length > 0 && { types }),
      ...(status !== "ALL" && { status: status as TransactionStatus }),
      ...(dateRange.from && { startDate: new Date(dateRange.from) }),
      ...(dateRange.to && { endDate: new Date(dateRange.to) }),
      page,
      limit,
    },
  };

  return {
    search,
    setSearch,
    types,
    setTypes,
    status,
    setStatus,
    dateRange,
    setDateRange,
    page,
    setPage,
    limit,
    setLimit,
    variables,
  };
}
