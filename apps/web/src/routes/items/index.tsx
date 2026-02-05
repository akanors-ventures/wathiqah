import { createFileRoute, Link } from "@tanstack/react-router";
import { Plus } from "lucide-react";
import { ItemsList } from "@/components/items/ItemsList";
import { Button } from "@/components/ui/button";
import { useItems } from "@/hooks/useItems";

import { authGuard } from "@/utils/auth";

export const Route = createFileRoute("/items/")({
  component: ItemsPage,
  beforeLoad: (ctx) => authGuard({ location: ctx.location }),
});

function ItemsPage() {
  const { items, loading, refetch } = useItems();

  return (
    <div className="container mx-auto py-8 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Physical Items</h1>
          <p className="text-muted-foreground mt-2">
            Track items you have lent to others or borrowed from them.
          </p>
        </div>
        <Button asChild>
          <Link to="/items/new">
            <Plus className="mr-2 h-4 w-4" />
            Record Item
          </Link>
        </Button>
      </div>

      <ItemsList items={items} isLoading={loading} onRefresh={refetch} />
    </div>
  );
}
