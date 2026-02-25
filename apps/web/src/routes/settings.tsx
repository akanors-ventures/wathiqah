import { useMutation } from "@apollo/client/react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  CalendarDays,
  Coins,
  CreditCard,
  ExternalLink,
  Eye,
  Key,
  Plus,
  Trash2,
  User,
  UserPlus,
  Zap,
} from "lucide-react";
import { useEffect, useId, useState } from "react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BrandLoader, PageLoader } from "@/components/ui/page-loader";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/hooks/use-auth";
import { useProfile } from "@/hooks/useProfile";
import { useSharedAccess } from "@/hooks/useSharedAccess";
import { useSubscription } from "@/hooks/useSubscription";
import { CANCEL_SUBSCRIPTION } from "@/lib/apollo/queries/payment";
import { cn } from "@/lib/utils";
import { authGuard } from "@/utils/auth";

const SUPPORTED_CURRENCIES = [
  { code: "NGN", name: "Nigerian Naira", symbol: "₦" },
  { code: "USD", name: "US Dollar", symbol: "$" },
  { code: "EUR", name: "Euro", symbol: "€" },
  { code: "GBP", name: "British Pound", symbol: "£" },
  { code: "CAD", name: "Canadian Dollar", symbol: "C$" },
  { code: "AED", name: "UAE Dirham", symbol: "د.إ" },
  { code: "SAR", name: "Saudi Riyal", symbol: "﷼" },
];

export const Route = createFileRoute("/settings")({
  beforeLoad: (ctx) => authGuard({ location: ctx.location }),
  component: SettingsPage,
});

export function SettingsPage() {
  const { user, loading: authLoading } = useAuth();

  if (authLoading) return <PageLoader />;
  if (!user) return <div className="p-8">Please log in to view settings.</div>;

  return (
    <div className="container mx-auto py-10 px-4 max-w-4xl">
      <h1 className="text-3xl font-bold mb-8">Account Settings</h1>

      <div className="grid gap-8">
        <BillingSection />
        <PreferencesSection />
        <SharedAccessSection />

        <div className="bg-card border border-border rounded-lg p-6 shadow-sm">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <Key className="w-5 h-5" />
            Security
          </h2>
          <p className="text-muted-foreground mb-4">Manage your password and account security.</p>
          <Button asChild variant="outline">
            <Link to="/change-password">Change Password</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}

export function BillingSection() {
  const {
    tier,
    subscription,
    loading,
    witnessUsage,
    maxWitnessesPerMonth,
    isPro,
    refetch,
    cancelAtPeriodEnd,
    currentPeriodEnd,
  } = useSubscription();

  const [showCancelDialog, setShowCancelDialog] = useState(false);

  const [cancelSubscription, { loading: cancelling }] = useMutation(CANCEL_SUBSCRIPTION, {
    onCompleted: () => {
      toast.success("Subscription cancelled successfully");
      setShowCancelDialog(false);
      refetch();
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to cancel subscription");
      setShowCancelDialog(false);
    },
  });

  const handleCancel = async () => {
    await cancelSubscription();
  };

  if (loading) {
    return (
      <div className="bg-card border border-border rounded-lg p-6 shadow-sm h-40 flex items-center justify-center">
        <BrandLoader size="md" />
      </div>
    );
  }

  const isUnlimited = maxWitnessesPerMonth === Infinity;
  const usagePercent = isUnlimited ? 0 : Math.min(100, (witnessUsage / maxWitnessesPerMonth) * 100);
  const status = subscription?.subscriptionStatus || "active";
  const statusLabel = cancelAtPeriodEnd ? "Cancelling" : status;
  const statusColor = cancelAtPeriodEnd
    ? "text-amber-600 bg-amber-500/10 border-amber-500/20 hover:bg-amber-500/20"
    : status === "active"
      ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20 hover:bg-emerald-500/20"
      : "";

  return (
    <div className="bg-card border border-border rounded-lg p-6 shadow-sm">
      <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
        <CreditCard className="w-5 h-5" />
        Subscription & Billing
      </h2>
      <p className="text-muted-foreground mb-6">
        Manage your subscription plan and view feature usage.
      </p>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Plan Details */}
        <div className="space-y-4 p-4 rounded-xl bg-muted/30 border border-border/50">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1">
                Current Plan
              </p>
              <div className="flex items-center gap-2">
                <span className="text-2xl font-black">{tier}</span>
                {isPro && (
                  <Badge
                    variant="default"
                    className="bg-primary/10 text-primary border-primary/20 hover:bg-primary/20"
                  >
                    PRO
                  </Badge>
                )}
              </div>
              {currentPeriodEnd && (
                <p className="text-xs text-muted-foreground mt-2">
                  {cancelAtPeriodEnd
                    ? `Access until ${currentPeriodEnd.toLocaleDateString()}`
                    : `Renews on ${currentPeriodEnd.toLocaleDateString()}`}
                </p>
              )}
            </div>
            <div className="text-right">
              <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1">
                Status
              </p>
              <Badge
                variant={status === "active" && !cancelAtPeriodEnd ? "default" : "secondary"}
                className={cn("uppercase", statusColor)}
              >
                {statusLabel}
              </Badge>
            </div>
          </div>

          <div className="pt-2">
            {isPro && !cancelAtPeriodEnd ? (
              <AlertDialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="destructive"
                    size="sm"
                    className="w-full font-bold"
                    disabled={cancelling}
                  >
                    {cancelling ? "Cancelling..." : "Cancel Subscription"}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Cancel Subscription?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Are you sure you want to cancel your subscription? You will lose access to Pro
                      features at the end of your billing period.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel disabled={cancelling}>Keep Subscription</AlertDialogCancel>
                    <AlertDialogAction
                      disabled={cancelling}
                      onClick={(e) => {
                        e.preventDefault();
                        handleCancel();
                      }}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      {cancelling ? "Cancelling..." : "Yes, Cancel"}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            ) : isPro && cancelAtPeriodEnd ? (
              <div className="text-sm text-center text-amber-600 font-medium bg-amber-50 p-2 rounded border border-amber-200">
                Auto-renewal disabled
              </div>
            ) : (
              <Button asChild size="sm" className="w-full font-bold">
                <Link to="/pricing">Upgrade to Pro</Link>
              </Button>
            )}
          </div>
        </div>

        {/* Usage Stats */}
        <div className="space-y-4 p-4 rounded-xl bg-muted/30 border border-border/50">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-amber-500" />
              <span className="text-sm font-bold">Witness Requests</span>
            </div>
            <span className="text-xs font-medium text-muted-foreground">
              {isUnlimited ? "Unlimited" : `${witnessUsage} / ${maxWitnessesPerMonth}`}
            </span>
          </div>

          {isUnlimited ? (
            <div className="h-2 w-full bg-emerald-500/20 rounded-full overflow-hidden relative">
              <div className="absolute inset-0 bg-emerald-500/40 animate-pulse" />
            </div>
          ) : (
            <Progress value={usagePercent} className="h-2" />
          )}

          <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
            {isUnlimited
              ? "You have unlimited witness requests on the Pro plan."
              : `You have used ${witnessUsage} of your ${maxWitnessesPerMonth} monthly witness requests.`}
          </p>
        </div>
      </div>
    </div>
  );
}

export function PreferencesSection() {
  const { user } = useAuth();
  const { updateUser, updating } = useProfile();
  const [preferredCurrency, setPreferredCurrency] = useState("NGN");
  const currencyId = useId();

  useEffect(() => {
    if (user?.preferredCurrency) {
      setPreferredCurrency(user.preferredCurrency);
    }
  }, [user?.preferredCurrency]);

  const handleUpdateCurrency = async (currency: string) => {
    try {
      setPreferredCurrency(currency);
      await updateUser({
        preferredCurrency: currency,
      });
      toast.success("Preferred currency updated");
    } catch (error) {
      console.error("Error updating currency:", error);
      toast.error("Failed to update currency");
    }
  };

  return (
    <div className="bg-card border border-border rounded-lg p-6 shadow-sm">
      <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
        <Coins className="w-5 h-5" />
        Preferences
      </h2>
      <p className="text-muted-foreground mb-6">
        Customize how the application behaves for your account.
      </p>

      <div className="max-w-md space-y-4">
        <div className="space-y-2">
          <Label htmlFor={currencyId}>Preferred Currency</Label>
          <div className="relative">
            <Coins className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground z-10" />
            <Select
              value={preferredCurrency}
              onValueChange={handleUpdateCurrency}
              disabled={updating}
            >
              <SelectTrigger id={currencyId} className="w-full pl-9">
                <SelectValue placeholder="Select currency" />
              </SelectTrigger>
              <SelectContent>
                {SUPPORTED_CURRENCIES.map((currency) => (
                  <SelectItem key={currency.code} value={currency.code}>
                    <span className="flex items-center gap-2">
                      <span className="font-mono font-medium">{currency.symbol}</span>
                      <span>
                        {currency.name} ({currency.code})
                      </span>
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <p className="text-xs text-muted-foreground">
            This currency will be used for your total balance calculation and dashboard overview.
          </p>
        </div>
      </div>
    </div>
  );
}

export function SharedAccessSection() {
  const {
    accessGrants,
    receivedGrants,
    loading,
    loadingReceived,
    error,
    grantAccess,
    granting,
    revokeAccess,
  } = useSharedAccess();

  const [email, setEmail] = useState("");
  const [revokingId, setRevokingId] = useState<string | null>(null);

  const grantEmailId = useId();

  const handleGrant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    try {
      await grantAccess({ email });
      setEmail("");
      toast.success(`Access granted to ${email}`);
    } catch (err) {
      console.error(err);
      if (err instanceof Error) {
        toast.error(err.message || "Failed to grant access");
      } else {
        toast.error("Failed to grant access");
      }
    }
  };

  const handleRevoke = async (id: string) => {
    if (!confirm("Are you sure you want to revoke access?")) return;
    try {
      setRevokingId(id);
      await revokeAccess(id);
      toast.success("Access revoked successfully");
    } catch (err) {
      console.error(err);
      if (err instanceof Error) {
        toast.error(err.message || "Failed to revoke access");
      } else {
        toast.error("Failed to revoke access");
      }
    } finally {
      setRevokingId(null);
    }
  };

  return (
    <div className="space-y-8">
      {/* Shared With Me Section */}
      <div className="group relative bg-card border border-border/50 rounded-[32px] p-8 transition-all duration-500 hover:shadow-[0_20px_50px_rgba(0,0,0,0.05)] overflow-hidden">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 gap-4 relative z-10">
          <div className="space-y-1">
            <h2 className="text-base font-black flex items-center gap-3 uppercase tracking-widest text-muted-foreground group-hover:text-primary transition-colors">
              <div className="p-2.5 rounded-2xl bg-primary/5 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-all duration-500 shadow-sm group-hover:rotate-3">
                <Eye className="w-5 h-5" />
              </div>
              Shared With Me
            </h2>
            <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wider pl-14">
              Profiles you have been granted read-only access to
            </p>
          </div>
        </div>

        {loadingReceived ? (
          <div className="h-32 flex items-center justify-center">
            <BrandLoader size="md" />
          </div>
        ) : (
          <div className="relative z-10">
            {receivedGrants.length === 0 ? (
              <div className="text-center py-12 bg-muted/5 rounded-3xl border-2 border-dashed border-border/50">
                <p className="text-[11px] text-muted-foreground font-bold uppercase tracking-widest">
                  No profiles shared with you yet
                </p>
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {receivedGrants.map((grant) => (
                  <div
                    key={grant.id}
                    className="group/item relative border border-border/50 rounded-3xl p-5 flex items-center justify-between bg-card transition-all duration-500 hover:shadow-[0_15px_35px_rgba(0,0,0,0.06)] hover:-translate-y-1 hover:border-primary/30 overflow-hidden"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-primary/5 flex items-center justify-center text-primary font-black text-lg shadow-sm group-hover/item:bg-primary group-hover/item:text-primary-foreground transition-all duration-500 group-hover/item:scale-110">
                        {grant.granter?.firstName?.charAt(0)?.toUpperCase() ?? "U"}
                      </div>
                      <div className="min-w-0">
                        <p className="font-extrabold text-base text-foreground group-hover/item:text-primary transition-colors tracking-tight truncate">
                          {grant.granter?.firstName} {grant.granter?.lastName}
                        </p>
                        <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest truncate">
                          {grant.granter?.email}
                        </p>
                        <div className="mt-2 flex items-center gap-2">
                          <div
                            className={cn(
                              "w-1.5 h-1.5 rounded-full animate-pulse",
                              grant.status === "ACCEPTED" ? "bg-emerald-500" : "bg-amber-500",
                            )}
                          />
                          <span
                            className={cn(
                              "text-[9px] font-black uppercase tracking-widest",
                              grant.status === "ACCEPTED" ? "text-emerald-600" : "text-amber-600",
                            )}
                          >
                            {grant.status}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {grant.status === "ACCEPTED" && (
                        <Button
                          size="sm"
                          variant="ghost"
                          asChild
                          className="h-9 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-primary/5 hover:text-primary transition-all border border-transparent hover:border-primary/20"
                        >
                          <Link to="/shared-access/view/$grantId" params={{ grantId: grant.id }}>
                            View Profile
                            <ExternalLink className="w-3.5 h-3.5 ml-2" />
                          </Link>
                        </Button>
                      )}
                      {grant.status === "PENDING" && (
                        <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest italic pr-2">
                          Check email to accept
                        </span>
                      )}
                    </div>
                    <div className="absolute -right-4 -bottom-4 w-16 h-16 bg-primary/5 rounded-full blur-2xl group-hover/item:bg-primary/10 transition-colors duration-500" />
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
        <div className="absolute -right-12 -bottom-12 w-48 h-48 bg-primary/5 rounded-full blur-3xl group-hover:bg-primary/10 transition-colors duration-500" />
      </div>

      {/* Grant Access Section */}
      <div className="group relative bg-card border border-border/50 rounded-[32px] p-8 transition-all duration-500 hover:shadow-[0_20px_50px_rgba(0,0,0,0.05)] overflow-hidden">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 gap-4 relative z-10">
          <div className="space-y-1">
            <h2 className="text-base font-black flex items-center gap-3 uppercase tracking-widest text-muted-foreground group-hover:text-primary transition-colors">
              <div className="p-2.5 rounded-2xl bg-primary/5 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-all duration-500 shadow-sm group-hover:-rotate-3">
                <UserPlus className="w-5 h-5" />
              </div>
              Share My Profile
            </h2>
            <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wider pl-14">
              Grant read-only access to your transactions and promises
            </p>
          </div>
        </div>

        <form
          onSubmit={handleGrant}
          className="flex flex-col sm:flex-row gap-4 mb-10 items-end relative z-10"
        >
          <div className="flex-1 w-full space-y-2.5">
            <Label
              htmlFor={grantEmailId}
              className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1"
            >
              Grant access to email
            </Label>
            <Input
              id={grantEmailId}
              type="email"
              placeholder="ahmad.sulaiman@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="h-12 rounded-2xl bg-muted/30 border-border/50 focus:bg-background focus:ring-primary/20 transition-all text-sm font-medium"
            />
          </div>
          <Button
            type="submit"
            isLoading={granting}
            className="h-12 px-8 rounded-2xl font-black uppercase tracking-widest text-xs shadow-lg shadow-primary/20 hover:scale-105 transition-all"
          >
            <Plus className="w-4 h-4 mr-2" />
            Grant Access
          </Button>
        </form>

        {loading ? (
          <div className="h-32 flex items-center justify-center">
            <BrandLoader size="lg" />
          </div>
        ) : error ? (
          <div className="p-6 bg-rose-500/5 text-rose-600 rounded-2xl border border-rose-500/10 text-[11px] font-bold uppercase tracking-widest text-center">
            Error loading viewers
          </div>
        ) : (
          <div className="space-y-6 relative z-10">
            <h3 className="font-black text-[10px] text-muted-foreground uppercase tracking-widest flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-primary/40" />
              Active Viewers ({accessGrants.filter((g) => g.status !== "REVOKED").length || 0})
            </h3>

            {accessGrants.length === 0 ? (
              <div className="text-center py-12 bg-muted/5 rounded-3xl border-2 border-dashed border-border/50">
                <p className="text-[11px] text-muted-foreground font-bold uppercase tracking-widest">
                  No access granted yet
                </p>
              </div>
            ) : (
              <div className="divide-y divide-border/30 rounded-3xl border border-border/30 overflow-hidden bg-background/30">
                {accessGrants.map((grant) => (
                  <div
                    key={grant.id}
                    className="group/viewer p-5 flex items-center justify-between hover:bg-primary/[0.02] transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div className="h-11 w-11 rounded-xl bg-primary/5 flex items-center justify-center text-primary group-hover/viewer:bg-primary group-hover/viewer:text-primary-foreground transition-all duration-500">
                        <User size={20} />
                      </div>
                      <div>
                        <p className="font-extrabold text-sm text-foreground group-hover/viewer:text-primary transition-colors tracking-tight">
                          {grant.email}
                        </p>
                        <div className="flex items-center gap-3 mt-1">
                          <span
                            className={cn(
                              "text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-lg",
                              grant.status === "ACCEPTED"
                                ? "bg-emerald-500/10 text-emerald-600"
                                : grant.status === "REVOKED"
                                  ? "bg-rose-500/10 text-rose-600"
                                  : "bg-amber-500/10 text-amber-600",
                            )}
                          >
                            {grant.status}
                          </span>
                          <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider flex items-center gap-1.5">
                            <CalendarDays size={12} className="opacity-60" />
                            {new Date(grant.createdAt as string).toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            })}
                          </span>
                        </div>
                      </div>
                    </div>

                    {grant.status !== "REVOKED" && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-9 w-9 rounded-xl text-rose-500 hover:text-rose-600 hover:bg-rose-500/10 transition-all border border-transparent hover:border-rose-500/20"
                        onClick={() => handleRevoke(grant.id)}
                        isLoading={revokingId === grant.id}
                      >
                        <Trash2 className="w-4 h-4" />
                        <span className="sr-only">Revoke</span>
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
        <div className="absolute -left-12 -bottom-12 w-48 h-48 bg-primary/5 rounded-full blur-3xl group-hover:bg-primary/10 transition-colors duration-500" />
      </div>
    </div>
  );
}
