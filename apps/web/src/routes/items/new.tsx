import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { ItemForm } from "@/components/items/ItemForm";
import { Button } from "@/components/ui/button";
import { useTransactions } from "@/hooks/useTransactions";
import type { CreateTransactionInput } from "@/types/__generated__/graphql";

export const Route = createFileRoute("/items/new")({
  component: NewItemPage,
});

function NewItemPage() {
  const navigate = useNavigate();
  const { createTransaction, creating } = useTransactions();

  const handleSubmit = async (values: CreateTransactionInput) => {
    try {
      await createTransaction(values);
      toast.success("Item transaction recorded successfully");
      navigate({ to: "/items" });
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <div className="container max-w-2xl mx-auto py-8 space-y-8">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate({ to: "/items" })}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Record Item Transaction</h1>
          <p className="text-muted-foreground">Log a new item being lent or borrowed.</p>
        </div>
      </div>

      <div className="rounded-lg border bg-card p-6 shadow-sm">
        <ItemForm onSubmit={handleSubmit} isLoading={creating} />
      </div>
    </div>
  );
}
