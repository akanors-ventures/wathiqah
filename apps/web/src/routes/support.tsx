import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect, useId } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useGeoIP } from "@/hooks/useGeoIP";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { formatCurrency } from "@/lib/utils/formatters";
import { Heart, Shield, Zap, Globe, AlertTriangle, Check, Loader2 } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { redirectToLogin } from "@/utils/auth";
import { z } from "zod";
import { useSupport } from "@/hooks/useSupport";

const createSupportSchema = (min: number, max: number, currencyCode: string) => {
  return z
    .number("Please enter a valid amount")
    .refine((val) => !Number.isNaN(val), "Please enter a valid amount")
    .refine((val) => val >= min, `Minimum support is ${formatCurrency(min, currencyCode)}`)
    .refine((val) => val <= max, `Maximum support is ${formatCurrency(max, currencyCode)}`);
};

export const Route = createFileRoute("/support")({
  component: SupportPage,
});

const CURRENCIES = [
  {
    code: "NGN",
    label: "NGN (₦)",
    symbol: "₦",
    options: [1000, 2500, 5000, 10000, 50000],
    min: 500,
    max: 1000000,
    regions: ["NG"],
  },
  {
    code: "USD",
    label: "USD ($)",
    symbol: "$",
    options: [5, 10, 25, 50, 100],
    min: 1,
    max: 5000,
    regions: ["US", "GLOBAL"],
  },
  {
    code: "GBP",
    label: "GBP (£)",
    symbol: "£",
    options: [5, 10, 20, 50, 100],
    min: 1,
    max: 4000,
    regions: ["GB"],
  },
];

function SupportPage() {
  const { user } = useAuth();
  const customAmountId = useId();
  const { support, loading: supporting } = useSupport();
  const { geoIP, loading: geoLoading, isNigeria, isUK, isVpn } = useGeoIP();

  const [selectedCurrency, setSelectedCurrency] = useState(CURRENCIES[1]); // Default to USD (Global)

  const [selectedAmount, setSelectedAmount] = useState<number | null>(null);
  const [customAmount, setCustomAmount] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  // Initialize currency based on GeoIP
  useEffect(() => {
    if (geoIP) {
      let autoCurrency = CURRENCIES.find((c) => c.code === "USD"); // Default global
      if (isNigeria) {
        autoCurrency = CURRENCIES.find((c) => c.code === "NGN");
      } else if (isUK) {
        autoCurrency = CURRENCIES.find((c) => c.code === "GBP");
      }
      if (autoCurrency) {
        setSelectedCurrency(autoCurrency);
        // Reset amounts when currency changes
        setSelectedAmount(null);
        setCustomAmount("");
        setError(null);
      }
    }
  }, [geoIP, isNigeria, isUK]);

  const handleAmountSelect = (amount: number) => {
    setSelectedAmount(amount);
    setCustomAmount("");
    setError(null);
  };

  const handleCustomAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    // Allow only numbers and decimals
    if (value === "" || /^\d*\.?\d{0,2}$/.test(value)) {
      setCustomAmount(value);
      setSelectedAmount(null);

      // Validate immediately or wait for submit? Let's clear error while typing
      if (error) setError(null);
    }
  };

  const validateAmount = (amount: number) => {
    const schema = createSupportSchema(
      selectedCurrency.min,
      selectedCurrency.max,
      selectedCurrency.code,
    );

    const result = schema.safeParse(amount);

    if (!result.success) {
      return result.error.issues[0].message;
    }

    return null;
  };

  const handleSubmit = async () => {
    if (!user) {
      redirectToLogin();
      return;
    }

    const amountToSupport = selectedAmount || parseFloat(customAmount);

    const validationError = validateAmount(amountToSupport);
    if (validationError) {
      setError(validationError);
      return;
    }

    try {
      await support(amountToSupport, selectedCurrency.code);
    } catch (_err) {
      toast.error("Failed to process support. Please try again.");
    }
  };

  const currentAmount = selectedAmount || (customAmount ? parseFloat(customAmount) : 0);

  return (
    <div className="container mx-auto py-12 px-4 max-w-4xl">
      <div className="text-center mb-10 space-y-4">
        <div className="inline-flex items-center justify-center p-3 bg-pink-100 dark:bg-pink-900/20 rounded-full mb-2">
          <Heart className="w-8 h-8 text-pink-600 fill-pink-600 animate-pulse" />
        </div>
        <h1 className="text-4xl md:text-5xl font-black tracking-tight">
          Support <span className="text-pink-600">Wathīqah</span>
        </h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto font-medium">
          Your support helps us build a trust-based financial ecosystem and keep the platform
          accessible to everyone.
        </p>
      </div>

      <div className="grid gap-8 md:grid-cols-[1fr_350px]">
        {/* Main Support Card */}
        <Card className="border-2 border-border/50 shadow-lg overflow-hidden rounded-[32px]">
          <CardHeader className="bg-muted/30 pb-8 pt-8 border-b">
            <CardTitle className="flex items-center justify-between">
              <span>Select Amount</span>
              {!geoLoading && (
                <div className="flex items-center gap-2 text-sm font-medium bg-background px-3 py-1.5 rounded-full border shadow-sm">
                  <Globe className="w-4 h-4 text-muted-foreground" />
                  <span>{selectedCurrency.code}</span>
                </div>
              )}
            </CardTitle>
            <CardDescription>Choose a support level or enter your own amount.</CardDescription>
          </CardHeader>

          <CardContent className="p-6 md:p-8 space-y-8">
            {isVpn && (
              <Alert variant="destructive" className="mb-6">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>VPN Detected</AlertTitle>
                <AlertDescription>
                  We detected a VPN. Currency set to USD. Disable VPN to see local options.
                </AlertDescription>
              </Alert>
            )}

            {/* Predefined Amounts */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {selectedCurrency.options.map((amount) => (
                <Button
                  key={amount}
                  type="button"
                  variant={selectedAmount === amount ? "default" : "outline"}
                  className={cn(
                    "h-16 text-lg font-bold border-2 transition-all duration-200",
                    selectedAmount === amount
                      ? "bg-pink-600 hover:bg-pink-700 border-pink-600 text-white shadow-lg scale-105"
                      : "hover:border-pink-200 hover:bg-pink-50",
                  )}
                  onClick={() => handleAmountSelect(amount)}
                >
                  {formatCurrency(amount, selectedCurrency.code)}
                </Button>
              ))}
            </div>

            {/* Custom Amount */}
            <div className="space-y-3">
              <Label htmlFor={customAmountId} className="text-base font-semibold">
                Or enter custom amount
              </Label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground font-bold">
                  {selectedCurrency.symbol}
                </span>
                <Input
                  id={customAmountId}
                  type="text"
                  inputMode="decimal"
                  placeholder="0.00"
                  value={customAmount}
                  onChange={handleCustomAmountChange}
                  className={cn(
                    "pl-10 h-14 text-lg font-bold border-2 transition-all",
                    customAmount && !error ? "border-pink-500 ring-2 ring-pink-500/20" : "",
                    error ? "border-destructive focus-visible:ring-destructive" : "",
                  )}
                />
              </div>
              {error && (
                <p className="text-sm font-medium text-destructive flex items-center gap-2 animate-in slide-in-from-top-1">
                  <AlertTriangle className="w-4 h-4" />
                  {error}
                </p>
              )}
              <p className="text-xs text-muted-foreground">
                Min: {formatCurrency(selectedCurrency.min, selectedCurrency.code)} • Max:{" "}
                {formatCurrency(selectedCurrency.max, selectedCurrency.code)}
              </p>
            </div>
          </CardContent>

          <CardFooter className="p-6 md:p-8 bg-muted/30 border-t flex flex-col gap-4">
            <Button
              size="lg"
              className="w-full h-16 text-lg font-black uppercase tracking-widest bg-pink-600 hover:bg-pink-700 shadow-xl shadow-pink-600/20"
              disabled={supporting || (!selectedAmount && !customAmount) || !!error}
              onClick={handleSubmit}
            >
              {supporting ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  Support{" "}
                  {currentAmount > 0 && formatCurrency(currentAmount, selectedCurrency.code)}
                </>
              )}
            </Button>
            <p className="text-xs text-center text-muted-foreground">
              Secure payment processing via{" "}
              {selectedCurrency.code === "NGN" ? "Flutterwave" : "Stripe/LemonSqueezy"}.
              <br />
              By supporting, you agree to our Terms of Service.
            </p>
          </CardFooter>
        </Card>

        {/* Benefits Sidebar */}
        <div className="space-y-6">
          <Card className="border-2 border-pink-100 bg-pink-50/50 dark:bg-pink-900/10 dark:border-pink-900/50">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Zap className="w-5 h-5 text-pink-600" />
                Why Support?
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-3">
                <div className="mt-1 bg-pink-100 dark:bg-pink-900/40 p-1.5 rounded-full h-fit">
                  <Shield className="w-4 h-4 text-pink-600" />
                </div>
                <div>
                  <h4 className="font-bold text-sm">Keep Wathīqah Free</h4>
                  <p className="text-xs text-muted-foreground mt-1">
                    Your support helps us maintain free tiers for users who need financial
                    accountability the most.
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <div className="mt-1 bg-pink-100 dark:bg-pink-900/40 p-1.5 rounded-full h-fit">
                  <Check className="w-4 h-4 text-pink-600" />
                </div>
                <div>
                  <h4 className="font-bold text-sm">Supporter Badge</h4>
                  <p className="text-xs text-muted-foreground mt-1">
                    Get an exclusive "Wathīqah Supporter" badge on your profile visible to your
                    contacts.
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <div className="mt-1 bg-pink-100 dark:bg-pink-900/40 p-1.5 rounded-full h-fit">
                  <Heart className="w-4 h-4 text-pink-600" />
                </div>
                <div>
                  <h4 className="font-bold text-sm">Fuel Innovation</h4>
                  <p className="text-xs text-muted-foreground mt-1">
                    Accelerate development of new features like recurring payments, multi-currency
                    wallets, and more.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="text-center">
            <p className="text-sm text-muted-foreground font-medium mb-2">Already a Pro user?</p>
            <Button
              variant="link"
              className="text-pink-600 font-bold"
              onClick={() => window.history.back()}
            >
              Return to Dashboard
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
