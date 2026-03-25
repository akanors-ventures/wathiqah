import { useMutation, useQuery } from "@apollo/client/react";
import {
  ACKNOWLEDGE_WITNESS,
  GET_WITNESS_INVITATION,
  MY_WITNESS_REQUESTS,
  REMOVE_WITNESS,
  RESEND_WITNESS_INVITATION,
} from "@/lib/apollo/queries/witnesses";
import type { FilterWitnessInput, WitnessStatus } from "@/types/__generated__/graphql";

export function useMyWitnessRequests(
  status?: WitnessStatus,
  filter?: FilterWitnessInput,
) {
  const { data, loading, error, refetch } = useQuery(MY_WITNESS_REQUESTS, {
    variables: { status, filter },
    fetchPolicy: "network-only",
  });

  return {
    requests: data?.myWitnessRequests.items || [],
    total: data?.myWitnessRequests.total ?? 0,
    page: data?.myWitnessRequests.page ?? 1,
    limit: data?.myWitnessRequests.limit ?? 25,
    loading,
    error,
    refetch,
  };
}

export function useResendWitnessInvitation(onCompleted?: () => void) {
  const [mutate, { loading, error }] = useMutation(RESEND_WITNESS_INVITATION, {
    onCompleted,
  });

  const resend = async (witnessId: string) => {
    return mutate({
      variables: { witnessId },
    });
  };

  return {
    resend,
    loading,
    error,
  };
}

export function useRemoveWitness(onCompleted?: () => void) {
  const [mutate, { loading, error }] = useMutation(REMOVE_WITNESS, {
    onCompleted,
  });

  const remove = async (witnessId: string) => {
    return mutate({
      variables: { witnessId },
    });
  };

  return {
    remove,
    loading,
    error,
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
