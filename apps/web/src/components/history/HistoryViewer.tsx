import { format } from "date-fns";
import {
  AlertCircle,
  ArrowUpDown,
  Calendar,
  ChevronDown,
  ChevronUp,
  Filter,
  History,
  Search,
} from "lucide-react";
import { useMemo, useState } from "react";
import { AssetCategory } from "@/types/__generated__/graphql";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatCurrency } from "@/lib/utils/formatters";

interface HistoryEntry {
  id: string;
  changeType: string;
  createdAt: string;
  user: {
    id: string;
    name: string;
    email: string;
  };
  previousState: Record<string, unknown> | null;
  newState: Record<string, unknown> | null;
}

interface HistoryViewerProps {
  history: HistoryEntry[];
}

// Helper to format values for display
const formatValue = (
  key: string,
  value: unknown,
  snapshot: Record<string, unknown> | null,
): string => {
  if (value === null || value === undefined) return "—";
  if (
    key === "date" &&
    (typeof value === "string" || typeof value === "number" || value instanceof Date)
  ) {
    return format(new Date(value), "MMM d, yyyy");
  }
  if (key === "amount" && (typeof value === "number" || typeof value === "string")) {
    const currency = (snapshot?.currency as string) || "NGN";
    return formatCurrency(Number(value), currency);
  }
  if (key === "transactionDetails" && typeof value === "object" && value !== null) {
    const details = value as {
      creator: string;
      contact: string;
      amount?: number | string;
      currency?: string;
      category?: string;
    };
    const parts = [`Between ${details.creator} and ${details.contact}`];
    if (details.category === AssetCategory.Funds && details.amount) {
      parts.push(`(${details.currency} ${details.amount})`);
    }
    return parts.join(" ");
  }
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
};

export function HistoryViewer({ history }: HistoryViewerProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<string>("ALL");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

  // Calculate changes for a history item
  const getChanges = (item: HistoryEntry) => {
    if (!item.newState) return [];

    const isFunds =
      item.newState.category === AssetCategory.Funds ||
      item.previousState?.category === AssetCategory.Funds;
    const isItem =
      item.newState.category === AssetCategory.Item ||
      item.previousState?.category === AssetCategory.Item;

    return Object.keys(item.newState)
      .filter((key) => {
        // Hide quantity and itemName for funds transactions
        if (isFunds && (key === "quantity" || key === "itemName")) {
          return false;
        }
        // Hide amount for item transactions
        if (isItem && key === "amount") {
          return false;
        }
        return true;
      })
      .map((key) => {
        const prev = item.previousState ? item.previousState[key] : undefined;
        const current = item.newState?.[key];
        return {
          field: key,
          oldValue: prev,
          newValue: current,
        };
      });
  };

  // Filter and sort history
  const filteredHistory = useMemo(() => {
    let result = [...history];

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (item) =>
          item.user.name.toLowerCase().includes(query) ||
          item.changeType.toLowerCase().includes(query) ||
          format(new Date(item.createdAt), "PPpp").toLowerCase().includes(query),
      );
    }

    // Type filter
    if (filterType !== "ALL") {
      result = result.filter((item) => item.changeType === filterType);
    }

    // Sort
    result.sort((a, b) => {
      const dateA = new Date(a.createdAt).getTime();
      const dateB = new Date(b.createdAt).getTime();
      return sortOrder === "asc" ? dateA - dateB : dateB - dateA;
    });

    return result;
  }, [history, searchQuery, filterType, sortOrder]);

  const toggleExpand = (id: string) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedItems(newExpanded);
  };

  const uniqueChangeTypes = useMemo(() => {
    const types = new Set(history.map((item) => item.changeType));
    return Array.from(types);
  }, [history]);

  if (history.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center border border-dashed rounded-[24px] border-border/60 bg-muted/5">
        <div className="p-5 mb-6 rounded-full bg-muted/20 text-muted-foreground/40">
          <History className="w-10 h-10" />
        </div>
        <h3 className="text-lg font-bold text-foreground">No History Available</h3>
        <p className="max-w-sm mt-2 text-sm text-muted-foreground font-medium">
          There are no recorded changes for this transaction yet.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between px-2">
        <div className="space-y-1.5">
          <h3 className="flex items-center gap-4 text-2xl font-bold text-foreground tracking-tight">
            <div className="p-3 rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/20 -rotate-3 group-hover:rotate-0 transition-all duration-500">
              <History size={22} />
            </div>
            Audit Log
            <span className="ml-2 text-xs font-bold bg-primary/10 text-primary px-3 py-1 rounded-full border border-primary/20">
              {filteredHistory.length}
            </span>
          </h3>
          <p className="text-sm text-muted-foreground font-medium pl-16 opacity-70">
            Transaction verification & change history
          </p>
        </div>

        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <div className="relative w-full sm:w-72 group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-all" />
            <Input
              placeholder="Search history..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-12 h-12 rounded-2xl bg-muted/20 border-border/50 focus:bg-background focus:ring-primary/20 transition-all text-sm font-medium"
            />
          </div>

          <div className="flex gap-3">
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-[160px] h-12 rounded-2xl bg-muted/20 border-border/50 focus:ring-primary/20 text-xs font-bold">
                <Filter className="w-4 h-4 mr-2 opacity-60" />
                <SelectValue placeholder="Filter Type" />
              </SelectTrigger>
              <SelectContent className="rounded-2xl border-border/50 shadow-2xl p-1">
                <SelectItem
                  value="ALL"
                  className="text-xs font-bold rounded-xl focus:bg-primary/5 focus:text-primary"
                >
                  All Actions
                </SelectItem>
                {uniqueChangeTypes.map((type) => (
                  <SelectItem
                    key={type}
                    value={type}
                    className="text-xs font-bold rounded-xl focus:bg-primary/5 focus:text-primary"
                  >
                    {type.replace(/_/g, " ")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button
              variant="outline"
              size="icon"
              onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
              className="h-12 w-12 rounded-2xl bg-muted/20 border-border/50 hover:bg-primary hover:text-primary-foreground hover:border-primary transition-all shadow-md active:scale-95"
              title={`Sort ${sortOrder === "asc" ? "Newest first" : "Oldest first"}`}
            >
              <ArrowUpDown className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      <div className="space-y-12">
        {filteredHistory.length > 0 ? (
          <div className="relative border-l-2 border-primary/10 ml-8 space-y-14 py-6">
            {filteredHistory.map((item) => (
              <div key={item.id} className="relative pl-14 group/item">
                {/* Timeline Dot */}
                <span className="absolute left-[-11px] top-0 h-5 w-5 rounded-full border-4 border-background bg-primary shadow-lg shadow-primary/30 ring-4 ring-primary/5 group-hover/item:scale-125 group-hover/item:rotate-90 transition-all duration-700 z-10" />

                <div className="group relative flex flex-col gap-6 p-6 bg-card border border-border/50 rounded-[24px] transition-all duration-700 hover:shadow-[0_30px_60px_rgba(0,0,0,0.08)] hover:-translate-y-1.5 hover:border-primary/30 overflow-hidden sm:flex-row sm:items-center sm:justify-between">
                  <div className="space-y-3 relative z-10">
                    <div className="flex items-center gap-4">
                      <div className="px-3 py-1.5 rounded-lg bg-primary/5 text-primary text-[10px] font-bold border border-primary/10 shadow-sm group-hover/item:bg-primary group-hover/item:text-primary-foreground transition-all duration-500 capitalize">
                        {item.changeType.replace(/_/g, " ").toLowerCase()}
                      </div>
                      <span className="text-base font-bold text-foreground tracking-tight group-hover/item:text-primary transition-colors">
                        by {item.user.name}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 text-[11px] text-muted-foreground font-medium opacity-60 group-hover/item:opacity-90 transition-opacity">
                      <span className="flex items-center gap-2">
                        <Calendar className="w-3.5 h-3.5 text-primary/60" />
                        {format(new Date(item.createdAt), "MMM d, yyyy")}
                      </span>
                      <span className="w-1.5 h-1.5 rounded-full bg-border/50" />
                      <span className="flex items-center gap-2">
                        <History className="w-3.5 h-3.5 text-primary/60" />
                        {format(new Date(item.createdAt), "h:mm a")}
                      </span>
                    </div>
                  </div>

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => toggleExpand(item.id)}
                    className="self-start text-[11px] font-bold h-10 rounded-xl hover:bg-primary hover:text-primary-foreground transition-all px-6 border border-transparent hover:border-primary shadow-sm active:scale-95 relative z-10"
                  >
                    {expandedItems.has(item.id) ? (
                      <>
                        Hide Details <ChevronUp className="w-3.5 h-3.5 ml-2" />
                      </>
                    ) : (
                      <>
                        View Details <ChevronDown className="w-3.5 h-3.5 ml-2" />
                      </>
                    )}
                  </Button>

                  {/* Decorative glow inside card */}
                  <div className="absolute -right-16 -top-16 w-40 h-40 bg-primary/5 rounded-full blur-3xl group-hover/item:bg-primary/10 transition-colors duration-700" />
                </div>

                {/* Expanded Details */}
                {expandedItems.has(item.id) && (
                  <div className="mt-6 p-8 bg-muted/10 rounded-[32px] border border-border/30 animate-in fade-in slide-in-from-top-6 duration-700 relative overflow-hidden group/details">
                    {/* Decorative background element */}
                    <div className="absolute -right-24 -bottom-24 w-64 h-64 bg-primary/5 rounded-full blur-[100px] group-hover/details:bg-primary/10 transition-colors duration-700" />

                    {item.changeType === "UPDATE_POST_ACK" && (
                      <div className="mb-8 p-6 bg-amber-500/5 text-amber-600 rounded-[24px] border border-amber-500/10 flex items-start gap-4 shadow-sm relative z-10 backdrop-blur-sm group-hover:border-amber-500/20 transition-all">
                        <div className="p-3 rounded-xl bg-amber-500/10 shrink-0 shadow-md group-hover:scale-110 group-hover:-rotate-6 transition-all">
                          <AlertCircle className="w-5 h-5" />
                        </div>
                        <div className="space-y-2">
                          <p className="text-[11px] font-bold text-amber-700 capitalize">
                            Modified post-acknowledgement
                          </p>
                          <p className="text-[11px] font-medium leading-relaxed opacity-90">
                            This update occurred after witness acknowledgement. Witnesses have been
                            automatically notified to re-verify the new state of this transaction.
                          </p>
                        </div>
                      </div>
                    )}

                    {item.newState && Object.keys(item.newState).length > 0 ? (
                      <div className="rounded-[24px] border border-border/30 bg-background/50 overflow-hidden shadow-xl relative z-10 backdrop-blur-md group-hover:border-primary/20 transition-all">
                        <div className="overflow-x-auto">
                          <table className="w-full text-left border-collapse">
                            <thead>
                              <tr className="border-b border-border/30 bg-muted/40">
                                <th className="p-4 pl-8 text-[10px] font-bold text-muted-foreground/70 w-1/3 capitalize">
                                  Field
                                </th>
                                <th className="p-4 text-[10px] font-bold text-muted-foreground/70 w-1/3 capitalize">
                                  Previous state
                                </th>
                                <th className="p-4 pr-8 text-[10px] font-bold text-muted-foreground/70 w-1/3 capitalize">
                                  New state
                                </th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-border/20">
                              {getChanges(item).map((change) => (
                                <tr
                                  key={change.field}
                                  className="hover:bg-primary/[0.03] transition-all group/row"
                                >
                                  <td className="p-4 pl-8">
                                    <span className="text-[11px] font-bold text-foreground opacity-60 group-hover/row:opacity-100 group-hover/row:text-primary transition-all capitalize">
                                      {change.field.replace(/([A-Z])/g, " $1").toLowerCase()}
                                    </span>
                                  </td>
                                  <td className="p-4">
                                    <span className="text-xs font-bold text-muted-foreground line-through decoration-muted-foreground/30 group-hover/row:decoration-muted-foreground/50 transition-all">
                                      {formatValue(
                                        change.field,
                                        change.oldValue,
                                        item.previousState,
                                      )}
                                    </span>
                                  </td>
                                  <td className="p-4 pr-8">
                                    <span className="text-xs font-black text-primary tracking-tight capitalize group-hover/row:scale-105 inline-block transition-transform">
                                      {formatValue(change.field, change.newValue, item.newState)}
                                    </span>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    ) : (
                      <div className="p-8 text-center rounded-[24px] border border-dashed border-border/50 bg-background/30 relative z-10 backdrop-blur-sm">
                        <p className="text-[10px] font-black capitalize tracking-wider text-muted-foreground opacity-40">
                          No field-level changes recorded for this entry.
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-32 text-center border border-dashed rounded-[32px] border-border/60 bg-muted/5 mx-4 group/empty">
            <div className="p-6 mb-8 rounded-3xl bg-muted/20 text-muted-foreground/30 group-hover/empty:scale-110 group-hover/empty:bg-primary/5 group-hover/empty:text-primary transition-all duration-700">
              <Search className="w-12 h-12" />
            </div>
            <h3 className="text-xl font-black text-foreground capitalize tracking-wide">
              No matches found
            </h3>
            <p className="max-w-xs mt-3 text-[11px] text-muted-foreground font-black capitalize tracking-tight opacity-60">
              We couldn't find any history entries matching your current filters.
            </p>
            <Button
              variant="link"
              onClick={() => {
                setSearchQuery("");
                setFilterType("ALL");
              }}
              className="mt-6 text-[10px] font-black capitalize tracking-wider text-primary hover:no-underline hover:scale-110 transition-all"
            >
              Clear all filters
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
