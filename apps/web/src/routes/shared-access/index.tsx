import { useMutation } from "@apollo/client/react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { CheckCircle2, XCircle } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { PageLoader } from "@/components/ui/page-loader";
import { useAuth } from "@/hooks/use-auth";
import { ACCEPT_ACCESS_MUTATION } from "@/lib/apollo/queries/shared-access";

import { authGuard, isAuthenticated, redirectToLogin } from "@/utils/auth";

export const Route = createFileRoute("/shared-access/")({
  component: SharedAccessIndex,
  beforeLoad: (ctx) => authGuard({ location: ctx.location }),
});

function SharedAccessIndex() {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const [acceptAccessMutation] = useMutation(ACCEPT_ACCESS_MUTATION);
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const called = useRef(false);

  // biome-ignore lint/correctness/useExhaustiveDependencies: must run once per mount on the token from the URL, not on identity changes of navigate/acceptAccessMutation
  useEffect(() => {
    if (called.current) return;
    called.current = true;

    const params = new URLSearchParams(window.location.search);
    const token = params.get("token");
    if (!token) {
      navigate({ to: "/settings" });
      return;
    }

    if (!isAuthenticated()) {
      redirectToLogin();
      return;
    }

    acceptAccessMutation({ variables: { token } })
      .then(() => {
        setStatus("success");
        toast.success("Invitation accepted successfully!");
      })
      .catch((err: unknown) => {
        setStatus("error");
        const msg = err instanceof Error ? err.message : "Failed to accept invitation";
        setErrorMsg(msg);
        toast.error(msg);
      });
  }, []);

  if (status === "idle") {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <PageLoader />
        <p className="mt-4 text-muted-foreground animate-pulse">Verifying invitation...</p>
      </div>
    );
  }

  if (status === "success") {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-6 text-center px-4">
        <div className="w-20 h-20 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
          <CheckCircle2 className="w-10 h-10 text-green-600 dark:text-green-400" />
        </div>
        <div className="space-y-2">
          <h1 className="text-3xl font-bold">Invitation Accepted!</h1>
          <p className="text-muted-foreground max-w-md mx-auto">
            You have successfully accepted the shared access invitation. You can now view the shared
            profile.
          </p>
        </div>
        <Button asChild size="lg">
          <Link to="/settings">Go to My Settings</Link>
        </Button>
      </div>
    );
  }

  const isWrongEmail = errorMsg.toLowerCase().includes("different email");

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-6 text-center px-4">
      <div className="w-20 h-20 rounded-full bg-destructive/10 flex items-center justify-center">
        <XCircle className="w-10 h-10 text-destructive" />
      </div>
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">Invitation Failed</h1>
        <p className="text-muted-foreground max-w-md mx-auto">
          {isWrongEmail
            ? "This invitation was sent to a different email address. Please sign out and sign in with the email that received the invitation."
            : errorMsg}
        </p>
      </div>
      <div className="flex gap-3">
        {isWrongEmail ? (
          <Button size="lg" onClick={() => logout()}>
            Sign out
          </Button>
        ) : null}
        <Button asChild variant="outline" size="lg">
          <Link to="/settings">Back to Settings</Link>
        </Button>
      </div>
    </div>
  );
}
