/**
 * Pure list-merge helpers for applying org note/event subscription payloads
 * to an Apollo cache list. Id-deduped so a redundant delivery of the acting
 * member's own change (the server broadcasts to all org subscribers,
 * including the sender) is a harmless no-op rather than a duplicate entry.
 */

export function upsertById<T extends { id: string }>(list: T[], item: T): T[] {
  if (list.some((existing) => existing.id === item.id)) return list;
  return [item, ...list];
}

export function replaceById<T extends { id: string }>(list: T[], item: T): T[] {
  return list.map((existing) => (existing.id === item.id ? item : existing));
}

export function removeById<T extends { id: string }>(list: T[], id: string): T[] {
  return list.filter((existing) => existing.id !== id);
}
