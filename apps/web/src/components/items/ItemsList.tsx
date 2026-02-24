import { useNavigate } from "@tanstack/react-router";
import { format } from "date-fns";
import {
  ArrowDownLeft,
  ArrowRight,
  ArrowUpRight,
  CalendarDays,
  CheckCircle2,
  Package,
} from "lucide-react";
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

      <div className="hidden md:block rounded-3xl border border-border/50 bg-card overflow-hidden shadow-sm">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/30 border-b border-border/30">
              <TableHead className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 h-12 pl-6">
                Item
              </TableHead>
              <TableHead className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 h-12">
                Contact
              </TableHead>
              <TableHead className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 h-12">
                Status
              </TableHead>
              <TableHead className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 h-12">
                Quantity
              </TableHead>
              <TableHead className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 h-12">
                Last Updated
              </TableHead>
              <TableHead className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 h-12 text-right pr-6">
                Actions
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="h-32 text-center text-muted-foreground font-medium"
                >
                  Loading items...
                </TableCell>
              </TableRow>
            ) : filteredItems.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="h-32 text-center text-muted-foreground font-medium italic"
                >
                  No items found matching your criteria.
                </TableCell>
              </TableRow>
            ) : (
              filteredItems.map((item) => (
                <TableRow
                  key={item.id}
                  className="cursor-pointer hover:bg-primary/[0.02] transition-colors group border-b border-border/20"
                  onClick={() => navigate({ to: "/transactions/$id", params: { id: item.id } })}
                >
                  <TableCell className="pl-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-xl bg-primary/5 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-all duration-300">
                        <Package className="h-4 w-4" />
                      </div>
                      <span className="font-bold text-sm tracking-tight group-hover:text-primary transition-colors">
                        {item.itemName}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm font-medium text-muted-foreground">
                    {item.contactName}
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={item.status} />
                  </TableCell>
                  <TableCell className="text-sm font-black tracking-tight">
                    {item.quantity}
                  </TableCell>
                  <TableCell className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                    {format(new Date(item.lastUpdated), "MMM d, yyyy")}
                  </TableCell>
                  <TableCell className="text-right pr-6">
                    <div className="flex justify-end items-center gap-3">
                      {item.status !== "RETURNED" && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 rounded-lg text-[10px] font-black uppercase tracking-widest px-3 border border-transparent hover:border-primary/20 hover:bg-primary/5 hover:text-primary transition-all"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedItem(item);
                          }}
                        >
                          Mark Returned
                        </Button>
                      )}
                      <div className="opacity-0 group-hover:opacity-100 transition-all duration-300 group-hover:translate-x-1">
                        <ArrowRight className="h-4 w-4 text-primary" />
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
              className="group relative w-full text-left bg-card rounded-3xl border border-border/50 p-5 transition-all duration-500 hover:shadow-[0_20px_50px_rgba(0,0,0,0.08)] hover:-translate-y-1 hover:border-primary/30 cursor-pointer overflow-hidden"
              onClick={() => navigate({ to: "/transactions/$id", params: { id: item.id } })}
            >
              <div className="relative z-10">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-primary/5 rounded-2xl text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-all duration-500 shadow-sm group-hover:scale-110 group-hover:-rotate-3">
                      <Package className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-extrabold text-base text-foreground group-hover:text-primary transition-colors truncate tracking-tight">
                        {item.itemName}
                      </h3>
                      <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wider">
                        {item.contactName}
                      </p>
                    </div>
                  </div>
                  <div className="shrink-0">
                    <StatusBadge status={item.status} />
                  </div>
                </div>

                <div className="flex justify-between items-end pt-2">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">
                        Quantity
                      </span>
                      <span className="text-sm font-black text-foreground">{item.quantity}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground font-bold uppercase tracking-widest">
                      <CalendarDays className="w-3 h-3 opacity-60" />
                      {format(new Date(item.lastUpdated), "MMM d, yyyy")}
                    </div>
                  </div>
                  {item.status !== "RETURNED" && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-9 rounded-xl text-[10px] font-black uppercase tracking-widest px-4 border border-transparent hover:border-primary/20 hover:bg-primary/5 hover:text-primary transition-all"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedItem(item);
                      }}
                    >
                      Mark Returned
                    </Button>
                  )}
                </div>
              </div>
              <div className="absolute -right-8 -bottom-8 w-32 h-32 bg-primary/5 rounded-full blur-2xl group-hover:bg-primary/10 transition-colors duration-500" />
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
