import { useQuery, useMutation } from "@apollo/client/react";
import type { WitnessStatus } from "@/types/__generated__/graphql";
import {
  MY_WITNESS_REQUESTS,
  ACKNOWLEDGE_WITNESS,
  GET_WITNESS_INVITATION,
} from "@/lib/apollo/queries/witnesses";

export function useMyWitnessRequests(status?: WitnessStatus) {
  const { data, loading, error, refetch } = useQuery(MY_WITNESS_REQUESTS, {
    variables: { status },
    fetchPolicy: "network-only",
  });

  return {
    requests: data?.myWitnessRequests || [],
    loading,
    error,
    refetch,
  };
}

export function useAcknowledgeWitness(onCompleted?: () => void) {
  const [mutate, { loading, error }] = useMutation(ACKNOWLEDGE_WITNESS, {
    onCompleted,
  });

  const acknowledge = async (witnessId: string, status: WitnessStatus) => {
    return mutate({
      variables: {
        input: {
          witnessId,
          status,
        },
      },
    });
  };

  return {
    acknowledge,
    loading,
    error,
  };
}

export function useWitnessInvitation(token: string) {
  const { data, loading, error } = useQuery(GET_WITNESS_INVITATION, {
    variables: { token },
    skip: !token,
  });

  return {
    invitation: data?.witnessInvitation,
    loading,
    error,
  };
}
