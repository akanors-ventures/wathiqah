import { useState, useMemo } from "react";
import { format } from "date-fns";
import {
  Search,
  Calendar,
  History,
  Filter,
  ArrowUpDown,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";

interface HistoryEntry {
  id: string;
  changeType: string;
  createdAt: string;
  user: {
    id: string;
    name: string;
    email: string;
  };
  previousState: any;
  newState: any;
}

interface HistoryViewerProps {
  history: HistoryEntry[];
}

export function HistoryViewer({ history }: HistoryViewerProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<string>("ALL");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

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
          format(new Date(item.createdAt), "PPpp")
            .toLowerCase()
            .includes(query),
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
      <div className="flex flex-col items-center justify-center py-12 text-center border border-dashed rounded-xl border-neutral-200 dark:border-neutral-800">
        <div className="p-3 mb-4 rounded-full bg-neutral-100 dark:bg-neutral-800">
          <History className="w-6 h-6 text-neutral-400" />
        </div>
        <h3 className="text-lg font-medium text-neutral-900 dark:text-white">
          No History Available
        </h3>
        <p className="max-w-sm mt-1 text-sm text-neutral-500 dark:text-neutral-400">
          There are no recorded changes for this transaction yet.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h3 className="flex items-center gap-2 text-lg font-semibold text-neutral-900 dark:text-white">
          <History className="text-emerald-600" size={20} />
          Audit Log
          <span className="ml-2 text-xs font-normal bg-neutral-100 dark:bg-neutral-800 text-neutral-500 px-2 py-0.5 rounded-full">
            {filteredHistory.length}
          </span>
        </h3>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-neutral-400" />
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
          <div className="relative border-l-2 border-neutral-200 dark:border-neutral-800 ml-3 space-y-8 py-2">
            {filteredHistory.map((item) => (
              <div key={item.id} className="relative pl-8">
                {/* Timeline Dot */}
                <span className="absolute left-[-9px] top-0 h-4 w-4 rounded-full border-2 border-white dark:border-neutral-950 bg-emerald-500 ring-4 ring-white dark:ring-neutral-950" />

                <div className="flex flex-col gap-2 p-4 bg-white border rounded-lg shadow-sm dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800 sm:flex-row sm:items-start sm:justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-neutral-900 dark:text-white">
                        {item.changeType.replace(/_/g, " ")}
                      </span>
                      <span className="text-sm text-neutral-500 dark:text-neutral-400">
                        by {item.user.name}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-neutral-500">
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
                  <div className="mt-3 p-4 bg-neutral-50 dark:bg-neutral-800/50 rounded-lg text-sm border border-neutral-100 dark:border-neutral-800 animate-in fade-in slide-in-from-top-2">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {item.previousState &&
                        Object.keys(item.previousState).length > 0 && (
                          <div>
                            <h4 className="font-semibold text-neutral-500 mb-2 text-xs uppercase tracking-wider">
                              Previous State
                            </h4>
                            <pre className="bg-white dark:bg-neutral-900 p-3 rounded border border-neutral-200 dark:border-neutral-800 overflow-x-auto text-xs font-mono">
                              {JSON.stringify(item.previousState, null, 2)}
                            </pre>
                          </div>
                        )}

                      {item.newState &&
                        Object.keys(item.newState).length > 0 && (
                          <div>
                            <h4 className="font-semibold text-emerald-600 mb-2 text-xs uppercase tracking-wider">
                              New State
                            </h4>
                            <pre className="bg-white dark:bg-neutral-900 p-3 rounded border border-neutral-200 dark:border-neutral-800 overflow-x-auto text-xs font-mono">
                              {JSON.stringify(item.newState, null, 2)}
                            </pre>
                          </div>
                        )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="py-12 text-center text-neutral-500">
            No history records match your search.
          </div>
        )}
      </div>
    </div>
  );
}
