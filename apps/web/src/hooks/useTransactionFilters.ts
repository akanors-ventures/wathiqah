import { useEffect, useState } from "react";
import type { TransactionStatus, TransactionType } from "@/types/__generated__/graphql";
import { useDebounce } from "./useDebounce";

interface DateRange {
  from: string | null;
  to: string | null;
}

export function useTransactionFilters() {
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search);
  // An emptied search box should clear the filter immediately rather than
  // waiting out the debounce delay — matters for reset() below, which sets
  // `search` to "" synchronously but can't force-flush the debounced value.
  const effectiveSearch = search === "" ? "" : debouncedSearch;
  const [types, setTypes] = useState<TransactionType[]>([]);
  const [status, setStatus] = useState<TransactionStatus | "ALL">("ALL");
  const [currency, setCurrency] = useState("ALL");
  const [dateRange, setDateRange] = useState<DateRange>({
    from: null,
    to: null,
  });
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);

  // biome-ignore lint/correctness/useExhaustiveDependencies: intentional page reset on filter change
  useEffect(() => {
    setPage(1);
  }, [effectiveSearch, types, status, currency, dateRange]);

  const reset = () => {
    setSearch("");
    setTypes([]);
    setStatus("ALL");
    setCurrency("ALL");
    setDateRange({ from: null, to: null });
    setPage(1);
  };

  const variables = {
    filter: {
      ...(effectiveSearch && { search: effectiveSearch }),
      ...(types.length > 0 && { types }),
      ...(status !== "ALL" && { status: status as TransactionStatus }),
      ...(currency !== "ALL" && { currency }),
      ...(dateRange.from && { startDate: new Date(dateRange.from).toISOString() }),
      ...(dateRange.to && { endDate: new Date(dateRange.to).toISOString() }),
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
    currency,
    setCurrency,
    dateRange,
    setDateRange,
    page,
    setPage,
    limit,
    setLimit,
    reset,
    variables,
  };
}
