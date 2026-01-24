import {
  createFileRoute,
  useNavigate,
  useSearch,
} from "@tanstack/react-router";
import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Lock, CheckCircle2 } from "lucide-react";
import { z } from "zod";

const resetPasswordSearchSchema = z.object({
  token: z.string().min(1),
});

export const Route = createFileRoute("/reset-password")({
  validateSearch: (search) => resetPasswordSearchSchema.parse(search),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const { token } = useSearch({ from: "/reset-password" });
  const navigate = useNavigate();
  const { resetPassword } = useAuth();

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (newPassword.length < 8) {
      setError("Password must be at least 8 characters long");
      return;
    }

    setIsLoading(true);

    try {
      await resetPassword({ token, newPassword });
      setSuccess(true);
      setTimeout(() => {
        navigate({ to: "/login" });
      }, 3000);
    } catch (err: any) {
      setError(
        err.message || "Failed to reset password. The link may have expired.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  if (success) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-neutral-50 dark:bg-neutral-950 p-4">
        <div className="w-full max-w-md bg-white dark:bg-neutral-900 p-8 rounded-lg shadow-lg border border-neutral-200 dark:border-neutral-800 text-center">
          <div className="mx-auto w-12 h-12 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center mb-4">
            <CheckCircle2 className="w-6 h-6 text-emerald-600 dark:text-emerald-500" />
          </div>
          <h2 className="text-2xl font-bold text-neutral-900 dark:text-white mb-2">
            Password Reset Successful
          </h2>
          <p className="text-neutral-600 dark:text-neutral-400">
            Your password has been updated. Redirecting you to login...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-neutral-50 dark:bg-neutral-950 p-4">
      <div className="w-full max-w-md space-y-8 bg-white dark:bg-neutral-900 p-8 rounded-lg shadow-lg border border-neutral-200 dark:border-neutral-800">
        <div className="text-center">
          <div className="mx-auto w-12 h-12 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center mb-4">
            <Lock className="w-6 h-6 text-emerald-600 dark:text-emerald-500" />
          </div>
          <h2 className="text-2xl font-bold text-neutral-900 dark:text-white">
            Set new password
          </h2>
          <p className="mt-2 text-neutral-600 dark:text-neutral-400">
            Please enter your new password below.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="p-3 text-sm text-red-500 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 rounded-md">
              {error}
            </div>
          )}

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="new-password">New Password</Label>
              <Input
                id="new-password"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                className="bg-white dark:bg-neutral-950"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirm-password">Confirm Password</Label>
              <Input
                id="confirm-password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                className="bg-white dark:bg-neutral-950"
              />
            </div>
          </div>

          <Button
            type="submit"
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
            disabled={isLoading}
          >
            {isLoading ? "Resetting..." : "Reset Password"}
          </Button>
        </form>
      </div>
    </div>
  );
}
