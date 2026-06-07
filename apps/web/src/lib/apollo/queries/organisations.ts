import { gql, type TypedDocumentNode } from "@apollo/client";
import type {
  CreateOrganisationMutation,
  CreateOrganisationMutationVariables,
  CreateOrgEventMutation,
  CreateOrgEventMutationVariables,
  CreateOrgNoteMutation,
  CreateOrgNoteMutationVariables,
  InviteMemberMutation,
  InviteMemberMutationVariables,
  MyOrganisationsQuery,
  MyOrganisationsQueryVariables,
  OrgEventCategorySuggestionsQuery,
  OrgEventCategorySuggestionsQueryVariables,
  OrgEventsQuery,
  OrgEventsQueryVariables,
  OrgNotesQuery,
  OrgNotesQueryVariables,
  OrgUpcomingEventsQuery,
  OrgUpcomingEventsQueryVariables,
  PromoteContactToOrgMutation,
  PromoteContactToOrgMutationVariables,
  RemoveMemberMutation,
  RemoveMemberMutationVariables,
  RemoveOrgEventMutation,
  RemoveOrgEventMutationVariables,
  RemoveOrgNoteMutation,
  RemoveOrgNoteMutationVariables,
  SwitchOrgContextMutation,
  SwitchOrgContextMutationVariables,
  UpdateMemberRoleMutation,
  UpdateMemberRoleMutationVariables,
  UpdateOrganisationMutation,
  UpdateOrganisationMutationVariables,
  UpdateOrgEventMutation,
  UpdateOrgEventMutationVariables,
  UpdateOrgNoteMutation,
  UpdateOrgNoteMutationVariables,
} from "@/types/__generated__/graphql";

export const ORGANISATION_FIELDS = gql`
  fragment OrganisationFields on Organisation {
    id
    name
    slug
    description
    industry
    logoUrl
    attributionMode
    createdAt
    transactionCount
    contactCount
    activeProjectCount
  }
`;

export const MY_ORGANISATIONS_QUERY: TypedDocumentNode<
  MyOrganisationsQuery,
  MyOrganisationsQueryVariables
> = gql`
  ${ORGANISATION_FIELDS}
  query MyOrganisations {
    myOrganisations {
      ...OrganisationFields
      members {
        id
        userId
        role
        joinedAt
        user {
          id
          firstName
          lastName
          email
        }
      }
    }
  }
`;

export const SWITCH_ORG_CONTEXT_MUTATION: TypedDocumentNode<
  SwitchOrgContextMutation,
  SwitchOrgContextMutationVariables
> = gql`
  mutation SwitchOrgContext($orgId: String) {
    switchOrgContext(orgId: $orgId) {
      accessToken
      refreshToken
      user {
        id
        email
        firstName
        lastName
      }
    }
  }
`;

export const CREATE_ORGANISATION_MUTATION: TypedDocumentNode<
  CreateOrganisationMutation,
  CreateOrganisationMutationVariables
> = gql`
  ${ORGANISATION_FIELDS}
  mutation CreateOrganisation($input: CreateOrganisationInput!) {
    createOrganisation(input: $input) {
      ...OrganisationFields
    }
  }
`;

export const UPDATE_ORGANISATION_MUTATION: TypedDocumentNode<
  UpdateOrganisationMutation,
  UpdateOrganisationMutationVariables
> = gql`
  ${ORGANISATION_FIELDS}
  mutation UpdateOrganisation($input: UpdateOrganisationInput!) {
    updateOrganisation(input: $input) {
      ...OrganisationFields
    }
  }
`;

export const INVITE_MEMBER_MUTATION: TypedDocumentNode<
  InviteMemberMutation,
  InviteMemberMutationVariables
> = gql`
  mutation InviteMember($input: InviteMemberInput!) {
    inviteMember(input: $input) {
      id
      userId
      role
      joinedAt
    }
  }
`;

export const UPDATE_MEMBER_ROLE_MUTATION: TypedDocumentNode<
  UpdateMemberRoleMutation,
  UpdateMemberRoleMutationVariables
> = gql`
  mutation UpdateMemberRole($memberId: ID!, $role: OrgRole!) {
    updateMemberRole(memberId: $memberId, role: $role) {
      id
      role
    }
  }
`;

export const REMOVE_MEMBER_MUTATION: TypedDocumentNode<
  RemoveMemberMutation,
  RemoveMemberMutationVariables
> = gql`
  mutation RemoveMember($memberId: ID!) {
    removeMember(memberId: $memberId)
  }
`;

export const PROMOTE_CONTACT_TO_ORG_MUTATION: TypedDocumentNode<
  PromoteContactToOrgMutation,
  PromoteContactToOrgMutationVariables
> = gql`
  mutation PromoteContactToOrg($contactId: ID!) {
    promoteContactToOrg(contactId: $contactId) {
      id
      firstName
      lastName
    }
  }
`;

// ── Events ──────────────────────────────────────────────────────────────────

export const ORG_EVENT_FIELDS = gql`
  fragment OrgEventFields on OrgEvent {
    id
    orgId
    title
    date
    endDate
    category
    notes
    isRecurring
    recurrence
    createdById
    createdAt
    updatedAt
  }
`;

export const ORG_UPCOMING_EVENTS_QUERY: TypedDocumentNode<
  OrgUpcomingEventsQuery,
  OrgUpcomingEventsQueryVariables
> = gql`
  ${ORG_EVENT_FIELDS}
  query OrgUpcomingEvents($category: String) {
    orgUpcomingEvents(category: $category) {
      ...OrgEventFields
    }
  }
`;

export const ORG_EVENTS_QUERY: TypedDocumentNode<OrgEventsQuery, OrgEventsQueryVariables> = gql`
  ${ORG_EVENT_FIELDS}
  query OrgEvents($category: String) {
    orgEvents(category: $category) {
      ...OrgEventFields
    }
  }
`;

export const ORG_EVENT_CATEGORY_SUGGESTIONS_QUERY: TypedDocumentNode<
  OrgEventCategorySuggestionsQuery,
  OrgEventCategorySuggestionsQueryVariables
> = gql`
  query OrgEventCategorySuggestions {
    orgEventCategorySuggestions
  }
`;

export const CREATE_ORG_EVENT_MUTATION: TypedDocumentNode<
  CreateOrgEventMutation,
  CreateOrgEventMutationVariables
> = gql`
  ${ORG_EVENT_FIELDS}
  mutation CreateOrgEvent($input: CreateOrgEventInput!) {
    createOrgEvent(input: $input) {
      ...OrgEventFields
    }
  }
`;

export const UPDATE_ORG_EVENT_MUTATION: TypedDocumentNode<
  UpdateOrgEventMutation,
  UpdateOrgEventMutationVariables
> = gql`
  ${ORG_EVENT_FIELDS}
  mutation UpdateOrgEvent($id: ID!, $input: UpdateOrgEventInput!) {
    updateOrgEvent(id: $id, input: $input) {
      ...OrgEventFields
    }
  }
`;

export const REMOVE_ORG_EVENT_MUTATION: TypedDocumentNode<
  RemoveOrgEventMutation,
  RemoveOrgEventMutationVariables
> = gql`
  mutation RemoveOrgEvent($id: ID!) {
    removeOrgEvent(id: $id)
  }
`;

// ── Notes ────────────────────────────────────────────────────────────────────

export const ORG_NOTE_FIELDS = gql`
  fragment OrgNoteFields on OrgNote {
    id
    orgId
    body
    category
    createdById
    createdAt
    updatedAt
  }
`;

export const ORG_NOTES_QUERY: TypedDocumentNode<OrgNotesQuery, OrgNotesQueryVariables> = gql`
  ${ORG_NOTE_FIELDS}
  query OrgNotes($category: String) {
    orgNotes(category: $category) {
      ...OrgNoteFields
    }
  }
`;

export const CREATE_ORG_NOTE_MUTATION: TypedDocumentNode<
  CreateOrgNoteMutation,
  CreateOrgNoteMutationVariables
> = gql`
  ${ORG_NOTE_FIELDS}
  mutation CreateOrgNote($input: CreateOrgNoteInput!) {
    createOrgNote(input: $input) {
      ...OrgNoteFields
    }
  }
`;

export const UPDATE_ORG_NOTE_MUTATION: TypedDocumentNode<
  UpdateOrgNoteMutation,
  UpdateOrgNoteMutationVariables
> = gql`
  ${ORG_NOTE_FIELDS}
  mutation UpdateOrgNote($id: ID!, $input: UpdateOrgNoteInput!) {
    updateOrgNote(id: $id, input: $input) {
      ...OrgNoteFields
    }
  }
`;

export const REMOVE_ORG_NOTE_MUTATION: TypedDocumentNode<
  RemoveOrgNoteMutation,
  RemoveOrgNoteMutationVariables
> = gql`
  mutation RemoveOrgNote($id: ID!) {
    removeOrgNote(id: $id)
  }
`;
