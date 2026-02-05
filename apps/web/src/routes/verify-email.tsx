import { createFileRoute, Link, useSearch } from "@tanstack/react-router";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowRight,
  CheckCircle2,
  LifeBuoy,
  Mail,
  MessageCircle,
  RefreshCcw,
  XCircle,
} from "lucide-react";
import { useEffect, useId, useState } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BrandLoader } from "@/components/ui/page-loader";
import { useAuth } from "@/hooks/use-auth";

const verifyEmailSearchSchema = z.object({
  token: z.string().min(1),
});

export const Route = createFileRoute("/verify-email")({
  validateSearch: (search) => verifyEmailSearchSchema.parse(search),
  component: VerifyEmailPage,
});

function VerifyEmailPage() {
  const { token } = useSearch({ from: "/verify-email" });
  const { verifyEmail, resendVerificationEmail } = useAuth();

  const [status, setStatus] = useState<"verifying" | "success" | "error" | "already-verified">(
    "verifying",
  );
  const [error, setError] = useState("");

  // Resend logic
  const [resendEmail, setResendEmail] = useState("");
  const [resendStatus, setResendStatus] = useState<"idle" | "loading" | "success" | "error">(
    "idle",
  );

  const resendEmailId = useId();

  useEffect(() => {
    let mounted = true;

    const verify = async () => {
      try {
        await verifyEmail(token);
        if (mounted) {
          setStatus("success");
        }
      } catch (err) {
        if (mounted) {
          if (err instanceof Error && err.message.includes("already verified")) {
            setStatus("already-verified");
          } else {
            setStatus("error");
            if (err instanceof Error) {
              setError(err.message || "Failed to verify email. The link may have expired.");
            } else {
              setError("Failed to verify email. The link may have expired.");
            }
          }
        }
      }
    };

    verify();

    return () => {
      mounted = false;
    };
  }, [token, verifyEmail]);

  const handleResend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resendEmail) return;

    setResendStatus("loading");
    try {
      await resendVerificationEmail(resendEmail);
      setResendStatus("success");
      toast.success("Verification email sent! Please check your inbox.");
    } catch (_err) {
      setResendStatus("error");
      toast.error("Failed to send email. Please try again.");
    }
  };

  return (
    <div className="flex flex-1 flex-col items-center justify-center bg-background p-4 sm:p-8">
      <AnimatePresence mode="wait">
        {status === "verifying" && (
          <motion.div
            key="verifying"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.1 }}
            className="w-full max-w-md space-y-8 bg-card p-10 rounded-2xl shadow-xl border border-border text-center"
          >
            <div className="space-y-4 flex flex-col items-center py-8">
              <BrandLoader size="lg" />
              <p className="text-muted-foreground animate-pulse">Verifying your account...</p>
            </div>
          </motion.div>
        )}

        {status === "success" && (
          <motion.div
            key="success"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full max-w-md space-y-8 bg-card p-8 sm:p-10 rounded-2xl shadow-xl border border-border text-center"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: "spring", stiffness: 200, damping: 10 }}
              className="mx-auto w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mb-6"
            >
              <CheckCircle2 className="w-10 h-10 text-primary" />
            </motion.div>

            <div className="space-y-4">
              <h1 className="text-3xl font-extrabold tracking-tight text-foreground">
                Email Verified!
              </h1>
              <p className="text-lg text-muted-foreground">
                Your account is now fully activated. You can now log in and start tracking your
                finances.
              </p>
            </div>

            <Button
              asChild
              size="lg"
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold py-6 text-lg rounded-xl shadow-lg transition-all hover:scale-[1.02]"
            >
              <Link to="/login" search={{ redirectTo: undefined }}>
                Go to Dashboard
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
          </motion.div>
        )}

        {status === "already-verified" && (
          <motion.div
            key="already-verified"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-md space-y-8 bg-card p-8 sm:p-10 rounded-2xl shadow-xl border border-border text-center"
          >
            <div className="flex justify-center">
              <div className="w-24 h-24 bg-primary/10 rounded-full flex items-center justify-center">
                <CheckCircle2 className="w-12 h-12 text-primary" />
              </div>
            </div>

            <div className="space-y-4">
              <h1 className="text-3xl font-extrabold tracking-tight text-foreground">
                You're All Set!
              </h1>
              <p className="text-lg text-muted-foreground max-w-md mx-auto">
                Your email address has already been verified. We're glad to have you back! You can
                now proceed to your dashboard to manage your finances.
              </p>
            </div>

            <Button asChild className="w-full h-12 rounded-xl text-lg font-semibold" size="lg">
              <Link to="/">Go to Dashboard</Link>
            </Button>
          </motion.div>
        )}

        {status === "error" && (
          <motion.div
            key="error"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full max-w-md space-y-8 bg-card p-8 sm:p-10 rounded-2xl shadow-xl border border-border text-center"
          >
            <div className="mx-auto w-20 h-20 bg-destructive/10 rounded-full flex items-center justify-center mb-6">
              <XCircle className="w-10 h-10 text-destructive" />
            </div>

            <div className="space-y-2">
              <h2 className="text-3xl font-extrabold tracking-tight text-foreground">
                Verification Failed
              </h2>
              <p className="text-muted-foreground">{error}</p>
            </div>

            <div className="pt-6 border-t border-border">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-foreground mb-4">
                Need a new link?
              </h3>

              {resendStatus === "success" ? (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="bg-primary/10 text-primary p-4 rounded-xl text-sm flex items-center gap-3 text-left border border-primary/20"
                >
                  <Mail className="w-5 h-5 flex-shrink-0" />
                  <p>A new verification email has been sent. Please check your inbox.</p>
                </motion.div>
              ) : (
                <form onSubmit={handleResend} className="space-y-4 text-left">
                  <div className="space-y-2">
                    <Label htmlFor={resendEmailId}>Email Address</Label>
                    <Input
                      id={resendEmailId}
                      type="email"
                      placeholder="ahmad.sulaiman@example.com"
                      value={resendEmail}
                      onChange={(e) => setResendEmail(e.target.value)}
                      required
                      className="rounded-xl border-2"
                    />
                  </div>
                  <Button
                    type="submit"
                    className="w-full py-6 rounded-xl font-semibold"
                    isLoading={resendStatus === "loading"}
                  >
                    <RefreshCcw className="mr-2 h-4 w-4" />
                    Resend Link
                  </Button>
                </form>
              )}
            </div>

            <div className="pt-4 flex flex-col space-y-4">
              <Button asChild variant="ghost" className="text-muted-foreground rounded-xl">
                <Link to="/login" search={{ redirectTo: undefined }}>
                  Back to Login
                </Link>
              </Button>

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
                      href="https://wa.me/2349035541604"
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
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
