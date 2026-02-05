import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { CheckCircle2, XCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { PageLoader } from "@/components/ui/page-loader";
import { useSharedAccess } from "@/hooks/useSharedAccess";

import { authGuard } from "@/utils/auth";

export const Route = createFileRoute("/shared-access/")({
  component: SharedAccessIndex,
  beforeLoad: (ctx) => authGuard({ location: ctx.location }),
});

function SharedAccessIndex() {
  const navigate = useNavigate();
  const { acceptAccess, accepting } = useSharedAccess();
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    const handleAccept = async (token: string) => {
      try {
        await acceptAccess(token);
        setStatus("success");
        toast.success("Invitation accepted successfully!");
      } catch (err: unknown) {
        console.error(err);
        setStatus("error");
        const msg = err instanceof Error ? err.message : "Failed to accept invitation";
        setErrorMsg(msg);
        toast.error(msg);
      }
    };

    const params = new URLSearchParams(window.location.search);
    const token = params.get("token");

    if (token) {
      handleAccept(token);
    } else {
      // If no token, check if we should show something else or redirect
      navigate({ to: "/settings" });
    }
  }, [acceptAccess, navigate]);

  if (status === "idle" || accepting) {
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

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-6 text-center px-4">
      <div className="w-20 h-20 rounded-full bg-destructive/10 flex items-center justify-center">
        <XCircle className="w-10 h-10 text-destructive" />
      </div>
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">Invitation Failed</h1>
        <p className="text-muted-foreground max-w-md mx-auto">{errorMsg}</p>
      </div>
      <Button asChild variant="outline" size="lg">
        <Link to="/settings">Back to Settings</Link>
      </Button>
    </div>
  );
}
