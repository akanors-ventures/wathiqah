import { createFileRoute, Link } from "@tanstack/react-router";
import { CheckCircle2, PartyPopper, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useEffect } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/payment/success")({
  validateSearch: (search: Record<string, unknown>) => ({
    type: (search.type as string) || "subscription",
  }),
  component: PaymentSuccessPage,
});

function PaymentSuccessPage() {
  const { type } = Route.useSearch();
  const isContribution = type === "contribution";

  useEffect(() => {
    if (isContribution) {
      toast.success("Thank you for your contribution!", {
        description: "Your support helps us keep Wathīqah running.",
      });
    } else {
      toast.success("Welcome to Pro!", {
        description: "Your subscription has been successfully activated.",
      });
    }
  }, [isContribution]);

  return (
    <div className="container mx-auto py-24 px-4 flex flex-col items-center justify-center min-h-[70vh] text-center">
      <div className="relative mb-12">
        <div className="absolute inset-0 bg-primary/20 blur-[100px] rounded-full animate-pulse" />
        <div className="relative bg-card border-4 border-primary/20 rounded-[48px] p-10 shadow-2xl">
          <PartyPopper className="w-20 h-20 text-primary animate-bounce" />
        </div>
        <div className="absolute -top-4 -right-4 bg-emerald-500 text-white p-4 rounded-full shadow-lg">
          <CheckCircle2 className="w-8 h-8" />
        </div>
      </div>

      <h1 className="text-4xl md:text-6xl font-black tracking-tight mb-6">
        Payment <span className="text-primary">Successful!</span>
      </h1>
      <p className="text-xl text-muted-foreground max-w-xl mx-auto mb-12 font-medium">
        {isContribution
          ? "Thank you for your generous contribution. Your support helps us maintain and improve Wathīqah for everyone."
          : "Thank you for upgrading to Wathīqah Pro. Your account is now active with all professional features unlocked."}
      </p>

      <div className="flex flex-col sm:flex-row gap-4 w-full max-w-md">
        <Button
          asChild
          className="flex-1 h-14 rounded-2xl font-black uppercase tracking-widest text-xs"
        >
          <Link to="/">
            Go to Dashboard <ArrowRight className="ml-2 w-4 h-4" />
          </Link>
        </Button>
        <Button
          variant="outline"
          asChild
          className="flex-1 h-14 rounded-2xl font-black uppercase tracking-widest text-xs"
        >
          <Link to="/profile">View Profile</Link>
        </Button>
      </div>

      <p className="mt-12 text-sm text-muted-foreground font-medium italic">
        A receipt has been sent to your email address.
      </p>
    </div>
  );
}
