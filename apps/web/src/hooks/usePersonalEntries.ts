import { useMutation, useQuery } from "@apollo/client/react";
import {
  CREATE_PERSONAL_ENTRY,
  DELETE_PERSONAL_ENTRY,
  GET_PERSONAL_ENTRIES,
  GET_PERSONAL_ENTRY_SUMMARY,
  UPDATE_PERSONAL_ENTRY,
} from "@/lib/apollo/queries/personal-entries";
import type {
  CreatePersonalEntryInput,
  CreatePersonalEntryMutation,
  FilterPersonalEntryInput,
  GetPersonalEntriesQuery,
  GetPersonalEntrySummaryQuery,
  UpdatePersonalEntryInput,
  UpdatePersonalEntryMutation,
} from "@/types/__generated__/graphql";

const REFETCH = [GET_PERSONAL_ENTRIES, GET_PERSONAL_ENTRY_SUMMARY];

export function usePersonalEntries(filter?: FilterPersonalEntryInput) {
  const { data, loading, error, refetch } = useQuery<GetPersonalEntriesQuery>(
    GET_PERSONAL_ENTRIES,
    { variables: { filter }, fetchPolicy: "cache-and-network" },
  );

  const [createMutation, { loading: creating }] = useMutation<CreatePersonalEntryMutation>(
    CREATE_PERSONAL_ENTRY,
    {
      refetchQueries: REFETCH,
    },
  );

  const [updateMutation, { loading: updating }] = useMutation<UpdatePersonalEntryMutation>(
    UPDATE_PERSONAL_ENTRY,
    {
      refetchQueries: REFETCH,
    },
  );

  const [deleteMutation, { loading: deleting }] = useMutation(DELETE_PERSONAL_ENTRY, {
    refetchQueries: REFETCH,
  });

  const createEntry = (input: CreatePersonalEntryInput) => createMutation({ variables: { input } });
  const updateEntry = (input: UpdatePersonalEntryInput) => updateMutation({ variables: { input } });
  const deleteEntry = (id: string) => deleteMutation({ variables: { id } });

  return {
    entries: data?.personalEntries.items ?? [],
    total: data?.personalEntries.total ?? 0,
    loading,
    error,
    refetch,
    createEntry,
    updateEntry,
    deleteEntry,
    mutating: creating || updating || deleting,
  };
}

export function usePersonalEntrySummary(filter?: FilterPersonalEntryInput) {
  const { data, loading, error, refetch } = useQuery<GetPersonalEntrySummaryQuery>(
    GET_PERSONAL_ENTRY_SUMMARY,
    {
      variables: { filter },
      fetchPolicy: "cache-and-network",
    },
  );
  return { summary: data?.personalEntrySummary, loading, error, refetch };
}
