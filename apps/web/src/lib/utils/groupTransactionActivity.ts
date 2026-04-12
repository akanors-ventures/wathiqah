/**
 * Groups a flat list of transactions into an "activity stream" where child
 * transactions (e.g. repayments) are nested directly under their parent.
 *
 * - A child whose parent is also present in the list is attached to that
 *   parent and emitted immediately after it (depth = 1).
 * - A child whose parent is NOT in the list is rendered at top level
 *   with `isOrphan = true` so the UI can show a "↳ Repayment for ..." hint.
 * - Top-level rows preserve the input order (typically date desc from the API).
 */

export type ActivityRow<T> = {
  tx: T;
  depth: 0 | 1;
  /** True when this is a child whose parent isn't in the current page. */
  isOrphan?: boolean;
};

type Groupable = {
  id: string;
  parentId?: string | null;
};

export function groupTransactionActivity<T extends Groupable>(list: T[]): ActivityRow<T>[] {
  const byId = new Map<string, T>();
  for (const tx of list) byId.set(tx.id, tx);

  const childrenByParent = new Map<string, T[]>();
  const consumed = new Set<string>();

  for (const tx of list) {
    if (tx.parentId && byId.has(tx.parentId)) {
      const arr = childrenByParent.get(tx.parentId);
      if (arr) {
        arr.push(tx);
      } else {
        childrenByParent.set(tx.parentId, [tx]);
      }
      consumed.add(tx.id);
    }
  }

  const result: ActivityRow<T>[] = [];
  for (const tx of list) {
    if (consumed.has(tx.id)) continue;
    result.push({ tx, depth: 0, isOrphan: !!tx.parentId });
    const children = childrenByParent.get(tx.id);
    if (children) {
      for (const child of children) {
        result.push({ tx: child, depth: 1 });
      }
    }
  }
  return result;
}
