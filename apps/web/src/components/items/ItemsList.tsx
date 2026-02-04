import { useNavigate } from "@tanstack/react-router";
import { format } from "date-fns";
import { ArrowDownLeft, ArrowRight, ArrowUpRight, CheckCircle2, Package } from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { AggregatedItem } from "@/hooks/useItems";
import { ItemReturnModal } from "./ItemReturnModal";

interface ItemsListProps {
  items: AggregatedItem[];
  isLoading: boolean;
  onRefresh: () => void;
}

export function ItemsList({ items, isLoading, onRefresh }: ItemsListProps) {
  const navigate = useNavigate();
  const [filter, setFilter] = useState<"ALL" | "LENT" | "BORROWED" | "RETURNED">("ALL");
  const [search, setSearch] = useState("");
  const [selectedItem, setSelectedItem] = useState<AggregatedItem | null>(null);

  const filteredItems = items.filter((item) => {
    const matchesFilter = filter === "ALL" || item.status === filter;
    const matchesSearch =
      item.itemName.toLowerCase().includes(search.toLowerCase()) ||
      item.contactName.toLowerCase().includes(search.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-4 justify-between">
        <Input
          placeholder="Search items or contacts..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="sm:max-w-[300px]"
        />
        <Select
          value={filter}
          onValueChange={(val: "ALL" | "LENT" | "BORROWED" | "RETURNED") => setFilter(val)}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Items</SelectItem>
            <SelectItem value="LENT">Lent Out</SelectItem>
            <SelectItem value="BORROWED">Borrowed</SelectItem>
            <SelectItem value="RETURNED">Returned</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="hidden md:block rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Item</TableHead>
              <TableHead>Contact</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Quantity</TableHead>
              <TableHead>Last Updated</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center">
                  Loading items...
                </TableCell>
              </TableRow>
            ) : filteredItems.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center">
                  No items found.
                </TableCell>
              </TableRow>
            ) : (
              filteredItems.map((item) => (
                <TableRow
                  key={item.id}
                  className="cursor-pointer hover:bg-muted/50 transition-colors group"
                  onClick={() => navigate({ to: "/transactions/$id", params: { id: item.id } })}
                >
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      <Package className="h-4 w-4 text-muted-foreground" />
                      {item.itemName}
                    </div>
                  </TableCell>
                  <TableCell>{item.contactName}</TableCell>
                  <TableCell>
                    <StatusBadge status={item.status} />
                  </TableCell>
                  <TableCell>{item.quantity}</TableCell>
                  <TableCell>{format(new Date(item.lastUpdated), "MMM d, yyyy")}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end items-center gap-2">
                      {item.status !== "RETURNED" && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedItem(item);
                          }}
                        >
                          Mark Returned
                        </Button>
                      )}
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                        <ArrowRight className="h-4 w-4 text-muted-foreground" />
                      </div>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <div className="md:hidden space-y-4">
        {isLoading ? (
          <div className="h-24 flex items-center justify-center text-muted-foreground bg-card rounded-lg border">
            Loading items...
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="h-24 flex items-center justify-center text-muted-foreground bg-card rounded-lg border">
            No items found.
          </div>
        ) : (
          filteredItems.map((item) => (
            <button
              type="button"
              key={item.id}
              className="w-full text-left bg-card rounded-lg border p-4 active:scale-[0.98] transition-transform cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/50"
              onClick={() => navigate({ to: "/transactions/$id", params: { id: item.id } })}
            >
              <div className="flex justify-between items-start mb-3">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-primary/10 rounded-full">
                    <Package className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground">{item.itemName}</h3>
                    <p className="text-xs text-muted-foreground">{item.contactName}</p>
                  </div>
                </div>
                <StatusBadge status={item.status} />
              </div>

              <div className="flex justify-between items-end">
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">
                    Quantity: <span className="text-foreground font-medium">{item.quantity}</span>
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    Updated: {format(new Date(item.lastUpdated), "MMM d, yyyy")}
                  </p>
                </div>
                {item.status !== "RETURNED" && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 text-xs"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedItem(item);
                    }}
                  >
                    Mark Returned
                  </Button>
                )}
              </div>
            </button>
          ))
        )}
      </div>

      <ItemReturnModal
        item={selectedItem}
        open={!!selectedItem}
        onOpenChange={(open) => !open && setSelectedItem(null)}
        onSuccess={onRefresh}
      />
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  if (status === "LENT") {
    return (
      <Badge variant="secondary" className="bg-orange-100 text-orange-800 hover:bg-orange-100">
        <ArrowUpRight className="mr-1 h-3 w-3" />
        Lent Out
      </Badge>
    );
  }
  if (status === "BORROWED") {
    return (
      <Badge variant="secondary" className="bg-blue-100 text-blue-800 hover:bg-blue-100">
        <ArrowDownLeft className="mr-1 h-3 w-3" />
        Borrowed
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="text-muted-foreground">
      <CheckCircle2 className="mr-1 h-3 w-3" />
      Returned
    </Badge>
  );
}
