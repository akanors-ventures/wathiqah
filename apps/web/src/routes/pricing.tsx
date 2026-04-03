import { CombinedGraphQLErrors } from "@apollo/client/errors";
import { useMutation } from "@apollo/client/react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  AlertTriangle,
  Check,
  Globe,
  Heart,
  HelpCircle,
  MessageSquare,
  Shield,
  Sparkles,
  X,
  Zap,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Footer } from "@/components/layout/Footer";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { TierBadge } from "@/components/ui/tier-badge";
import { useAuth } from "@/hooks/use-auth";
import { useGeoIP } from "@/hooks/useGeoIP";
import { useSubscription } from "@/hooks/useSubscription";
import { CREATE_CHECKOUT_SESSION } from "@/lib/apollo/queries/payment";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/utils/formatters";
import {
  BillingInterval,
  type CreateCheckoutSessionMutationVariables,
  SubscriptionTier,
} from "@/types/__generated__/graphql";
import { redirectToLogin } from "@/utils/auth";

export const Route = createFileRoute("/pricing")({
  component: PricingPage,
});

type Feature = {
  name: string;
  included: boolean;
  highlight?: boolean;
};

const CURRENCIES = [
  { code: "USD", label: "USD ($)", price: 4.99, regions: ["US", "GLOBAL"] },
  { code: "NGN", label: "NGN (₦)", price: 5000, regions: ["NG"] },
  { code: "GBP", label: "GBP (£)", price: 3.99, regions: ["GB"] },
];

const ANNUAL_PRICES: Record<string, number> = {
  USD: 49.9,
  NGN: 50000,
  GBP: 39.9,
};

function getAnnualPrice(currencyCode: string, monthlyPrice: number): number {
  // 10 months × monthly = "2 months free"; ANNUAL_PRICES provides exact negotiated prices
  return ANNUAL_PRICES[currencyCode] ?? monthlyPrice * 10;
}

function PricingPage() {
  const { user } = useAuth();
  const { isPro, loading: subLoading } = useSubscription();
  const { geoIP, loading: geoLoading, isNigeria, isUK, isVpn } = useGeoIP();
  const [selectedCurrency, setSelectedCurrency] = useState(CURRENCIES[0]);
  const [billingInterval, setBillingInterval] = useState<BillingInterval>(BillingInterval.Monthly);

  const [createCheckoutSession, { loading: checkoutLoading }] = useMutation(
    CREATE_CHECKOUT_SESSION,
    {
      onCompleted: (data: { createCheckoutSession?: { url: string } }) => {
        if (data.createCheckoutSession?.url) {
          window.location.href = data.createCheckoutSession.url;
        }
      },
      onError: (error) => {
        if (
          error.message === "Unauthorized" ||
          (CombinedGraphQLErrors.is(error) &&
            error.errors.some((e) => e.extensions?.code === "UNAUTHENTICATED"))
        ) {
          redirectToLogin();
          return;
        }
        toast.error(error.message || "Failed to initiate checkout");
      },
    },
  );

  const handleUpgrade = async () => {
    if (!user) {
      redirectToLogin();
      return;
    }

    try {
      await createCheckoutSession({
        variables: {
          tier: SubscriptionTier.Pro,
          currency: selectedCurrency.code,
          interval: billingInterval,
        } satisfies CreateCheckoutSessionMutationVariables,
      });
    } catch (_error) {
      // Error handled by onError
    }
  };

  useEffect(() => {
    if (geoIP) {
      let autoCurrency = CURRENCIES[0];
      if (isNigeria) {
        autoCurrency = CURRENCIES.find((c) => c.code === "NGN") || CURRENCIES[0];
      } else if (isUK) {
        autoCurrency = CURRENCIES.find((c) => c.code === "GBP") || CURRENCIES[0];
      }
      setSelectedCurrency(autoCurrency);
    }
  }, [geoIP, isNigeria, isUK]);

  const loading = subLoading || geoLoading || checkoutLoading;

  const tiers = [
    {
      name: "Ledger",
      tierKey: "FREE",
      price: "Free",
      description: "Perfect for individuals tracking personal transactions.",
      features: [
        { name: "Unlimited Transactions", included: true },
        { name: "Unlimited Items", included: true },
        { name: "10 Witness Requests / month", included: true },
        { name: "Basic Analytics", included: true },
        { name: "Email Notifications", included: true },
        { name: "Contact Notification SMS (10/month)", included: true, highlight: false },
        { name: "Advanced Analytics", included: false },
        { name: "Professional PDF Reports", included: false },
        { name: "Priority Support", included: false },
      ],
      buttonText: isPro ? "Current Plan" : "Get Started Free",
      buttonVariant: "outline" as const,
      highlight: false,
      active: !isPro,
    },
    {
      name: "Wathīqah Pro",
      tierKey: "PRO",
      price:
        billingInterval === BillingInterval.Annual
          ? formatCurrency(
              getAnnualPrice(selectedCurrency.code, selectedCurrency.price),
              selectedCurrency.code,
            )
          : formatCurrency(selectedCurrency.price, selectedCurrency.code),
      period: billingInterval === BillingInterval.Annual ? "/ year" : "/ month",
      perMonthEquivalent:
        billingInterval === BillingInterval.Annual
          ? formatCurrency(
              getAnnualPrice(selectedCurrency.code, selectedCurrency.price) / 12,
              selectedCurrency.code,
            )
          : null,
      description: "The ultimate tool for high-trust financial management.",
      features: [
        { name: "Everything in Ledger", included: true },
        { name: "Unlimited Witness Requests", included: true },
        { name: "Unlimited Contact Notification SMS", included: true, highlight: true },
        { name: "Advanced Financial Analytics", included: true },
        { name: "Professional PDF Reports", included: true },
        { name: "Custom Categories", included: true },
        { name: "Shared Ledger Access", included: true },
        { name: "Priority Support", included: true },
        { name: "Exclusive Supporter Badge", included: true },
      ],
      buttonText: isPro ? "Current Plan" : "Upgrade to Pro",
      buttonVariant: "default" as const,
      highlight: true,
      active: isPro,
    },
  ];

  return (
    <>
      <div className="container mx-auto py-16 px-4 max-w-6xl">
        <div className="text-center mb-8 space-y-4">
          <h1 className="text-4xl md:text-6xl font-black tracking-tight mb-4">
            Choose Your <span className="text-primary">Plan</span>
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto font-medium">
            Unlock the full power of Wathīqah and bring professional-grade accountability to your
            financial relationships.
          </p>
        </div>

        {isVpn && (
          <div className="max-w-2xl mx-auto mb-8 animate-in fade-in slide-in-from-top-4 duration-700">
            <Alert
              variant="destructive"
              className="bg-destructive/5 border-destructive/20 rounded-[32px] p-6"
            >
              <AlertTriangle className="h-5 w-5" />
              <AlertTitle className="font-black uppercase tracking-widest text-[10px] mb-2">
                VPN/Proxy Detected
              </AlertTitle>
              <AlertDescription className="text-sm font-medium">
                We've detected you're using a VPN or Proxy. Prices are shown in USD as a fallback.
                Please disable your VPN to see local pricing for your region.
              </AlertDescription>
            </Alert>
          </div>
        )}

        {/* Region Indicator */}
        <div className="flex flex-col items-center mb-8 gap-2">
          {!geoLoading && (
            <div className="inline-flex items-center bg-muted/50 px-4 py-2 rounded-2xl border border-border/50 animate-in fade-in zoom-in duration-500">
              <Globe className="w-3.5 h-3.5 mr-2 text-primary" />
              <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                Pricing for:{" "}
                <span className="text-foreground">
                  {geoIP?.countryName || selectedCurrency.label.split(" ")[0]}
                </span>
              </span>
            </div>
          )}
        </div>

        {/* Billing Interval Toggle */}
        <div className="flex justify-center mb-12">
          <div className="inline-flex items-center bg-muted/50 rounded-2xl border border-border/50 p-1.5 gap-1">
            <button
              type="button"
              onClick={() => setBillingInterval(BillingInterval.Monthly)}
              className={cn(
                "px-5 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all duration-200",
                billingInterval === BillingInterval.Monthly
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              Monthly
            </button>
            <button
              type="button"
              onClick={() => setBillingInterval(BillingInterval.Annual)}
              className={cn(
                "px-5 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all duration-200 flex items-center gap-2",
                billingInterval === BillingInterval.Annual
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              Annual
              <span className="inline-flex items-center gap-1 bg-primary/10 text-primary px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-widest">
                <Sparkles className="w-2.5 h-2.5" />2 months free
              </span>
            </button>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto mb-16">
          {tiers.map((t) => (
            <Card
              key={t.name}
              id={t.tierKey === "PRO" ? "pro-card" : undefined}
              className={cn(
                "relative flex flex-col transition-all duration-500 rounded-[40px] overflow-hidden border-2",
                t.highlight
                  ? "border-primary shadow-2xl shadow-primary/10 scale-105 z-10"
                  : "border-border/50 hover:border-border shadow-sm",
              )}
            >
              {t.highlight && (
                <div className="absolute top-0 right-0 left-0 bg-primary text-primary-foreground text-[10px] font-black uppercase tracking-[0.2em] py-2 text-center">
                  Most Popular
                </div>
              )}

              <CardHeader className={cn("pt-12 pb-8", t.highlight && "pt-14")}>
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <CardTitle className="text-2xl font-black uppercase tracking-widest flex items-center gap-2">
                      {t.name}
                      {t.active && <TierBadge tier={isPro ? "PRO" : "FREE"} showIcon={false} />}
                    </CardTitle>
                    <CardDescription className="text-sm font-medium mt-1">
                      {t.description}
                    </CardDescription>
                  </div>
                  <div
                    className={cn(
                      "p-3 rounded-2xl",
                      t.highlight ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground",
                    )}
                  >
                    {t.tierKey === "FREE" ? (
                      <Shield className="w-6 h-6" />
                    ) : (
                      <Zap className="w-6 h-6" />
                    )}
                  </div>
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-black">{t.price}</span>
                  {t.period && <span className="text-muted-foreground font-bold">{t.period}</span>}
                </div>
                {"perMonthEquivalent" in t && t.perMonthEquivalent && (
                  <p className="text-xs text-muted-foreground font-medium mt-1">
                    ≈ {t.perMonthEquivalent}/mo
                  </p>
                )}
              </CardHeader>

              <CardContent className="flex-1 space-y-6">
                <div className="space-y-3">
                  {(t.features as Feature[]).map((feature) => (
                    <div
                      key={feature.name}
                      className={cn(
                        "flex items-center gap-3",
                        feature.highlight &&
                          "bg-amber-50 dark:bg-amber-950/20 -mx-3 px-3 py-1.5 rounded-xl border border-amber-200/60 dark:border-amber-800/40",
                      )}
                    >
                      <div
                        className={cn(
                          "flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center",
                          feature.included
                            ? "bg-primary/10 text-primary"
                            : "bg-muted text-muted-foreground/40",
                        )}
                      >
                        {feature.included ? (
                          <Check className="w-3 h-3" />
                        ) : (
                          <X className="w-3 h-3" />
                        )}
                      </div>
                      <span
                        className={cn(
                          "text-sm font-medium flex-1",
                          !feature.included && "text-muted-foreground/60",
                          feature.highlight && "font-bold text-amber-700 dark:text-amber-400",
                        )}
                      >
                        {feature.name}
                      </span>
                      {feature.highlight && (
                        <span className="text-[9px] font-black uppercase tracking-widest bg-amber-500/10 text-amber-600 dark:text-amber-400 px-1.5 py-0.5 rounded-full border border-amber-200/60 dark:border-amber-800/40 shrink-0">
                          Key Feature
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>

              <CardFooter className="pb-10 pt-6">
                <Button
                  className={cn(
                    "w-full h-14 rounded-md font-black uppercase tracking-widest text-xs transition-all",
                    t.highlight &&
                      !t.active &&
                      "hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-primary/20",
                  )}
                  variant={t.buttonVariant}
                  disabled={t.active || loading}
                  onClick={t.tierKey === "PRO" && !t.active ? handleUpgrade : undefined}
                  asChild={t.tierKey === "FREE" && !t.active}
                >
                  {t.active ? (
                    <span>{t.buttonText}</span>
                  ) : t.tierKey === "FREE" ? (
                    <Link to="/"> {t.buttonText}</Link>
                  ) : (
                    <span>{t.buttonText}</span>
                  )}
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>

        {/* Contact Notification SMS Callout */}
        <div className="max-w-2xl mx-auto mb-16 animate-in fade-in slide-in-from-bottom-4 duration-700">
          <div className="rounded-[32px] border-2 border-amber-200 dark:border-amber-800/60 bg-amber-50/50 dark:bg-amber-950/10 p-8 text-center space-y-4">
            <div className="inline-flex items-center gap-2 bg-amber-500/10 text-amber-600 dark:text-amber-400 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border border-amber-200/60 dark:border-amber-800/40">
              <MessageSquare className="w-3.5 h-3.5" />
              Why People Upgrade
            </div>
            <h3 className="text-2xl font-black tracking-tight">
              Your contacts hear from you{" "}
              <span className="text-amber-600 dark:text-amber-400">automatically</span>
            </h3>
            <p className="text-muted-foreground font-medium leading-relaxed max-w-lg mx-auto">
              When you record a transaction against someone's phone number, they receive an SMS —
              even if they're not on Wathīqah.{" "}
              <strong className="text-foreground">Ledger users get 10 per month.</strong> Upgrade to
              Pro for unlimited contact notifications and full SMS witness support.
            </p>
            <Button
              variant="default"
              onClick={() => {
                if (typeof document !== "undefined") {
                  document.getElementById("pro-card")?.scrollIntoView({ behavior: "smooth" });
                }
              }}
              className="rounded-2xl font-black uppercase tracking-widest px-8"
            >
              Upgrade to Wathīqah Pro
            </Button>
          </div>
        </div>

        {/* Support Section */}
        <div className="max-w-4xl mx-auto px-0 sm:px-4">
          <Card className="bg-pink-500/5 border-2 border-pink-500/20 rounded-[32px] sm:rounded-[40px] overflow-hidden">
            <CardContent className="p-6 sm:p-12 flex flex-col md:flex-row items-center gap-8 sm:gap-12">
              <div className="flex-1 space-y-4 sm:space-y-6 text-center md:text-left">
                <div className="inline-flex items-center bg-pink-500/10 px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl sm:rounded-2xl border border-pink-500/20">
                  <Heart className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-2 text-pink-500 fill-pink-500" />
                  <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-pink-600">
                    Wathīqah Supporter
                  </span>
                </div>
                <h2 className="text-2xl sm:text-3xl font-black tracking-tight">
                  Support the <span className="text-pink-600">Vision</span>
                </h2>
                <p className="text-base sm:text-lg text-muted-foreground font-medium leading-relaxed">
                  Wathīqah is built by Akanors Ventures to bring trust and accountability to
                  financial relationships. If you find value in what we're building, consider a
                  one-time support to help us keep the service running and free for everyone.
                </p>
                <div className="flex flex-wrap gap-3 sm:gap-4 justify-center md:justify-start">
                  <div className="flex items-center gap-2 text-xs sm:text-sm font-bold text-muted-foreground">
                    <Check className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-pink-500" />
                    No Commitment
                  </div>
                  <div className="flex items-center gap-2 text-xs sm:text-sm font-bold text-muted-foreground">
                    <Check className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-pink-500" />
                    One-time Support
                  </div>
                  <div className="flex items-center gap-2 text-xs sm:text-sm font-bold text-muted-foreground">
                    <Check className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-pink-500" />
                    Exclusive Badge
                  </div>
                </div>
              </div>
              <div className="w-full md:w-auto shrink-0 flex flex-col items-center gap-4 sm:gap-6">
                <div className="text-center">
                  <p className="text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1">
                    Flexible Amount
                  </p>
                  <p className="text-3xl sm:text-4xl font-black text-pink-600">Pay what you want</p>
                </div>
                <Button
                  asChild
                  className="w-full md:w-64 h-14 sm:h-16 rounded-md bg-pink-600 hover:bg-pink-700 text-white font-black uppercase tracking-widest text-sm shadow-xl shadow-pink-600/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
                >
                  <Link to="/support">Support Now</Link>
                </Button>
                <p className="text-[9px] sm:text-[10px] text-muted-foreground font-medium max-w-[200px] text-center">
                  Secure payment via {isNigeria ? "Flutterwave" : "Lemon Squeezy"}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="mt-24 max-w-3xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-2xl font-black uppercase tracking-widest flex items-center justify-center gap-3">
              <HelpCircle className="w-6 h-6 text-primary" />
              Frequently Asked Questions
            </h2>
          </div>

          <div className="grid gap-6">
            <div className="bg-card border border-border/50 rounded-3xl p-8 space-y-2">
              <h3 className="font-bold text-lg">Do you offer localized pricing?</h3>
              <p className="text-muted-foreground font-medium">
                Yes! We automatically detect your region to show pricing in your local currency
                (USD, NGN, or GBP) to ensure Wathīqah is accessible globally.
              </p>
            </div>
            <div className="bg-card border border-border/50 rounded-3xl p-8 space-y-2">
              <h3 className="font-bold text-lg">Can I cancel my subscription?</h3>
              <p className="text-muted-foreground font-medium">
                Yes, you can cancel your subscription at any time from your account settings. You'll
                keep your Pro features until the end of your billing period.
              </p>
            </div>
            <div className="bg-card border border-border/50 rounded-3xl p-8 space-y-2">
              <h3 className="font-bold text-lg">What happens to my data if I downgrade?</h3>
              <p className="text-muted-foreground font-medium">
                Nothing! All your data stays safe. You'll simply revert to Ledger limits for new
                witness requests and lose access to Pro-only features like advanced analytics.
              </p>
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </>
  );
}
