import { describe, expect, it } from "vitest";
import { formatDateOnly, parseDateOnly } from "./dates";

describe("parseDateOnly", () => {
  it("parses a yyyy-MM-dd string into a Date built from local calendar parts", () => {
    const date = parseDateOnly("2026-07-17");
    expect(date?.getFullYear()).toBe(2026);
    expect(date?.getMonth()).toBe(6); // 0-indexed
    expect(date?.getDate()).toBe(17);
  });

  it("does not shift the date by a day the way `new Date(value)` would in timezones behind UTC", () => {
    // new Date("2026-01-01") parses as UTC midnight; reading it back with
    // local getters in a timezone behind UTC would show Dec 31. This must not.
    const date = parseDateOnly("2026-01-01");
    expect(date?.getDate()).toBe(1);
    expect(date?.getMonth()).toBe(0);
  });

  it("returns undefined for empty, null, or undefined input", () => {
    expect(parseDateOnly("")).toBeUndefined();
    expect(parseDateOnly(null)).toBeUndefined();
    expect(parseDateOnly(undefined)).toBeUndefined();
  });

  it("returns undefined for a malformed string", () => {
    expect(parseDateOnly("not-a-date")).toBeUndefined();
  });
});

describe("formatDateOnly", () => {
  it("formats a Date as yyyy-MM-dd using local calendar parts", () => {
    expect(formatDateOnly(new Date(2026, 6, 17))).toBe("2026-07-17");
  });

  it("zero-pads single-digit months and days", () => {
    expect(formatDateOnly(new Date(2026, 0, 5))).toBe("2026-01-05");
  });

  it("returns an empty string for undefined or null", () => {
    expect(formatDateOnly(undefined)).toBe("");
    expect(formatDateOnly(null)).toBe("");
  });
});

describe("parseDateOnly + formatDateOnly round-trip", () => {
  it("round-trips a date string unchanged", () => {
    const original = "2026-12-31";
    expect(formatDateOnly(parseDateOnly(original))).toBe(original);
  });
});
