import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useId, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/login")({
  component: LoginComponent,
});

function LoginComponent() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await login({ email, password });
      navigate({ to: "/" });
    } catch (err: any) {
      setError(err.message || "Failed to login");
    }
  };

  const id = useId();
  return (
    <div className="flex min-h-screen items-center justify-center bg-neutral-50 dark:bg-neutral-950 p-4">
      <div className="w-full max-w-md space-y-8 bg-white dark:bg-neutral-900 p-8 rounded-lg shadow-lg border border-neutral-200 dark:border-neutral-800">
        <div className="text-center">
          <h2 className="text-3xl font-bold tracking-tight text-neutral-900 dark:text-neutral-50">
            Sign in
          </h2>
          <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">
            Don't have an account?{" "}
            <Link
              to="/signup"
              className="font-medium text-emerald-600 hover:text-emerald-500 dark:text-emerald-400"
            >
              Sign up
            </Link>
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <Label htmlFor={`${id}-email`}>Email address</Label>
              <Input
                id={`${id}-email`}
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <div className="flex items-center justify-between">
                <Label htmlFor={`${id}-password`}>Password</Label>
                <Link
                  to="/forgot-password"
                  className="text-sm font-medium text-emerald-600 hover:text-emerald-500 dark:text-emerald-400"
                >
                  Forgot password?
                </Link>
              </div>
              <Input
                id={`${id}-password`}
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1"
              />
            </div>
          </div>

          {error && (
            <div className="text-red-500 text-sm text-center">{error}</div>
          )}

          <Button type="submit" className="w-full">
            Sign in
          </Button>
        </form>
      </div>
    </div>
  );
}
