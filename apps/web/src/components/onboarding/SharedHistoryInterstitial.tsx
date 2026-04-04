import { useApolloClient, useMutation, useQuery } from "@apollo/client/react";
import { useNavigate } from "@tanstack/react-router";
import { format } from "date-fns";
import { ArrowRight, BookOpen, Package, ShieldCheck } from "lucide-react";
import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { SupporterBadge } from "@/components/ui/supporter-badge";
import { useAuth } from "@/hooks/use-auth";
import { ME_QUERY } from "@/lib/apollo/queries/auth";
import { GET_MY_CONTACT_TRANSACTIONS } from "@/lib/apollo/queries/transactions";
import { MARK_SHARED_HISTORY_SEEN_MUTATION } from "@/lib/apollo/queries/users";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/utils/formatters";
import { AssetCategory } from "@/types/__generated__/graphql";

/** Maximum number of transaction previews shown on the interstitial. */
const MAX_PREVIEW_TRANSACTIONS = 4;

function getTypeLabel(type: string): string {
  return type.toLowerCase().replace(/_/g, " ");
}

/**
 * Returns Tailwind class names for a transaction type badge.
 * Color convention:
 *   LOAN_GIVEN, REPAYMENT_MADE → Blue
 *   LOAN_RECEIVED, REPAYMENT_RECEIVED → Rose/Red
 *   ESCROWED → Emerald
 *   GIFT_RECEIVED, ADVANCE_RECEIVED, DEPOSIT_RECEIVED → Purple
 *   GIFT_GIVEN → Pink
 *   ADVANCE_PAID, DEPOSIT_PAID, REMITTED → Orange
 *   Legacy INCOME → Emerald | EXPENSE → Rose
 */
function getTypeBadgeClass(type: string): string {
  if (type === "LOAN_GIVEN" || type === "REPAYMENT_MADE") {
    return "text-blue-600 border-blue-200 bg-blue-50 dark:bg-blue-950/40 dark:border-blue-800 dark:text-blue-400";
  }
  if (type === "LOAN_RECEIVED" || type === "REPAYMENT_RECEIVED" || type === "EXPENSE") {
    return "text-red-600 border-red-200 bg-red-50 dark:bg-red-950/40 dark:border-red-800 dark:text-red-400";
  }
  if (type === "ESCROWED" || type === "INCOME") {
    return "text-emerald-600 border-emerald-200 bg-emerald-50 dark:bg-emerald-950/40 dark:border-emerald-800 dark:text-emerald-400";
  }
  if (type === "GIFT_RECEIVED" || type === "ADVANCE_RECEIVED" || type === "DEPOSIT_RECEIVED") {
    return "text-purple-600 border-purple-200 bg-purple-50 dark:bg-purple-950/40 dark:border-purple-800 dark:text-purple-400";
  }
  if (type === "GIFT_GIVEN") {
    return "text-pink-600 border-pink-200 bg-pink-50 dark:bg-pink-950/40 dark:border-pink-800 dark:text-pink-400";
  }
  if (type === "ADVANCE_PAID" || type === "DEPOSIT_PAID" || type === "REMITTED") {
    return "text-orange-600 border-orange-200 bg-orange-50 dark:bg-orange-950/40 dark:border-orange-800 dark:text-orange-400";
  }
  return "text-gray-600 border-gray-200 bg-gray-50";
}

export function SharedHistoryInterstitial() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const client = useApolloClient();
  const [isDismissing, setIsDismissing] = useState(false);

  const { data, loading } = useQuery(GET_MY_CONTACT_TRANSACTIONS);
  const [markSeenMutation] = useMutation(MARK_SHARED_HISTORY_SEEN_MUTATION);

  const transactions = data?.myContactTransactions ?? [];

  // When the query resolves with zero pre-existing transactions, silently mark
  // the flag as seen so the parent re-renders with the standard Dashboard.
  // All hooks must be declared before any conditional returns (Rules of Hooks).
  useEffect(() => {
    if (loading || transactions.length > 0 || !user) return;

    markSeenMutation()
      .then(() => {
        client.cache.writeQuery({
          query: ME_QUERY,
          data: {
            me: { ...user, hasSeenSharedHistory: true },
          },
        });
      })
      .catch(() => {
        // Silently ignore: the interstitial will re-appear on next visit, which
        // is acceptable behaviour when a transient network failure occurs.
      });
  }, [loading, transactions.length, markSeenMutation, client.cache, user]);

  // This component is only rendered by the parent when `user` is defined.
  // Guard here (after all hooks) so TypeScript narrows the type for cache writes.
  if (!user) return null;

  const preview = transactions.slice(0, MAX_PREVIEW_TRANSACTIONS);
  const remaining = transactions.length - MAX_PREVIEW_TRANSACTIONS;

  /**
   * Marks the onboarding flag in both the DB and the Apollo cache, then
   * navigates to the given destination. The cache is updated optimistically
   * before the network request so the parent unmounts this component instantly.
   */
  const handleDismiss = async (destination: "/" | "/transactions/my-contact-transactions") => {
    if (isDismissing) return;
    setIsDismissing(true);

    // Optimistic cache update: immediately hide the interstitial for the user.
    // `user` already carries `__typename` from the Apollo cache so we don't
    // re-declare it — spreading user first, then overriding the flag.
    client.cache.writeQuery({
      query: ME_QUERY,
      data: { me: { ...user, hasSeenSharedHistory: true } },
    });

    try {
      await markSeenMutation();
    } catch {
      // The optimistic update already applied. The server flag will be retried
      // on the next login via the ME_QUERY re-fetch (network-only policy in
      // AuthContext). Navigation proceeds regardless to avoid blocking the user.
    } finally {
      navigate({ to: destination });
    }
  };

  // While query is loading, render a full-page skeleton that matches the
  // interstitial layout so there is no layout shift when data arrives.
  if (loading) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4 py-12">
        <div className="w-full max-w-2xl space-y-8">
          <div className="text-center space-y-4">
            <Skeleton className="h-7 w-56 mx-auto rounded-full" />
            <Skeleton className="h-10 w-80 mx-auto" />
            <Skeleton className="h-6 w-96 mx-auto" />
          </div>
          <div className="space-y-3">
            {(["a", "b", "c"] as const).map((key) => (
              <Skeleton key={key} className="h-20 w-full rounded-2xl" />
            ))}
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <Skeleton className="h-12 flex-1 rounded-md" />
            <Skeleton className="h-12 flex-1 rounded-md" />
          </div>
        </div>
      </div>
    );
  }

  // No pre-existing transactions: render nothing while the useEffect above
  // fires the markSeen mutation and updates the Apollo cache.
  if (transactions.length === 0) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4 py-12 relative overflow-hidden">
      {/* Decorative background glows */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full -z-10 pointer-events-none">
        <div className="absolute top-[-10%] left-[-5%] w-[700px] h-[700px] bg-primary/8 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute bottom-[-10%] right-[-5%] w-[600px] h-[600px] bg-blue-500/6 rounded-full blur-[140px] animate-pulse delay-700" />
      </div>

      <div className="w-full max-w-2xl space-y-8">
        {/* Header */}
        <div className="text-center space-y-4">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-2 text-xs font-bold text-primary shadow-sm">
            <ShieldCheck className="w-3.5 h-3.5" />
            Shared Transaction History
          </div>

          <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-foreground leading-tight">
            Welcome to Wathīqah, <span className="text-primary">{user?.firstName}.</span>
          </h1>

          <p className="text-base sm:text-lg text-muted-foreground max-w-lg mx-auto leading-relaxed font-medium">
            You have{" "}
            <span className="font-black text-foreground">
              {transactions.length} {transactions.length === 1 ? "transaction" : "transactions"}
            </span>{" "}
            recorded in your name before you joined. These were documented by others who listed you
            as a contact.
          </p>
        </div>

        {/* Transaction Previews */}
        <div className="space-y-3">
          {preview.map((tx) => (
            <Card
              key={tx.id}
              className="rounded-2xl border-border/50 shadow-sm hover:border-primary/20 hover:shadow-md transition-all duration-300"
            >
              <CardContent className="p-4 sm:p-5">
                <div className="flex items-start justify-between gap-4">
                  {/* Left: creator + description */}
                  <div className="flex-1 min-w-0 space-y-1.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge
                        variant="outline"
                        className={cn(
                          "text-[10px] font-bold px-2 py-0.5 shrink-0",
                          getTypeBadgeClass(tx.type),
                        )}
                      >
                        {getTypeLabel(tx.type)}
                      </Badge>
                      <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest opacity-60">
                        {format(new Date(tx.date as string), "MMM d, yyyy")}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <span className="text-xs text-muted-foreground font-medium">Recorded by</span>
                      <span className="text-xs font-bold text-foreground flex items-center gap-1">
                        {tx.createdBy?.name}
                        {tx.createdBy?.isSupporter && (
                          <SupporterBadge className="h-3.5 px-1 text-[8px]" />
                        )}
                      </span>
                    </div>

                    {tx.description && (
                      <p className="text-xs text-muted-foreground truncate font-medium">
                        {tx.description}
                      </p>
                    )}
                  </div>

                  {/* Right: amount or item */}
                  <div className="shrink-0 text-right">
                    {tx.category === AssetCategory.Funds ? (
                      <span className="text-sm font-black text-foreground">
                        {formatCurrency(tx.amount ?? 0, tx.currency)}
                      </span>
                    ) : (
                      <div className="flex items-center gap-1.5 font-bold text-sm text-foreground justify-end">
                        <Package size={13} className="text-muted-foreground opacity-50" />
                        <span>
                          {tx.quantity}x {tx.itemName}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}

          {remaining > 0 && (
            <p className="text-center text-xs font-bold text-muted-foreground opacity-60 pt-1">
              + {remaining} more {remaining === 1 ? "transaction" : "transactions"} in your full
              history
            </p>
          )}
        </div>

        {/* CTAs */}
        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <Button
            size="lg"
            className="flex-1 h-12 rounded-md font-bold shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
            isLoading={isDismissing}
            disabled={isDismissing}
            onClick={() => handleDismiss("/transactions/my-contact-transactions")}
          >
            <BookOpen className="mr-2 h-4 w-4" />
            Review Full History
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>

          <Button
            size="lg"
            variant="outline"
            className="flex-1 h-12 rounded-md font-bold hover:bg-muted/50 transition-all"
            disabled={isDismissing}
            onClick={() => handleDismiss("/")}
          >
            Go to Dashboard
          </Button>
        </div>

        <p className="text-center text-[11px] text-muted-foreground font-medium opacity-50">
          You can always revisit your shared history from the navigation menu.
        </p>
      </div>
    </div>
  );
}
