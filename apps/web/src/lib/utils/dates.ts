/**
 * Parses a `yyyy-MM-dd` date-only string into a `Date` built from local
 * calendar parts. Deliberately not `new Date(value)`: that parses date-only
 * ISO strings as UTC midnight, which renders as the previous day in any
 * timezone behind UTC once read back with local getters (getDate() etc.).
 */
export function parseDateOnly(value: string | undefined | null): Date | undefined {
  if (!value) return undefined;
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return undefined;
  const date = new Date(year, month - 1, day);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

/** Formats a `Date` as `yyyy-MM-dd` using its local calendar date (not UTC). */
export function formatDateOnly(date: Date | undefined | null): string {
  if (!date) return "";
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
