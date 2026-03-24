import { useMutation, useQuery } from "@apollo/client/react";
import {
  DELETE_CONTACT,
  GET_CONTACTS,
  CREATE_CONTACT,
  UPDATE_CONTACT,
} from "@/lib/apollo/queries/contacts";
import type {
  CreateContactInput,
  FilterContactInput,
  UpdateContactInput,
} from "@/types/__generated__/graphql";

export function useContacts(filter?: FilterContactInput) {
  const { data, loading, error, refetch } = useQuery(GET_CONTACTS, {
    variables: { filter },
    fetchPolicy: "cache-and-network",
  });

  const [createContactMutation, { loading: creating }] = useMutation(CREATE_CONTACT);
  const [updateContactMutation, { loading: updating }] = useMutation(UPDATE_CONTACT);

  const [deleteContactMutation] = useMutation(DELETE_CONTACT, {
    refetchQueries: [{ query: GET_CONTACTS }],
  });

  const createContact = async (input: CreateContactInput) => {
    const result = await createContactMutation({
      variables: { createContactInput: input },
    });
    await refetch();
    return result;
  };

  const updateContact = async (input: UpdateContactInput) => {
    const result = await updateContactMutation({
      variables: { updateContactInput: input },
    });
    await refetch();
    return result;
  };

  const deleteContact = async (id: string) => {
    await deleteContactMutation({ variables: { id } });
  };

  return {
    contacts: data?.contacts.items ?? [],
    total: data?.contacts.total ?? 0,
    page: data?.contacts.page ?? 1,
    limit: data?.contacts.limit ?? 25,
    loading,
    creating,
    updating,
    error,
    createContact,
    updateContact,
    deleteContact,
    refetch,
  };
}
