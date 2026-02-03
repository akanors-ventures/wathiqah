import { format } from "date-fns";
import {
  ArrowUpDown,
  Calendar,
  ChevronDown,
  ChevronUp,
  Filter,
  History,
  Search,
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
    return new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency: currency,
    }).format(Number(value));
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

    const isFunds = item.newState.category === "FUNDS" || item.previousState?.category === "FUNDS";
    const isItem = item.newState.category === "ITEM" || item.previousState?.category === "ITEM";

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
      <div className="flex flex-col items-center justify-center py-12 text-center border border-dashed rounded-xl border-border">
        <div className="p-3 mb-4 rounded-full bg-muted">
          <History className="w-6 h-6 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-medium text-foreground">No History Available</h3>
        <p className="max-w-sm mt-1 text-sm text-muted-foreground">
          There are no recorded changes for this transaction yet.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h3 className="flex items-center gap-2 text-lg font-semibold text-foreground">
          <History className="text-primary" size={20} />
          Audit Log
          <span className="ml-2 text-xs font-normal bg-muted text-muted-foreground px-2 py-0.5 rounded-full">
            {filteredHistory.length}
          </span>
        </h3>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search history..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          <div className="flex gap-2">
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-[140px]">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue placeholder="Filter Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Actions</SelectItem>
                {uniqueChangeTypes.map((type) => (
                  <SelectItem key={type} value={type}>
                    {type.replace(/_/g, " ")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button
              variant="outline"
              size="icon"
              onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
              title={`Sort ${sortOrder === "asc" ? "Newest first" : "Oldest first"}`}
            >
              <ArrowUpDown className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {filteredHistory.length > 0 ? (
          <div className="relative border-l-2 border-border ml-3 space-y-8 py-2">
            {filteredHistory.map((item) => (
              <div key={item.id} className="relative pl-8">
                {/* Timeline Dot */}
                <span className="absolute left-[-9px] top-0 h-4 w-4 rounded-full border-2 border-background bg-primary ring-4 ring-background" />

                <div className="flex flex-col gap-2 p-4 bg-card border rounded-lg shadow-sm border-border sm:flex-row sm:items-start sm:justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-foreground">
                        {item.changeType.replace(/_/g, " ")}
                      </span>
                      <span className="text-sm text-muted-foreground">by {item.user.name}</span>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {format(new Date(item.createdAt), "MMM d, yyyy")}
                      </span>
                      <span className="flex items-center gap-1">
                        <History className="w-3 h-3" />
                        {format(new Date(item.createdAt), "h:mm a")}
                      </span>
                    </div>
                  </div>

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => toggleExpand(item.id)}
                    className="self-start text-xs h-8"
                  >
                    {expandedItems.has(item.id) ? (
                      <>
                        Hide Details <ChevronUp className="w-3 h-3 ml-1" />
                      </>
                    ) : (
                      <>
                        View Details <ChevronDown className="w-3 h-3 ml-1" />
                      </>
                    )}
                  </Button>
                </div>

                {/* Expanded Details */}
                {expandedItems.has(item.id) && (
                  <div className="mt-3 p-4 bg-muted/50 rounded-lg text-sm border border-border animate-in fade-in slide-in-from-top-2">
                    {item.changeType === "UPDATE_POST_ACK" && (
                      <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 rounded-md border border-blue-200 dark:border-blue-800 flex items-center gap-2">
                        <History className="w-4 h-4" />
                        <p className="text-xs font-medium">
                          This update occurred after witness acknowledgement. Witnesses have been
                          notified to re-verify.
                        </p>
                      </div>
                    )}

                    {item.newState && Object.keys(item.newState).length > 0 ? (
                      <div className="rounded-md border border-border bg-background overflow-hidden">
                        <table className="w-full text-left text-sm">
                          <thead className="bg-muted text-muted-foreground">
                            <tr>
                              <th className="p-2 font-medium text-xs uppercase tracking-wider w-1/3">
                                Field
                              </th>
                              <th className="p-2 font-medium text-xs uppercase tracking-wider w-1/3">
                                Previous
                              </th>
                              <th className="p-2 font-medium text-xs uppercase tracking-wider w-1/3">
                                New
                              </th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-border">
                            {getChanges(item).map((change) => (
                              <tr
                                key={change.field}
                                className="group hover:bg-muted/30 transition-colors"
                              >
                                <td className="p-2 font-medium text-foreground capitalize">
                                  {change.field.replace(/([A-Z])/g, " $1").trim()}
                                </td>
                                <td className="p-2 text-muted-foreground font-mono text-xs">
                                  {formatValue(change.field, change.oldValue, item.previousState)}
                                </td>
                                <td className="p-2 text-primary font-semibold font-mono text-xs">
                                  {formatValue(change.field, change.newValue, item.newState)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <div className="text-muted-foreground text-xs italic">
                        No specific field changes recorded.
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="py-12 text-center text-muted-foreground">
            No history records match your search.
          </div>
        )}
      </div>
    </div>
  );
}
