import { useEffect, useState } from "react";
import { useDebounce } from "./useDebounce";

interface DateRange {
  from: string | null;
  to: string | null;
}

export function useWitnessFilters() {
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search);
  const [dateRange, setDateRange] = useState<DateRange>({
    from: null,
    to: null,
  });
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);

  // biome-ignore lint/correctness/useExhaustiveDependencies: intentional page reset on filter change
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, dateRange]);

  const variables = {
    filter: {
      ...(debouncedSearch && { search: debouncedSearch }),
      ...(dateRange.from && { startDate: new Date(dateRange.from).toISOString() }),
      ...(dateRange.to && { endDate: new Date(dateRange.to).toISOString() }),
      page,
      limit,
    },
  };

  return {
    search,
    setSearch,
    dateRange,
    setDateRange,
    page,
    setPage,
    limit,
    setLimit,
    variables,
  };
}
