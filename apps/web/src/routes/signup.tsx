import { createFileRoute, Link, redirect, useNavigate } from "@tanstack/react-router";
import { useId, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BrandLoader } from "@/components/ui/page-loader";
import { PasswordInput } from "@/components/ui/password-input";
import { useAuth } from "@/hooks/use-auth";
import { isAuthenticated } from "@/utils/auth";

export const Route = createFileRoute("/signup")({
  beforeLoad: () => {
    if (isAuthenticated()) {
      throw redirect({
        to: "/",
      });
    }
  },
  component: SignupComponent,
});

function SignupComponent() {
  const { signup, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const result = await signup({ name, email, password });
      if (!result) {
        toast.error("Failed to sign up. Please try again.");
        setIsLoading(false);
        return;
      }
      toast.success("Account created successfully!");
      navigate({
        to: "/signup-success",
        search: { email, name },
      });
    } catch (err) {
      console.error("Signup error:", err);
      if (err instanceof Error) {
        toast.error(err.message || "Failed to sign up");
      } else {
        toast.error("Failed to sign up");
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
          <h2 className="text-3xl font-bold tracking-tight text-foreground">Create an account</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link
              to="/login"
              search={{ redirectTo: undefined }}
              className="font-medium text-primary hover:text-primary/90"
            >
              Sign in
            </Link>
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <Label htmlFor={`${id}-name`}>Full Name</Label>
              <Input
                id={`${id}-name`}
                type="text"
                placeholder="Ahmad Sulaiman"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-1"
              />
              <p className="text-[0.8rem] text-muted-foreground mt-1">
                First name first, last name last.
              </p>
            </div>
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
              <Label htmlFor={`${id}-password`}>Password</Label>
              <PasswordInput
                id={`${id}-password`}
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1"
              />
            </div>
          </div>

          <Button type="submit" className="w-full" isLoading={isLoading}>
            Sign up
          </Button>
        </form>
      </div>
    </div>
  );
}
