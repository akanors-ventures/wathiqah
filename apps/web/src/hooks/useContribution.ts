import { useMutation } from "@apollo/client/react";
import { CREATE_CONTRIBUTION_SESSION } from "@/lib/apollo/queries/payment";
import { toast } from "sonner";
import type { CreateContributionSessionMutationVariables } from "@/types/__generated__/graphql";

export function useContribution() {
  const [createContributionSession, { loading }] = useMutation(CREATE_CONTRIBUTION_SESSION, {
    onCompleted: (data) => {
      if (data.createContributionSession?.url) {
        window.location.href = data.createContributionSession.url;
      }
    },
    onError: (error) => {
      toast.error(error.message || "Failed to initiate contribution");
    },
  });

  const contribute = async (amount?: number, currency?: string) => {
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
