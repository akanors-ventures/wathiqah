import { format } from "date-fns";
import {
  AlertCircle,
  ArrowUpDown,
  Ban,
  CheckCircle2,
  ChevronDown,
  Circle,
  Filter,
  Gift,
  History,
  PencilLine,
  Plus,
  RefreshCw,
  Search,
  Undo2,
  Wallet,
} from "lucide-react";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SupporterBadge } from "@/components/ui/supporter-badge";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/utils/formatters";
import { AssetCategory } from "@/types/__generated__/graphql";

interface HistoryEntry {
  id: string;
  changeType: string;
  createdAt: string;
  user: {
    id: string;
    name: string;
    email: string;
    isSupporter?: boolean;
  };
  previousState: Record<string, unknown> | null;
  newState: Record<string, unknown> | null;
}

interface HistoryViewerProps {
  history: HistoryEntry[];
}

/* ------------------------------------------------------------------ */
/* Field metadata                                                      */
/* ------------------------------------------------------------------ */

const FIELD_LABELS: Record<string, string> = {
  amount: "Amount",
  category: "Category",
  type: "Type",
  status: "Status",
  date: "Date",
  description: "Description",
  itemName: "Item",
  quantity: "Quantity",
  contactId: "Contact",
  currency: "Currency",
  repaymentAmount: "Repayment amount",
  repaymentType: "Repayment type",
  giftAmount: "Gift amount",
  remainingAmount: "Remaining",
};

/** Internal/auto-generated fields users shouldn't see in the diff. */
const HIDDEN_FIELDS = new Set([
  "id",
  "userId",
  "transactionId",
  "createdAt",
  "updatedAt",
  "repaymentId",
  "conversionId",
  "createdById",
]);

/* ------------------------------------------------------------------ */
/* Change-type metadata: badge label, color, icon                      */
/* ------------------------------------------------------------------ */

type ChangeMeta = {
  label: string;
  Icon: React.ComponentType<{ className?: string }>;
  /** Tailwind classes for the colored chip. */
  chip: string;
  /** Tailwind classes for the timeline dot. */
  dot: string;
};

const DEFAULT_META: ChangeMeta = {
  label: "Update",
  Icon: PencilLine,
  chip: "bg-blue-500/10 text-blue-600 border-blue-500/20",
  dot: "bg-blue-500",
};

const CHANGE_TYPE_META: Record<string, ChangeMeta> = {
  CREATE: {
    label: "Created",
    Icon: Plus,
    chip: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
    dot: "bg-emerald-500",
  },
  UPDATE: {
    label: "Updated",
    Icon: PencilLine,
    chip: "bg-blue-500/10 text-blue-600 border-blue-500/20",
    dot: "bg-blue-500",
  },
  UPDATE_POST_ACK: {
    label: "Updated after acknowledgement",
    Icon: AlertCircle,
    chip: "bg-amber-500/10 text-amber-600 border-amber-500/20",
    dot: "bg-amber-500",
  },
  CANCELLED: {
    label: "Cancelled",
    Icon: Ban,
    chip: "bg-rose-500/10 text-rose-600 border-rose-500/20",
    dot: "bg-rose-500",
  },
  REPAYMENT_RECORDED: {
    label: "Repayment recorded",
    Icon: Wallet,
    chip: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
    dot: "bg-emerald-500",
  },
  PARTIAL_CONVERSION_TO_GIFT: {
    label: "Converted to gift",
    Icon: Gift,
    chip: "bg-pink-500/10 text-pink-600 border-pink-500/20",
    dot: "bg-pink-500",
  },
  AUTO_SETTLED: {
    label: "Auto-settled",
    Icon: CheckCircle2,
    chip: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
    dot: "bg-emerald-500",
  },
  AUTO_REOPENED: {
    label: "Re-opened",
    Icon: Undo2,
    chip: "bg-amber-500/10 text-amber-600 border-amber-500/20",
    dot: "bg-amber-500",
  },
  WITNESS_ACKNOWLEDGED: {
    label: "Witness acknowledged",
    Icon: CheckCircle2,
    chip: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
    dot: "bg-emerald-500",
  },
  WITNESS_DECLINED: {
    label: "Witness declined",
    Icon: Ban,
    chip: "bg-rose-500/10 text-rose-600 border-rose-500/20",
    dot: "bg-rose-500",
  },
  WITNESS_MODIFIED: {
    label: "Witness re-flagged",
    Icon: RefreshCw,
    chip: "bg-amber-500/10 text-amber-600 border-amber-500/20",
    dot: "bg-amber-500",
  },
};

const getMeta = (changeType: string): ChangeMeta => CHANGE_TYPE_META[changeType] ?? DEFAULT_META;

/* ------------------------------------------------------------------ */
/* Value formatting                                                    */
/* ------------------------------------------------------------------ */

const formatValue = (
  key: string,
  value: unknown,
  snapshot: Record<string, unknown> | null,
): string => {
  if (value === null || value === undefined || value === "") return "—";

  if (
    (key === "date" || key.toLowerCase().includes("at")) &&
    (typeof value === "string" || typeof value === "number" || value instanceof Date)
  ) {
    const d = new Date(value);
    if (!Number.isNaN(d.getTime())) return format(d, "MMM d, yyyy");
  }

  if (
    (key === "amount" ||
      key === "repaymentAmount" ||
      key === "giftAmount" ||
      key === "remainingAmount") &&
    (typeof value === "number" || typeof value === "string")
  ) {
    const currency = (snapshot?.currency as string) || "NGN";
    return formatCurrency(Number(value), currency);
  }

  if (typeof value === "object") {
    // Object summaries — opt-in for known shapes only
    const obj = value as Record<string, unknown>;
    if ("creator" in obj && "contact" in obj) {
      return `${obj.creator} ↔ ${obj.contact}`;
    }
    return "—";
  }

  // Format snake/screaming_snake into Title Case
  const str = String(value);
  if (/^[A-Z_]+$/.test(str)) {
    return str
      .toLowerCase()
      .replace(/_/g, " ")
      .replace(/\b\w/g, (c) => c.toUpperCase());
  }
  return str;
};

const labelForField = (field: string): string =>
  FIELD_LABELS[field] ??
  field
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (c) => c.toUpperCase())
    .trim();

/* ------------------------------------------------------------------ */
/* Per-entry summary line                                              */
/* ------------------------------------------------------------------ */

function buildSummary(item: HistoryEntry): string | null {
  const newState = item.newState ?? {};
  const currency = (newState.currency as string) ?? "NGN";

  switch (item.changeType) {
    case "REPAYMENT_RECORDED": {
      const amount = newState.repaymentAmount ?? newState.amount;
      if (amount != null) {
        return `Recorded a repayment of ${formatCurrency(Number(amount), currency)}`;
      }
      return "Recorded a repayment";
    }
    case "PARTIAL_CONVERSION_TO_GIFT": {
      const amount = newState.giftAmount ?? newState.amount;
      if (amount != null) {
        return `Converted ${formatCurrency(Number(amount), currency)} to a gift`;
      }
      return "Converted part of this loan to a gift";
    }
    case "AUTO_SETTLED":
      return "All repayments received — loan marked as settled";
    case "AUTO_REOPENED":
      return "Outstanding balance changed — loan re-opened";
    case "CANCELLED":
      return "Marked as cancelled";
    case "CREATE":
      return "Created this transaction";
    case "WITNESS_ACKNOWLEDGED":
      return `${item.user.name} acknowledged this transaction`;
    case "WITNESS_DECLINED":
      return `${item.user.name} declined to witness this transaction`;
    case "WITNESS_MODIFIED":
      return `${item.user.name}'s acknowledgement was reset after an update`;
    default:
      return null;
  }
}

/** Witness events don't have meaningful field-level diffs — the chip + summary
 *  already say everything. Same for auto-settle/auto-reopen. */
const SKIP_DIFF_FOR: ReadonlySet<string> = new Set([
  "WITNESS_ACKNOWLEDGED",
  "WITNESS_DECLINED",
  "WITNESS_MODIFIED",
  "AUTO_SETTLED",
  "AUTO_REOPENED",
]);

/* ------------------------------------------------------------------ */
/* Diff computation                                                    */
/* ------------------------------------------------------------------ */

interface DiffRow {
  field: string;
  oldValue: unknown;
  newValue: unknown;
}

function getDiff(item: HistoryEntry): DiffRow[] {
  if (!item.newState) return [];
  if (SKIP_DIFF_FOR.has(item.changeType)) return [];

  const isFunds =
    item.newState.category === AssetCategory.Funds ||
    item.previousState?.category === AssetCategory.Funds;
  const isItem =
    item.newState.category === AssetCategory.Item ||
    item.previousState?.category === AssetCategory.Item;

  return Object.keys(item.newState)
    .filter((key) => {
      if (HIDDEN_FIELDS.has(key)) return false;
      if (isFunds && (key === "quantity" || key === "itemName")) return false;
      if (isItem && key === "amount") return false;
      // Skip large nested objects we can't render meaningfully
      const v = item.newState?.[key];
      if (typeof v === "object" && v !== null && !("creator" in (v as object))) {
        return false;
      }
      return true;
    })
    .map((field) => ({
      field,
      oldValue: item.previousState ? item.previousState[field] : undefined,
      newValue: item.newState?.[field],
    }))
    .filter((row) => {
      // Drop no-op rows where the formatted before/after are identical.
      const before = formatValue(row.field, row.oldValue, item.previousState);
      const after = formatValue(row.field, row.newValue, item.newState);
      return before !== after;
    });
}

/* ================================================================== */
/*  Component                                                          */
/* ================================================================== */

export function HistoryViewer({ history }: HistoryViewerProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<string>("ALL");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

  const filteredHistory = useMemo(() => {
    let result = [...history];

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter((item) => {
        const meta = getMeta(item.changeType);
        return (
          item.user.name.toLowerCase().includes(q) ||
          meta.label.toLowerCase().includes(q) ||
          item.changeType.toLowerCase().includes(q) ||
          format(new Date(item.createdAt), "PPpp").toLowerCase().includes(q)
        );
      });
    }

    if (filterType !== "ALL") {
      result = result.filter((item) => item.changeType === filterType);
    }

    result.sort((a, b) => {
      const dateA = new Date(a.createdAt).getTime();
      const dateB = new Date(b.createdAt).getTime();
      return sortOrder === "asc" ? dateA - dateB : dateB - dateA;
    });

    return result;
  }, [history, searchQuery, filterType, sortOrder]);

  const uniqueChangeTypes = useMemo(
    () => Array.from(new Set(history.map((item) => item.changeType))),
    [history],
  );

  const toggleExpand = (id: string) =>
    setExpandedItems((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  if (history.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 sm:py-20 text-center border border-dashed rounded-2xl border-border/60 bg-muted/5">
        <div className="p-4 mb-4 rounded-full bg-muted/20 text-muted-foreground/40">
          <History className="w-8 h-8" />
        </div>
        <h3 className="text-base font-bold text-foreground">No history yet</h3>
        <p className="max-w-sm mt-1.5 text-xs sm:text-sm text-muted-foreground font-medium">
          There are no recorded changes for this transaction.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5 w-full max-w-full">
      {/* ─── Header ──────────────────────────────────────────── */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 sm:p-2.5 rounded-xl bg-primary/10 text-primary border border-primary/15">
            <History className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
          <div>
            <h3 className="flex items-center gap-2 text-base sm:text-lg font-bold text-foreground tracking-tight">
              Audit Log
              <span className="text-[10px] sm:text-[11px] font-bold bg-primary/10 text-primary px-2 py-0.5 rounded-full border border-primary/20">
                {filteredHistory.length}
              </span>
            </h3>
            <p className="text-[11px] sm:text-xs text-muted-foreground font-medium">
              Verified change history for this transaction
            </p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-2 w-full lg:w-auto">
          <div className="relative flex-1 lg:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Search history…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9 rounded-lg bg-muted/30 border-border/50 text-xs font-medium"
            />
          </div>
          <div className="flex gap-2">
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="flex-1 sm:w-40 h-9 rounded-lg bg-muted/30 border-border/50 text-xs font-bold">
                <div className="flex items-center gap-1.5 truncate">
                  <Filter className="w-3 h-3 opacity-60 shrink-0" />
                  <SelectValue placeholder="All actions" />
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL" className="text-xs font-bold">
                  All actions
                </SelectItem>
                {uniqueChangeTypes.map((type) => (
                  <SelectItem key={type} value={type} className="text-xs font-bold">
                    {getMeta(type).label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
              className="h-9 w-9 rounded-lg bg-muted/30 border-border/50 shrink-0"
              title={sortOrder === "asc" ? "Oldest first" : "Newest first"}
            >
              <ArrowUpDown className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      </div>

      {/* ─── Timeline ──────────────────────────────────────── */}
      {filteredHistory.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center border border-dashed rounded-2xl border-border/60 bg-muted/5">
          <Search className="w-8 h-8 text-muted-foreground/40 mb-3" />
          <p className="text-sm font-bold text-foreground">No matches</p>
          <p className="text-xs text-muted-foreground mt-1">Try clearing your filters</p>
          <Button
            variant="link"
            onClick={() => {
              setSearchQuery("");
              setFilterType("ALL");
            }}
            className="mt-2 text-xs font-bold text-primary"
          >
            Clear filters
          </Button>
        </div>
      ) : (
        <ol className="relative space-y-3 sm:space-y-4 before:absolute before:top-1 before:bottom-1 before:left-[11px] sm:before:left-[15px] before:w-px before:bg-border/60">
          {filteredHistory.map((item) => {
            const meta = getMeta(item.changeType);
            const Icon = meta.Icon;
            const summary = buildSummary(item);
            const diff = getDiff(item);
            const hasDiff = diff.length > 0;
            const isExpanded = expandedItems.has(item.id);

            return (
              <li key={item.id} className="relative pl-9 sm:pl-12">
                {/* Timeline dot */}
                <span
                  className={cn(
                    "absolute left-0 top-3 sm:top-3.5 flex h-[22px] w-[22px] sm:h-[30px] sm:w-[30px] items-center justify-center rounded-full ring-4 ring-background",
                    meta.dot,
                  )}
                >
                  <Icon className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-white" />
                </span>

                <div className="rounded-xl border border-border/50 bg-card hover:border-border transition-colors overflow-hidden">
                  {/* Top row */}
                  <div className="flex flex-col gap-2 p-3 sm:p-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0 flex-1 space-y-1.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className={cn(
                            "inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-md border",
                            meta.chip,
                          )}
                        >
                          {meta.label}
                        </span>
                        <span className="text-[11px] text-muted-foreground font-medium">
                          {format(new Date(item.createdAt), "MMM d, yyyy")} ·{" "}
                          {format(new Date(item.createdAt), "h:mm a")}
                        </span>
                      </div>

                      {summary && (
                        <p className="text-sm font-semibold text-foreground leading-snug">
                          {summary}
                        </p>
                      )}

                      <p className="text-[11px] text-muted-foreground font-medium flex items-center gap-1">
                        <Circle className="w-1.5 h-1.5 fill-current" />
                        by {item.user.name}
                        {item.user.isSupporter && (
                          <SupporterBadge className="h-3.5 px-1 text-[8px] ml-0.5" />
                        )}
                      </p>
                    </div>

                    {hasDiff && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleExpand(item.id)}
                        className="self-start sm:self-center h-7 px-2 text-[11px] font-bold rounded-md hover:bg-muted/50 -mr-1 sm:-mr-2"
                      >
                        {isExpanded ? "Hide" : "Show"} changes
                        <ChevronDown
                          className={cn(
                            "w-3 h-3 ml-1 transition-transform",
                            isExpanded && "rotate-180",
                          )}
                        />
                      </Button>
                    )}
                  </div>

                  {/* Post-acknowledgement notice */}
                  {item.changeType === "UPDATE_POST_ACK" && (
                    <div className="px-3 sm:px-4 pb-3 sm:pb-4">
                      <div className="flex items-start gap-2 p-2.5 rounded-lg bg-amber-500/5 border border-amber-500/15 text-amber-700 dark:text-amber-500">
                        <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                        <p className="text-[11px] font-medium leading-snug">
                          This update happened after a witness acknowledged the transaction.
                          Witnesses have been re-notified.
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Diff body */}
                  {isExpanded && hasDiff && (
                    <div className="border-t border-border/50 bg-muted/10 p-3 sm:p-4 animate-in fade-in slide-in-from-top-1 duration-200">
                      {/* Mobile: stacked definition list */}
                      <ul className="space-y-2 sm:hidden">
                        {diff.map((change) => (
                          <li
                            key={change.field}
                            className="rounded-lg bg-background border border-border/40 p-2.5"
                          >
                            <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/70 mb-1">
                              {labelForField(change.field)}
                            </div>
                            <div className="flex items-center gap-2 text-xs">
                              <span className="text-muted-foreground line-through decoration-muted-foreground/40 break-all min-w-0 flex-1">
                                {formatValue(change.field, change.oldValue, item.previousState)}
                              </span>
                              <span className="text-muted-foreground/40">→</span>
                              <span className="font-bold text-foreground break-all min-w-0 flex-1 text-right">
                                {formatValue(change.field, change.newValue, item.newState)}
                              </span>
                            </div>
                          </li>
                        ))}
                      </ul>

                      {/* Tablet+ : table */}
                      <table className="hidden sm:table w-full text-left text-xs">
                        <thead>
                          <tr className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/70">
                            <th className="pb-2 w-1/4 font-bold">Field</th>
                            <th className="pb-2 w-3/8 font-bold">Previous</th>
                            <th className="pb-2 w-3/8 font-bold">New</th>
                          </tr>
                        </thead>
                        <tbody>
                          {diff.map((change) => (
                            <tr key={change.field} className="border-t border-border/30 align-top">
                              <td className="py-2 pr-3 font-bold text-muted-foreground">
                                {labelForField(change.field)}
                              </td>
                              <td className="py-2 pr-3 text-muted-foreground line-through decoration-muted-foreground/40 break-words">
                                {formatValue(change.field, change.oldValue, item.previousState)}
                              </td>
                              <td className="py-2 font-bold text-foreground break-words">
                                {formatValue(change.field, change.newValue, item.newState)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
