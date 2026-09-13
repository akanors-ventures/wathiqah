import { HistoryViewer } from "@/components/history/HistoryViewer";
import type { TransactionDetail } from "@/lib/utils/transactionDetailView";

/** Maps the raw query history rows into HistoryViewer's expected shape. */
export function TransactionHistorySection({ history }: { history: TransactionDetail["history"] }) {
  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-6 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
      <HistoryViewer
        history={(history ?? [])
          .filter((h): h is NonNullable<typeof h> => h !== null)
          .map((h) => ({
            id: h.id,
            changeType: h.changeType,
            createdAt: String(h.createdAt),
            user: {
              id: h.user?.id ?? "unknown",
              name: h.user?.name ?? "Unknown",
              email: h.user?.email ?? "unknown@example.com",
            },
            previousState: (h.previousState ?? null) as Record<string, unknown> | null,
            newState: (h.newState ?? null) as Record<string, unknown> | null,
          }))}
      />
    </div>
  );
}
