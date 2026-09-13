import { describe, expect, it } from "vitest";
import type { PickerRow } from "@/hooks/useAllocationPicker";
import { groupAllocationRowsByContact } from "./allocationRowGrouping";

function row(overrides: Partial<PickerRow> = {}): PickerRow {
  return {
    id: "row-1",
    type: "LOAN_GIVEN",
    currency: "NGN",
    date: "2026-01-01",
    remainingAmount: 1000,
    ...overrides,
  };
}

describe("groupAllocationRowsByContact", () => {
  it("returns nothing for an empty list", () => {
    expect(groupAllocationRowsByContact([])).toEqual([]);
  });

  it("puts every row for the same contact in one group", () => {
    const rows = [
      row({ id: "a", contact: { id: "c1", name: "Musa" } }),
      row({ id: "b", contact: { id: "c1", name: "Musa" } }),
    ];
    const groups = groupAllocationRowsByContact(rows);

    expect(groups).toHaveLength(1);
    expect(groups[0].label).toBe("Musa");
    expect(groups[0].rows.map((r) => r.id)).toEqual(["a", "b"]);
  });

  it("sorts multiple contact groups alphabetically by label", () => {
    const rows = [
      row({ id: "a", contact: { id: "c-zed", name: "Zainab" } }),
      row({ id: "b", contact: { id: "c-ade", name: "Ade" } }),
    ];
    const groups = groupAllocationRowsByContact(rows);

    expect(groups.map((g) => g.label)).toEqual(["Ade", "Zainab"]);
  });

  it("buckets rows with no contact under 'No contact' and pins it last", () => {
    const rows = [
      row({ id: "a", contact: null }),
      row({ id: "b", contact: { id: "c-ade", name: "Ade" } }),
    ];
    const groups = groupAllocationRowsByContact(rows);

    expect(groups.map((g) => g.label)).toEqual(["Ade", "No contact"]);
    expect(groups[1].rows.map((r) => r.id)).toEqual(["a"]);
  });

  it("preserves each row's original relative order within its group", () => {
    const rows = [
      row({ id: "newest", date: "2026-06-01", contact: { id: "c1", name: "Musa" } }),
      row({ id: "oldest", date: "2026-01-01", contact: { id: "c1", name: "Musa" } }),
    ];
    const groups = groupAllocationRowsByContact(rows);

    expect(groups[0].rows.map((r) => r.id)).toEqual(["newest", "oldest"]);
  });
});
