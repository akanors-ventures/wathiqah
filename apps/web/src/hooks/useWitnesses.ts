import { useMutation, useQuery } from "@apollo/client/react";
import {
  ACKNOWLEDGE_WITNESS,
  GET_WITNESS_INVITATION,
  MY_WITNESS_REQUESTS,
} from "@/lib/apollo/queries/witnesses";
import type { WitnessStatus } from "@/types/__generated__/graphql";

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

  const acknowledge = async (
    params: { witnessId?: string; token?: string },
    status: WitnessStatus,
  ) => {
    return mutate({
      variables: {
        input: {
          ...params,
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
