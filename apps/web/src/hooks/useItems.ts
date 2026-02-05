import { useMemo } from "react";
import {
  AssetCategory,
  ReturnDirection,
  type Transaction,
  TransactionType,
} from "@/types/__generated__/graphql";
import { useAuth } from "./use-auth";
import { useTransactions } from "./useTransactions";

export interface AggregatedItem {
  id: string; // Composite ID or ID of the latest transaction
  itemName: string;
  contactName: string;
  contactId?: string | null;
  status: "LENT" | "BORROWED" | "RETURNED";
  quantity: number;
  lastUpdated: string;
  transactions: Transaction[]; // Keep track of history
}

export function useItems() {
  const { user } = useAuth();
  // We fetch all transactions and filter client-side because FilterTransactionInput doesn't support category yet
  const { transactions, loading, error, createTransaction, refetch } = useTransactions();

  const items = useMemo(() => {
    const itemMap = new Map<string, AggregatedItem>();

    transactions
      .filter((tx) => tx.category === AssetCategory.Item)
      .forEach((tx) => {
        if (!tx.itemName) return;

        const isCreator = user?.id === tx.createdBy?.id;
        // For shared transactions, we need to associate with the creator as the contact
        const contactId = isCreator ? tx.contact?.id : tx.createdBy?.id;
        const contactName = isCreator ? tx.contact?.name : tx.createdBy?.name;

        const key = `${contactId || "unknown"}-${tx.itemName.toLowerCase().trim()}`;

        if (!itemMap.has(key)) {
          itemMap.set(key, {
            id: key,
            itemName: tx.itemName,
            contactName: contactName || "Unknown",
            contactId: contactId,
            status: "RETURNED", // Default
            quantity: 0,
            lastUpdated: tx.date as string,
            transactions: [],
          });
        }

        const item = itemMap.get(key);
        if (!item) return;

        item.transactions.push(tx as Transaction);

        // Update last updated date
        if (new Date(tx.date as string) > new Date(item.lastUpdated)) {
          item.lastUpdated = tx.date as string;
        }

        // Calculate balance with perspective flipping
        const qty = tx.quantity || 1;

        if (isCreator) {
          if (tx.type === TransactionType.Given) {
            item.quantity += qty;
          } else if (tx.type === TransactionType.Received) {
            item.quantity -= qty;
          } else if (tx.type === TransactionType.Returned || tx.type === TransactionType.Gift) {
            const dir = tx.returnDirection;
            if (dir === ReturnDirection.ToMe) {
              item.quantity -= qty;
            } else if (dir === ReturnDirection.ToContact) {
              item.quantity += qty;
            }
          }
        } else {
          // Perspective flipping for shared transactions
          if (tx.type === TransactionType.Given) {
            item.quantity -= qty; // They gave it to me -> I received
          } else if (tx.type === TransactionType.Received) {
            item.quantity += qty; // They received it from me -> I gave
          } else if (tx.type === TransactionType.Returned || tx.type === TransactionType.Gift) {
            const dir = tx.returnDirection;
            if (dir === ReturnDirection.ToMe) {
              item.quantity += qty; // They got it back -> I returned to contact
            } else if (dir === ReturnDirection.ToContact) {
              item.quantity -= qty; // They returned to me -> I got it back
            }
          }
        }
      });

    // Determine status based on net quantity
    return Array.from(itemMap.values()).map((item) => {
      if (item.quantity > 0) {
        item.status = "LENT";
      } else if (item.quantity < 0) {
        item.status = "BORROWED";
        item.quantity = Math.abs(item.quantity);
      } else {
        item.status = "RETURNED";
      }
      return item;
    });
  }, [transactions, user?.id]);

  return {
    items,
    loading,
    error,
    createTransaction,
    refetch,
  };
}
