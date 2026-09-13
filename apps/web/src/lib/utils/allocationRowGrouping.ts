import type { PickerRow } from "@/hooks/useAllocationPicker";

const NO_CONTACT_KEY = "__none__";

export interface AllocationRowGroup {
  key: string;
  label: string;
  rows: PickerRow[];
}

/**
 * Neither allocation-picker query filters by the source's own contact, so
 * rows from unrelated contacts can appear side by side — grouping by contact
 * is what keeps a same-amount obligation for the wrong person from being
 * picked by mistake. Groups are sorted alphabetically by label; rows with no
 * contact are bucketed together and always sort last.
 */
export function groupAllocationRowsByContact(rows: PickerRow[]): AllocationRowGroup[] {
  const groups = new Map<string, AllocationRowGroup>();

  for (const row of rows) {
    const key = row.contact?.id ?? NO_CONTACT_KEY;
    const label = row.contact?.name ?? "No contact";
    const existing = groups.get(key);
    if (existing) {
      existing.rows.push(row);
    } else {
      groups.set(key, { key, label, rows: [row] });
    }
  }

  return Array.from(groups.values()).sort((a, b) => {
    if (a.key === NO_CONTACT_KEY) return 1;
    if (b.key === NO_CONTACT_KEY) return -1;
    return a.label.localeCompare(b.label);
  });
}
