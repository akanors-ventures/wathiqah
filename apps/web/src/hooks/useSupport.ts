import { useMutation } from "@apollo/client/react";
import { CombinedGraphQLErrors } from "@apollo/client/errors";
import { CREATE_SUPPORT_SESSION } from "@/lib/apollo/queries/payment";
import { toast } from "sonner";
import type { CreateSupportSessionMutationVariables } from "@/types/__generated__/graphql";
import { useAuth } from "./use-auth";
import { redirectToLogin } from "@/utils/auth";

export function useSupport() {
  const { user } = useAuth();
  const [createSupportSession, { loading }] = useMutation(CREATE_SUPPORT_SESSION, {
    onCompleted: (data) => {
      if (data.createSupportSession?.url) {
        window.location.href = data.createSupportSession.url;
      }
    },
    onError: (error) => {
      if (
        error.message === "Unauthorized" ||
        (CombinedGraphQLErrors.is(error) &&
          error.errors.some((e) => e.extensions?.code === "UNAUTHENTICATED"))
      ) {
        redirectToLogin();
        return;
      }
      toast.error(error.message || "Failed to initiate support");
    },
  });

  const support = async (amount?: number, currency?: string) => {
    if (!user) {
      redirectToLogin();
      return;
    }

    try {
      await createSupportSession({
        variables: {
          amount: amount ?? null,
          currency: currency ?? null,
        } as CreateSupportSessionMutationVariables,
      });
    } catch (error) {
      console.error("Support error:", error);
    }
  };

  return {
    support,
    loading,
  };
}
