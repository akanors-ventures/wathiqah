import { Link } from "@tanstack/react-router";
import { format } from "date-fns";
import { ArrowDownLeft, ArrowUpRight, Package, ArrowRight } from "lucide-react";
import { AssetCategory } from "@/types/__generated__/graphql";
import { formatCurrency } from "@/lib/utils/formatters";
import { cn } from "@/lib/utils";

interface TransactionCardProps {
  transaction: {
    id: string;
    type: string;
    category: AssetCategory;
    amount?: number | null;
    currency: string;
    date: string | number | Date;
    description?: string | null;
    itemName?: string | null;
    quantity?: number | null;
    returnDirection?: string | null;
    contact?: {
      name?: string | null;
    } | null;
  };
  className?: string;
}

export function TransactionCard({ transaction: tx, className }: TransactionCardProps) {
  const isPositive =
    tx.type === "GIVEN" ||
    (tx.type === "RETURNED" && tx.returnDirection === "TO_ME") ||
    tx.type === "INCOME" ||
    (tx.type === "GIFT" && tx.returnDirection === "TO_ME");

  const getTheme = () => {
    switch (tx.type) {
      case "GIVEN":
        return {
          bg: "bg-blue-500/10",
          text: "text-blue-500",
          border: "border-blue-500/20",
          gradient: "from-blue-500 via-blue-500/80 to-blue-500/60",
        };
      case "RETURNED":
        return tx.returnDirection === "TO_ME"
          ? {
              bg: "bg-emerald-500/10",
              text: "text-emerald-500",
              border: "border-emerald-500/20",
              gradient: "from-emerald-500 via-emerald-500/80 to-emerald-500/60",
            }
          : {
              bg: "bg-blue-500/10",
              text: "text-blue-500",
              border: "border-blue-500/20",
              gradient: "from-blue-500 via-blue-500/80 to-blue-500/60",
            };
      case "INCOME":
        return {
          bg: "bg-emerald-500/10",
          text: "text-emerald-500",
          border: "border-emerald-500/20",
          gradient: "from-emerald-500 via-emerald-500/80 to-emerald-500/60",
        };
      case "GIFT":
        return tx.returnDirection === "TO_ME"
          ? {
              bg: "bg-purple-500/10",
              text: "text-purple-500",
              border: "border-purple-500/20",
              gradient: "from-purple-500 via-purple-500/80 to-purple-500/60",
            }
          : {
              bg: "bg-pink-500/10",
              text: "text-pink-500",
              border: "border-pink-500/20",
              gradient: "from-pink-500 via-pink-500/80 to-pink-500/60",
            };
      default:
        return {
          bg: "bg-rose-500/10",
          text: "text-rose-500",
          border: "border-rose-500/20",
          gradient: "from-rose-500 via-rose-500/80 to-rose-500/60",
        };
    }
  };

  const theme = getTheme();

  return (
    <Link
      to="/transactions/$id"
      params={{ id: tx.id }}
      className={cn(
        "group relative flex items-center justify-between p-5 rounded-[24px] border border-border/50 bg-card transition-all duration-500 hover:shadow-[0_20px_50px_rgba(0,0,0,0.06)] hover:-translate-y-1 hover:border-primary/30",
        className,
      )}
    >
      <div className="flex items-center gap-4 min-w-0 relative z-10">
        <div className="relative shrink-0">
          <div
            className={cn(
              "flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br text-white shadow-lg transition-all duration-500 group-hover:scale-110 group-hover:-rotate-3",
              theme.gradient,
              `shadow-${theme.text.split("-")[1]}-500/20`,
            )}
          >
            {isPositive ? (
              <ArrowUpRight className="h-6 w-6" />
            ) : (
              <ArrowDownLeft className="h-6 w-6" />
            )}
          </div>
          <div className="absolute -bottom-0.5 -right-0.5 p-0.5 rounded-full bg-background border border-border/50 shadow-md">
            <div
              className={cn(
                "w-2 h-2 rounded-full ring-2 ring-background",
                isPositive ? "bg-emerald-500" : "bg-rose-500",
              )}
            />
          </div>
        </div>

        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-lg font-bold leading-none truncate group-hover:text-primary transition-colors tracking-tight">
              {tx.contact?.name || "Self"}
            </h3>
            <span
              className={cn(
                "text-[10px] px-2 py-0.5 rounded-full font-bold capitalize tracking-tight border shadow-sm transition-colors",
                theme.bg,
                theme.text,
                theme.border,
              )}
            >
              {tx.type.toLowerCase().replace(/_/g, " ")}
            </span>
          </div>
          <div className="flex items-center gap-2 text-[11px] text-muted-foreground font-medium opacity-80">
            <span>{format(new Date(tx.date as string), "MMM d, yyyy")}</span>
            <span className="w-1 h-1 rounded-full bg-border" />
            {tx.category === AssetCategory.Item ? (
              <span className="flex items-center gap-1.5 text-primary/80">
                <Package className="h-3 w-3" />
                {tx.quantity}x {tx.itemName}
              </span>
            ) : (
              <span className="truncate max-w-[180px]">{tx.description || "No description"}</span>
            )}
          </div>
        </div>
      </div>

      <div className="text-right shrink-0 flex items-center gap-3 relative z-10">
        <div className="flex flex-col items-end">
          <div className={cn("text-xl font-black tracking-tighter", theme.text)}>
            {tx.category === AssetCategory.Item ? (
              <span className="text-[10px] font-bold opacity-60">Item</span>
            ) : (
              <>
                <span className="text-sm mr-0.5 opacity-70 font-medium">
                  {isPositive ? "+" : "-"}
                </span>
                {formatCurrency(tx.amount || 0, tx.currency)}
              </>
            )}
          </div>
          <div className="text-[10px] font-bold capitalize tracking-tight opacity-40 mt-0.5">
            {tx.category.toLowerCase()}
          </div>
        </div>
        <div className="w-7 h-7 rounded-full bg-muted/50 flex items-center justify-center opacity-0 -translate-x-4 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-500">
          <ArrowRight className="w-3.5 h-3.5 text-primary" />
        </div>
      </div>

      {/* Background Glow */}
      <div
        className={cn(
          "absolute -right-20 -bottom-20 w-40 h-40 rounded-full blur-[80px] opacity-0 group-hover:opacity-10 transition-opacity duration-700",
          theme.bg,
        )}
      ></div>
    </Link>
  );
}
