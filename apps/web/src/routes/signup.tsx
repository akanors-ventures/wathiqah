import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useId, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/signup")({
  component: SignupComponent,
});

function SignupComponent() {
  const { signup } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await signup({ name, email, password });
      navigate({ to: "/" });
    } catch (err: any) {
      setError(err.message || "Failed to sign up");
    }
  };

  const id = useId();
  return (
    <div className="flex min-h-screen items-center justify-center bg-neutral-50 dark:bg-neutral-950 p-4">
      <div className="w-full max-w-md space-y-8 bg-white dark:bg-neutral-900 p-8 rounded-lg shadow-lg border border-neutral-200 dark:border-neutral-800">
        <div className="text-center">
          <h2 className="text-3xl font-bold tracking-tight text-neutral-900 dark:text-neutral-50">
            Create an account
          </h2>
          <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">
            Already have an account?{" "}
            <Link
              to="/login"
              className="font-medium text-emerald-600 hover:text-emerald-500 dark:text-emerald-400"
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
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-1"
              />
            </div>
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
              <Label htmlFor={`${id}-password`}>Password</Label>
              <Input
                id={`${id}-password`}
                type="password"
                required
                minLength={8}
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
            Sign up
          </Button>
        </form>
      </div>
    </div>
  );
}
