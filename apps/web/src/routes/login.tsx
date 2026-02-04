import { createFileRoute, Link, redirect, useNavigate } from "@tanstack/react-router";
import { useId, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BrandLoader } from "@/components/ui/page-loader";
import { PasswordInput } from "@/components/ui/password-input";
import { useAuth } from "@/hooks/use-auth";
import { isAuthenticated, parseRedirect } from "@/utils/auth";

export const Route = createFileRoute("/login")({
  validateSearch: (search: Record<string, unknown>) => ({
    redirectTo: (search.redirectTo as string) || undefined,
  }),
  beforeLoad: ({ search }) => {
    if (isAuthenticated()) {
      if (search.redirectTo) {
        const decodedRedirect = decodeURIComponent(search.redirectTo);
        if (decodedRedirect.startsWith("/") && !decodedRedirect.startsWith("//")) {
          throw redirect(parseRedirect(decodedRedirect));
        }
      }

      throw redirect({ to: "/" });
    }
  },
  component: LoginComponent,
});

function LoginComponent() {
  const { login, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { redirectTo } = Route.useSearch();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const result = await login({ email: email.trim().toLowerCase(), password });
      console.log("Login result", result);

      if (!result) {
        toast.error("Invalid credentials");
        setIsLoading(false);
        return;
      }

      toast.success("Welcome back!");
      setIsLoading(false); // Clear loading state before navigation

      if (redirectTo) {
        const decodedRedirect = decodeURIComponent(redirectTo);
        // Ensure the redirect is to a local path to prevent open redirect vulnerabilities
        if (decodedRedirect.startsWith("/") && !decodedRedirect.startsWith("//")) {
          const { to, search } = parseRedirect(decodedRedirect);
          navigate({ to, search });
          return;
        }
      }

      navigate({ to: "/" });
    } catch (err) {
      if (err instanceof Error) {
        toast.error(err.message || "Failed to login");
      } else {
        toast.error("Failed to login");
      }
      setIsLoading(false);
    }
  };

  const id = useId();

  if (authLoading && !isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center bg-background p-4">
        <BrandLoader size="lg" />
      </div>
    );
  }

  return (
    <div className="flex flex-1 items-center justify-center bg-background p-4">
      <div className="w-full max-w-md space-y-8 bg-card p-8 rounded-lg shadow-lg border border-border">
        <div className="text-center">
          <h2 className="text-3xl font-bold tracking-tight text-foreground">Sign in</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Don't have an account?{" "}
            <Link to="/signup" className="font-medium text-primary hover:text-primary/90">
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
                placeholder="ahmad.sulaiman@example.com"
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
                  className="text-sm font-medium text-primary hover:text-primary/90"
                >
                  Forgot password?
                </Link>
              </div>
              <PasswordInput
                id={`${id}-password`}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1"
              />
            </div>
          </div>

          <Button type="submit" className="w-full" isLoading={isLoading}>
            Sign in
          </Button>
        </form>
      </div>
    </div>
  );
}
