import { useMutation } from "@apollo/client/react";
import { CombinedGraphQLErrors } from "@apollo/client/errors";
import { CREATE_CONTRIBUTION_SESSION } from "@/lib/apollo/queries/payment";
import { toast } from "sonner";
import type { CreateContributionSessionMutationVariables } from "@/types/__generated__/graphql";
import { useAuth } from "./use-auth";
import { redirectToLogin } from "@/utils/auth";

export function useContribution() {
  const { user } = useAuth();
  const [createContributionSession, { loading }] = useMutation(CREATE_CONTRIBUTION_SESSION, {
    onCompleted: (data) => {
      if (data.createContributionSession?.url) {
        window.location.href = data.createContributionSession.url;
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
      toast.error(error.message || "Failed to initiate contribution");
    },
  });

  const contribute = async (amount?: number, currency?: string) => {
    if (!user) {
      redirectToLogin();
      return;
    }

    try {
      await createContributionSession({
        variables: {
          amount: amount ?? null,
          currency: currency ?? null,
        } as CreateContributionSessionMutationVariables,
      });
    } catch (error) {
      console.error("Contribution error:", error);
    }
  };

  return {
    contribute,
    loading,
  };
}
