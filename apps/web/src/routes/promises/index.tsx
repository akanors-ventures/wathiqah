import { createFileRoute } from "@tanstack/react-router";
import { Filter, Plus, Search } from "lucide-react";
import { useState } from "react";
import { PromiseCard } from "@/components/promises/PromiseCard";
import { PromiseFormDialog } from "@/components/promises/PromiseFormDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { usePromises } from "@/hooks/usePromises";
import { PromiseStatus, type Promise as PromiseType } from "@/types/__generated__/graphql";
import { authGuard } from "@/utils/auth";

export const Route = createFileRoute("/promises/")({
  component: PromisesPage,
  beforeLoad: (ctx) => authGuard({ location: ctx.location }),
});

function PromisesPage() {
  const { promises, loading } = usePromises();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");

  const filteredPromises = promises.filter((promise: PromiseType) => {
    const matchesSearch =
      promise.description.toLowerCase().includes(search.toLowerCase()) ||
      promise.promiseTo.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === "ALL" || promise.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="container mx-auto px-4 py-8 space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">My Promises</h1>
          <p className="text-muted-foreground">Track and manage your commitments to others.</p>
        </div>
        <PromiseFormDialog />
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search promises..."
            className="pl-8"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <Filter className="w-4 h-4 mr-2 text-muted-foreground" />
            <SelectValue placeholder="Filter Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Statuses</SelectItem>
            <SelectItem value={PromiseStatus.Pending}>Pending</SelectItem>
            <SelectItem value={PromiseStatus.Fulfilled}>Fulfilled</SelectItem>
            <SelectItem value={PromiseStatus.Overdue}>Overdue</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-48 rounded-lg bg-muted animate-pulse" />
          ))}
        </div>
      ) : filteredPromises.length === 0 ? (
        <div className="text-center py-12 bg-muted/30 rounded-lg border border-dashed">
          <h3 className="text-lg font-semibold mb-2">No promises found</h3>
          <p className="text-muted-foreground mb-6">
            You haven't made any promises matching your criteria.
          </p>
          <PromiseFormDialog
            trigger={
              <Button>
                <Plus className="w-4 h-4 mr-2" /> Create First Promise
              </Button>
            }
          />
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredPromises.map((promise: PromiseType) => (
            <PromiseCard key={promise.id} promise={promise} />
          ))}
        </div>
      )}
    </div>
  );
}
