import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { motion } from "framer-motion";
import {
  ArrowRight,
  CheckCircle2,
  LifeBuoy,
  Mail,
  MessageCircle,
  RefreshCcw,
  ShieldCheck,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/signup-success")({
  validateSearch: (search: Record<string, unknown>) => ({
    email: (search.email as string) || "",
    name: (search.name as string) || "",
  }),
  component: SignupSuccessPage,
});

function SignupSuccessPage() {
  const { email, name } = Route.useSearch();
  const { resendVerificationEmail } = useAuth();
  const [isResending, setIsResending] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    if (!email) {
      navigate({ to: "/signup" });
    }
  }, [email, navigate]);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (countdown > 0) {
      timer = setTimeout(() => setCountdown(countdown - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [countdown]);

  const handleResend = async () => {
    if (countdown > 0) return;

    setIsResending(true);
    try {
      await resendVerificationEmail(email);
      toast.success("Verification email resent!");
      setCountdown(60); // 1 minute cooldown
    } catch (_err) {
      toast.error("Failed to resend verification email. Please try again later.");
    } finally {
      setIsResending(false);
    }
  };

  const steps = [
    {
      title: "Check your inbox",
      description: `We've sent a verification link to ${email}.`,
      icon: Mail,
      status: "current",
    },
    {
      title: "Verify your email",
      description: "Click the link in the email to activate your account.",
      icon: ShieldCheck,
      status: "upcoming",
    },
    {
      title: "Start using Wathīqah",
      description: "Log in and start tracking your funds and items.",
      icon: ArrowRight,
      status: "upcoming",
    },
  ];

  return (
    <div className="flex flex-1 flex-col items-center justify-center bg-background p-4 sm:p-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-2xl space-y-8 bg-card p-5 sm:p-10 rounded-2xl shadow-xl border border-border"
      >
        <div className="text-center space-y-4">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: "spring", stiffness: 200, damping: 10 }}
            className="mx-auto w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mb-6"
          >
            <CheckCircle2 className="w-10 h-10 text-primary" />
          </motion.div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground">
            Welcome aboard, {name.split(" ")[0]}!
          </h1>
          <p className="text-lg text-muted-foreground max-w-md mx-auto">
            Your account has been created successfully. We're excited to have you join Wathīqah.
          </p>
        </div>

        <div className="relative">
          <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-border" aria-hidden="true" />
          <div className="space-y-8 sm:space-y-12">
            {steps.map((step, index) => (
              <motion.div
                key={step.title}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.4 + index * 0.1 }}
                className="relative flex items-start sm:items-center group"
              >
                <div className="flex h-9 items-center" aria-hidden="true">
                  <span
                    className={`relative z-10 flex h-8 w-8 items-center justify-center rounded-full border-2 bg-background ${
                      step.status === "current" ? "border-primary" : "border-muted-foreground/30"
                    }`}
                  >
                    <step.icon
                      className={`h-4 w-4 ${
                        step.status === "current" ? "text-primary" : "text-muted-foreground/50"
                      }`}
                    />
                  </span>
                </div>
                <div className="ml-4 min-w-0 flex-1 sm:ml-6">
                  <h3
                    className={`text-sm font-semibold uppercase tracking-wide ${
                      step.status === "current" ? "text-primary" : "text-muted-foreground"
                    }`}
                  >
                    {step.title}
                  </h3>
                  <p className="text-base text-muted-foreground">{step.description}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 pt-4">
          <Button
            className="w-full sm:col-span-2 bg-primary hover:bg-primary/90 text-primary-foreground font-bold py-4 text-base rounded-xl shadow-md transition-all hover:scale-[1.01] h-auto whitespace-normal px-4"
            onClick={() => window.open(`mailto:${email}`)}
          >
            <Mail className="mr-2 h-4 w-4 shrink-0" />
            <span className="text-center">Check your email</span>
          </Button>

          <Button
            variant="outline"
            className="w-full py-4 rounded-xl border-2 h-auto whitespace-normal px-4 text-sm sm:text-base"
            onClick={handleResend}
            disabled={isResending || countdown > 0}
          >
            <RefreshCcw className={`mr-2 h-4 w-4 shrink-0 ${isResending ? "animate-spin" : ""}`} />
            <span className="text-center">
              {countdown > 0 ? `Resend in ${countdown}s` : "Resend verification email"}
            </span>
          </Button>

          <Button
            variant="ghost"
            className="w-full py-4 rounded-xl text-muted-foreground h-auto whitespace-normal px-4 text-sm sm:text-base"
            asChild
          >
            <Link to="/login" search={{ redirectTo: undefined }}>
              <span className="text-center">Already verified? Sign in</span>
            </Link>
          </Button>
        </div>

        <div className="pt-6 border-t border-border">
          <div className="flex flex-col items-center justify-center space-y-3 text-sm text-muted-foreground">
            <div className="flex items-center space-x-2">
              <LifeBuoy className="h-4 w-4" />
              <span className="font-medium">Need help?</span>
            </div>
            <div className="flex items-center space-x-4">
              <a
                href="mailto:wathiqah@akanors.com"
                className="text-primary hover:underline font-medium flex items-center gap-1.5 transition-colors"
              >
                <Mail className="h-3.5 w-3.5" />
                Email Support
              </a>
              <span className="w-1 h-1 bg-muted-foreground/30 rounded-full" />
              <a
                href="https://wa.me/2348086578680"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline font-medium flex items-center gap-1.5 transition-colors"
              >
                <MessageCircle className="h-3.5 w-3.5" />
                WhatsApp Support
              </a>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
