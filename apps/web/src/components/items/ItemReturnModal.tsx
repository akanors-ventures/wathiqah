import { Loader2 } from "lucide-react";
import { useId, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { AggregatedItem } from "@/hooks/useItems";
import { useTransactions } from "@/hooks/useTransactions";
import { AssetCategory, TransactionType } from "@/types/__generated__/graphql";

interface ItemReturnModalProps {
  item: AggregatedItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function ItemReturnModal({ item, open, onOpenChange, onSuccess }: ItemReturnModalProps) {
  const { createTransaction } = useTransactions();
  const [quantity, setQuantity] = useState<number>(1);
  const [loading, setLoading] = useState(false);
  const quantityId = useId();

  if (!item) return null;

  const handleReturn = async () => {
    if (quantity > item.quantity) {
      toast.error("Cannot return more than the outstanding quantity");
      return;
    }

    setLoading(true);
    try {
      // Logic:
      // If LENT (we gave), we receive it back.
      // If BORROWED (we received), we give it back.
      const type = item.status === "LENT" ? TransactionType.Received : TransactionType.Given;

      await createTransaction({
        category: AssetCategory.Item,
        type,
        itemName: item.itemName,
        quantity,
        date: new Date().toISOString(), // Today
        contactId: item.contactId,
        description: `Returned: ${item.itemName}`,
      });

      toast.success("Item marked as returned successfully");
      onSuccess?.();
      onOpenChange(false);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Return Item</DialogTitle>
          <DialogDescription>
            Mark <strong>{item.itemName}</strong> as returned from{" "}
            <strong>{item.contactName}</strong>.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor={quantityId} className="text-right">
              Quantity
            </Label>
            <Input
              id={quantityId}
              type="number"
              value={quantity}
              onChange={(e) => setQuantity(Number.parseInt(e.target.value, 10))}
              max={item.quantity}
              min={1}
              className="col-span-3"
            />
          </div>
          <div className="text-sm text-muted-foreground text-center">
            Outstanding: {item.quantity}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleReturn} disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Confirm Return
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
