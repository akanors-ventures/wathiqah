import { gql, type TypedDocumentNode } from "@apollo/client";
import type {
  CreateNoteMutation,
  CreateNoteMutationVariables,
  RemoveNoteMutation,
  RemoveNoteMutationVariables,
  UpdateNoteMutation,
  UpdateNoteMutationVariables,
  UserNotesQuery,
  UserNotesQueryVariables,
} from "@/types/__generated__/graphql";

export const USER_NOTE_FIELDS = gql`
  fragment UserNoteFields on Note {
    id
    orgId
    title
    body
    category
    createdById
    createdAt
    updatedAt
  }
`;

export const GET_USER_NOTES: TypedDocumentNode<UserNotesQuery, UserNotesQueryVariables> = gql`
  ${USER_NOTE_FIELDS}
  query UserNotes($category: String) {
    userNotes(category: $category) {
      ...UserNoteFields
    }
  }
`;

export const CREATE_NOTE: TypedDocumentNode<CreateNoteMutation, CreateNoteMutationVariables> = gql`
  ${USER_NOTE_FIELDS}
  mutation CreateNote($input: CreateNoteInput!) {
    createNote(input: $input) {
      ...UserNoteFields
    }
  }
`;

export const UPDATE_NOTE: TypedDocumentNode<UpdateNoteMutation, UpdateNoteMutationVariables> = gql`
  ${USER_NOTE_FIELDS}
  mutation UpdateNote($id: ID!, $input: UpdateNoteInput!) {
    updateNote(id: $id, input: $input) {
      ...UserNoteFields
    }
  }
`;

export const REMOVE_NOTE: TypedDocumentNode<RemoveNoteMutation, RemoveNoteMutationVariables> = gql`
  mutation RemoveNote($id: ID!) {
    removeNote(id: $id)
  }
`;
