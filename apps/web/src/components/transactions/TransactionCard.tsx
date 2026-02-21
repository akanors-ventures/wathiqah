import { Link } from "@tanstack/react-router";
import { format } from "date-fns";
import { ArrowDownLeft, ArrowRight, ArrowUpRight, Package, UserCircle } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { SupporterBadge } from "@/components/ui/supporter-badge";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/utils/formatters";
import { AssetCategory } from "@/types/__generated__/graphql";

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
      isSupporter?: boolean;
    } | null;
    createdBy?: {
      id: string;
      name: string;
      isSupporter?: boolean;
    } | null;
  };
  className?: string;
}

export function TransactionCard({ transaction: tx, className }: TransactionCardProps) {
  const { user } = useAuth();
  const isCreator = user?.id === tx.createdBy?.id;

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
        "group relative flex items-center justify-between p-3.5 sm:p-5 lg:p-6 rounded-[20px] sm:rounded-[24px] border border-border/50 bg-card transition-all duration-500 hover:shadow-[0_20px_50px_rgba(0,0,0,0.06)] hover:-translate-y-1 hover:border-primary/30",
        className,
      )}
    >
      <div className="flex items-center gap-3 sm:gap-4 lg:gap-5 min-w-0 relative z-10">
        <div className="relative shrink-0">
          <div
            className={cn(
              "flex h-10 w-10 sm:h-12 sm:w-12 lg:h-14 lg:w-14 items-center justify-center rounded-xl sm:rounded-2xl bg-gradient-to-br text-white shadow-lg transition-all duration-500 group-hover:scale-110 group-hover:-rotate-3",
              theme.gradient,
              `shadow-${theme.text.split("-")[1]}-500/20`,
            )}
          >
            {isPositive ? (
              <ArrowUpRight className="h-5 w-5 sm:h-6 sm:w-6 lg:h-7 lg:w-7" />
            ) : (
              <ArrowDownLeft className="h-5 w-5 sm:h-6 sm:w-6 lg:h-7 lg:w-7" />
            )}
          </div>
          <div className="absolute -bottom-0.5 -right-0.5 p-0.5 rounded-full bg-background border border-border/50 shadow-md">
            <div
              className={cn(
                "w-1.5 h-1.5 sm:w-2 sm:h-2 lg:w-2.5 lg:h-2.5 rounded-full ring-2 ring-background",
                isPositive ? "bg-emerald-500" : "bg-rose-500",
              )}
            />
          </div>
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-col gap-1 sm:gap-1.5">
            <h3 className="text-sm sm:text-lg lg:text-xl font-bold leading-tight truncate group-hover:text-primary transition-colors tracking-tight flex items-center gap-1.5">
              {isCreator ? tx.contact?.name || "Self" : tx.createdBy?.name}
              {(isCreator ? tx.contact?.isSupporter : tx.createdBy?.isSupporter) && (
                <SupporterBadge className="h-4 px-1 text-[9px]" />
              )}
            </h3>

            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
              {!isCreator && (
                <span className="flex items-center gap-1 text-[8px] sm:text-[9px] lg:text-[10px] font-bold text-amber-600 bg-amber-50 dark:bg-amber-900/20 px-1.5 py-0.5 rounded border border-amber-100 dark:border-amber-900/30 shrink-0 shadow-sm">
                  <UserCircle className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                  SHARED
                </span>
              )}
              <span
                className={cn(
                  "text-[8px] sm:text-[10px] lg:text-[11px] px-2 py-0.5 rounded-full font-bold capitalize tracking-tight border shadow-sm transition-colors shrink-0",
                  theme.bg,
                  theme.text,
                  theme.border,
                )}
              >
                {tx.type.toLowerCase().replace(/_/g, " ")}
              </span>

              <div className="flex items-center gap-1.5 sm:gap-2 text-[9px] sm:text-[11px] lg:text-xs text-muted-foreground font-medium opacity-70 ml-0.5">
                <span className="w-1 h-1 rounded-full bg-border shrink-0 hidden sm:block" />
                <span className="shrink-0">{format(new Date(tx.date as string), "MMM d")}</span>
              </div>
            </div>

            <div className="flex items-center gap-1.5 sm:gap-2 text-[9px] sm:text-[11px] lg:text-xs text-muted-foreground font-medium opacity-60">
              {tx.category === AssetCategory.Item ? (
                <span className="flex items-center gap-1 sm:gap-1.5 lg:gap-2 text-primary/80 truncate">
                  <Package className="h-2.5 w-2.5 sm:h-3 sm:w-3 lg:h-3.5 lg:w-3.5 shrink-0" />
                  <span className="truncate">
                    {tx.quantity}x {tx.itemName}
                  </span>
                </span>
              ) : (
                <span className="truncate">{tx.description || "No description"}</span>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="text-right shrink-0 flex items-center gap-2 sm:gap-3 lg:gap-5 relative z-10 ml-2 lg:ml-4">
        <div className="flex flex-col items-end">
          <div
            className={cn(
              "text-base sm:text-xl lg:text-2xl font-black tracking-tighter",
              theme.text,
            )}
          >
            {tx.category === AssetCategory.Item ? (
              <span className="text-[8px] sm:text-[10px] lg:text-[11px] font-bold opacity-60">
                Item
              </span>
            ) : (
              <>
                <span className="text-xs sm:text-sm lg:text-base mr-0.5 opacity-70 font-medium">
                  {isPositive ? "+" : "-"}
                </span>
                {formatCurrency(tx.amount || 0, tx.currency)}
              </>
            )}
          </div>
          <div className="text-[8px] sm:text-[10px] lg:text-[11px] font-bold capitalize tracking-tight opacity-40 mt-0.5">
            {tx.category.toLowerCase()}
          </div>
        </div>
        <div className="hidden sm:flex w-7 h-7 lg:w-9 lg:h-9 rounded-full bg-muted/50 items-center justify-center opacity-0 -translate-x-4 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-500">
          <ArrowRight className="w-3.5 h-3.5 lg:w-4 lg:h-4 text-primary" />
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
