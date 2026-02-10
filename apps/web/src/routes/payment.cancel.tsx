import { createFileRoute, Link } from "@tanstack/react-router";
import { XCircle, AlertCircle, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/payment/cancel")({
  component: PaymentCancelPage,
});

function PaymentCancelPage() {
  return (
    <div className="container mx-auto py-24 px-4 flex flex-col items-center justify-center min-h-[70vh] text-center">
      <div className="relative mb-12">
        <div className="absolute inset-0 bg-destructive/10 blur-[80px] rounded-full" />
        <div className="relative bg-card border-4 border-destructive/20 rounded-[48px] p-10 shadow-xl">
          <XCircle className="w-20 h-20 text-destructive" />
        </div>
        <div className="absolute -top-4 -right-4 bg-amber-500 text-white p-4 rounded-full shadow-lg">
          <AlertCircle className="w-8 h-8" />
        </div>
      </div>

      <h1 className="text-4xl md:text-6xl font-black tracking-tight mb-6">
        Payment <span className="text-destructive">Cancelled</span>
      </h1>
      <p className="text-xl text-muted-foreground max-w-xl mx-auto mb-12 font-medium">
        The payment process was cancelled. No charges were made to your account. If you experienced
        any issues, please let us know.
      </p>

      <div className="flex flex-col sm:flex-row gap-4 w-full max-w-md">
        <Button
          asChild
          className="flex-1 h-14 rounded-2xl font-black uppercase tracking-widest text-xs"
        >
          <Link to="/pricing">
            <ArrowLeft className="mr-2 w-4 h-4" /> Try Again
          </Link>
        </Button>
        <Button
          variant="ghost"
          asChild
          className="flex-1 h-14 rounded-2xl font-black uppercase tracking-widest text-xs"
        >
          <Link to="/">Back to Home</Link>
        </Button>
      </div>

      <div className="mt-16 p-6 bg-muted/30 rounded-3xl max-w-lg border border-border/50">
        <h3 className="font-bold mb-2">Need help?</h3>
        <p className="text-sm text-muted-foreground font-medium">
          If you're having trouble with the payment process, please contact our support team at
          support@akanors.com
        </p>
      </div>
    </div>
  );
}
