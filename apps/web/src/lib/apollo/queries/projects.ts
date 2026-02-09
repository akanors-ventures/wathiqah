import { gql } from "@apollo/client";

export const PROJECT_FRAGMENT = gql`
  fragment ProjectFields on Project {
    id
    name
    description
    budget
    balance
    currency
    userId
    createdAt
    updatedAt
  }
`;

export const PROJECT_TRANSACTION_FRAGMENT = gql`
  fragment ProjectTransactionFields on ProjectTransaction {
    id
    amount
    type
    category
    description
    date
    projectId
    createdAt
    updatedAt
  }
`;

export const GET_MY_PROJECTS = gql`
  ${PROJECT_FRAGMENT}
  query GetMyProjects {
    myProjects {
      ...ProjectFields
    }
  }
`;

export const GET_PROJECT = gql`
  ${PROJECT_FRAGMENT}
  ${PROJECT_TRANSACTION_FRAGMENT}
  query GetProject($id: ID!) {
    project(id: $id) {
      ...ProjectFields
      transactions {
        ...ProjectTransactionFields
      }
    }
  }
`;

export const CREATE_PROJECT = gql`
  ${PROJECT_FRAGMENT}
  mutation CreateProject($input: CreateProjectInput!) {
    createProject(input: $input) {
      ...ProjectFields
    }
  }
`;

export const UPDATE_PROJECT = gql`
  ${PROJECT_FRAGMENT}
  mutation UpdateProject($input: UpdateProjectInput!) {
    updateProject(input: $input) {
      ...ProjectFields
    }
  }
`;

export const LOG_PROJECT_TRANSACTION = gql`
  ${PROJECT_TRANSACTION_FRAGMENT}
  mutation LogProjectTransaction($input: LogProjectTransactionInput!) {
    logProjectTransaction(input: $input) {
      ...ProjectTransactionFields
    }
  }
`;
