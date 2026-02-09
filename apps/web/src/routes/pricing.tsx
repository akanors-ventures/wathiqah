import { createFileRoute, Link } from "@tanstack/react-router";
import { Check, X, Zap, Shield, HelpCircle, Globe, AlertTriangle } from "lucide-react";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useSubscription } from "@/hooks/useSubscription";
import { useGeoIP } from "@/hooks/useGeoIP";
import { cn } from "@/lib/utils";
import { TierBadge } from "@/components/ui/tier-badge";
import { formatCurrency } from "@/lib/utils/formatters";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export const Route = createFileRoute("/pricing")({
  component: PricingPage,
});

const CURRENCIES = [
  { code: "USD", label: "USD ($)", price: 4.99, regions: ["US", "GLOBAL"] },
  { code: "NGN", label: "NGN (₦)", price: 5000, regions: ["NG"] },
  { code: "GBP", label: "GBP (£)", price: 3.99, regions: ["GB"] },
];

function PricingPage() {
  const { isPro, loading: subLoading } = useSubscription();
  const { geoIP, loading: geoLoading, isNigeria, isUK, isVpn } = useGeoIP();
  const [selectedCurrency, setSelectedCurrency] = useState(CURRENCIES[0]);

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

  const loading = subLoading || geoLoading;

  const tiers = [
    {
      name: "Basic",
      price: "Free",
      description: "Perfect for individuals tracking personal transactions.",
      features: [
        { name: "Unlimited Transactions", included: true },
        { name: "Unlimited Items", included: true },
        { name: "3 Witness Requests / month", included: true },
        { name: "Basic Analytics", included: true },
        { name: "Email Notifications", included: true },
        { name: "SMS Notifications", included: false },
        { name: "Advanced Analytics", included: false },
        { name: "Professional PDF Reports", included: false },
        { name: "Priority Support", included: false },
      ],
      buttonText: isPro ? "Current Plan" : "Already Active",
      buttonVariant: "outline" as const,
      highlight: false,
      active: !isPro,
    },
    {
      name: "Pro",
      price: formatCurrency(selectedCurrency.price, selectedCurrency.code),
      period: "/ month",
      description: "The ultimate tool for high-trust financial management.",
      features: [
        { name: "Everything in Basic", included: true },
        { name: "Unlimited Witness Requests", included: true },
        { name: "SMS Notifications", included: true },
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
    <div className="container mx-auto py-16 px-4 max-w-6xl">
      <div className="text-center mb-8 space-y-4">
        <h1 className="text-4xl md:text-6xl font-black tracking-tight mb-4">
          Upgrade to <span className="text-primary">Pro</span>
        </h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto font-medium">
          Unlock the full power of Wathȋqah and bring professional-grade accountability to your
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
      <div className="flex flex-col items-center mb-12 gap-2">
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

      <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
        {tiers.map((t) => (
          <Card
            key={t.name}
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
                    {t.active && <TierBadge tier={t.name.toUpperCase()} showIcon={false} />}
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
                  {t.name === "Basic" ? (
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
            </CardHeader>

            <CardContent className="flex-1 space-y-6">
              <div className="space-y-3">
                {t.features.map((feature) => (
                  <div key={feature.name} className="flex items-center gap-3">
                    <div
                      className={cn(
                        "flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center",
                        feature.included
                          ? "bg-primary/10 text-primary"
                          : "bg-muted text-muted-foreground/40",
                      )}
                    >
                      {feature.included ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
                    </div>
                    <span
                      className={cn(
                        "text-sm font-medium",
                        !feature.included && "text-muted-foreground/60",
                      )}
                    >
                      {feature.name}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>

            <CardFooter className="pb-10 pt-6">
              <Button
                className={cn(
                  "w-full h-14 rounded-2xl font-black uppercase tracking-widest text-xs transition-all",
                  t.highlight &&
                    !t.active &&
                    "hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-primary/20",
                )}
                variant={t.buttonVariant}
                disabled={t.active || loading}
                asChild={!t.active}
              >
                {t.active ? <span>{t.buttonText}</span> : <Link to="/pricing">{t.buttonText}</Link>}
              </Button>
            </CardFooter>
          </Card>
        ))}
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
              Yes! We automatically detect your region to show pricing in your local currency (USD,
              NGN, or GBP) to ensure Wathȋqah is accessible globally.
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
              Nothing! All your data stays safe. You'll simply revert to Basic limits for new
              witness requests and lose access to Pro-only features like advanced analytics.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
