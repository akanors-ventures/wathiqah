import { useEffect, useState } from "react";

/**
 * Delays reflecting `value` until it stops changing for `delayMs`.
 * Bind the input itself to the raw (non-debounced) value so typing is
 * never interrupted — only pass the debounced value into the query/filter.
 */
export function useDebounce<T>(value: T, delayMs = 2000): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);

  return debounced;
}
