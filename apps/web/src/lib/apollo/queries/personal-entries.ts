import { gql } from "@apollo/client";

export const PERSONAL_ENTRY_FRAGMENT = gql`
  fragment PersonalEntryFields on PersonalEntry {
    id
    type
    amount
    currency
    category
    date
    description
    createdAt
    createdById
  }
`;

export const GET_PERSONAL_ENTRIES = gql`
  ${PERSONAL_ENTRY_FRAGMENT}
  query GetPersonalEntries($filter: FilterPersonalEntryInput) {
    personalEntries(filter: $filter) {
      items {
        ...PersonalEntryFields
      }
      total
      page
      limit
    }
  }
`;

export const GET_PERSONAL_ENTRY_SUMMARY = gql`
  query GetPersonalEntrySummary($filter: FilterPersonalEntryInput) {
    personalEntrySummary(filter: $filter) {
      totalIncome
      totalExpenses
      netCashPosition
      currency
    }
  }
`;

export const CREATE_PERSONAL_ENTRY = gql`
  ${PERSONAL_ENTRY_FRAGMENT}
  mutation CreatePersonalEntry($input: CreatePersonalEntryInput!) {
    createPersonalEntry(input: $input) {
      ...PersonalEntryFields
    }
  }
`;

export const UPDATE_PERSONAL_ENTRY = gql`
  ${PERSONAL_ENTRY_FRAGMENT}
  mutation UpdatePersonalEntry($input: UpdatePersonalEntryInput!) {
    updatePersonalEntry(input: $input) {
      ...PersonalEntryFields
    }
  }
`;

export const DELETE_PERSONAL_ENTRY = gql`
  mutation DeletePersonalEntry($id: ID!) {
    deletePersonalEntry(id: $id)
  }
`;
