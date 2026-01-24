import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, CheckCircle2 } from "lucide-react";

export const Route = createFileRoute("/forgot-password")({
  component: ForgotPasswordPage,
});

function ForgotPasswordPage() {
  const { forgotPassword } = useAuth();
  const [email, setEmail] = useState("");
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      await forgotPassword({ email });
      setIsSubmitted(true);
    } catch (err: any) {
      setError(err.message || "Failed to process request");
    } finally {
      setIsLoading(false);
    }
  };

  if (isSubmitted) {
    return (
      <div className="flex h-screen items-center justify-center bg-neutral-50 dark:bg-neutral-950 p-4">
      <div className="w-full max-w-md space-y-8 bg-white dark:bg-neutral-900 p-8 rounded-lg shadow-lg border border-neutral-200 dark:border-neutral-800 text-center">
          <div className="mx-auto w-12 h-12 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center mb-4">
            <CheckCircle2 className="w-6 h-6 text-emerald-600 dark:text-emerald-500" />
          </div>
          <h2 className="text-2xl font-bold text-neutral-900 dark:text-white">
            Check your email
          </h2>
          <p className="text-neutral-600 dark:text-neutral-400">
            If an account exists for <strong>{email}</strong>, we've sent
            instructions to reset your password.
          </p>
          <Button
            asChild
            className="w-full mt-6 bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            <Link to="/login">Return to Sign In</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen items-center justify-center bg-neutral-50 dark:bg-neutral-950 p-4">
      <div className="w-full max-w-md space-y-8 bg-white dark:bg-neutral-900 p-8 rounded-lg shadow-lg border border-neutral-200 dark:border-neutral-800">
        <div>
          <Link
            to="/login"
            className="inline-flex items-center text-sm text-neutral-500 hover:text-emerald-600 mb-6 transition-colors"
          >
            <ArrowLeft className="w-4 h-4 mr-1" /> Back to Sign In
          </Link>
          <h2 className="text-2xl font-bold text-neutral-900 dark:text-white">
            Reset your password
          </h2>
          <p className="mt-2 text-neutral-600 dark:text-neutral-400">
            Enter your email address and we'll send you a link to reset your
            password.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="p-3 text-sm text-red-500 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 rounded-md">
              {error}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="email">Email address</Label>
            <Input
              id="email"
              type="email"
              placeholder="name@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="bg-white dark:bg-neutral-950"
            />
          </div>

          <Button
            type="submit"
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
            disabled={isLoading}
          >
            {isLoading ? "Sending..." : "Send Reset Instructions"}
          </Button>
        </form>
      </div>
    </div>
  );
}
