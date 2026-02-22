# API Reference

Wathīqah uses a **GraphQL API** built with NestJS. This reference provides an overview of the core data models and operations.

## 🔗 Endpoint

*   **Development**: `http://localhost:3001/graphql`
*   **Production**: `https://api.wathiqah.akanors.com/graphql`

## 🔐 Authentication

The API uses **JWT (JSON Web Tokens)** for authentication.
*   **Header**: `Authorization: Bearer <token>`
*   Most queries and mutations require an authenticated user context.

## 📦 Core Data Models (Entities)

### `User`
Represents a registered user of the platform.
*   `id`: ID!
*   `email`: String!
*   `firstName`: String
*   `lastName`: String

### `Contact`
Represents a person or entity the user transacts with.
*   `id`: ID!
*   `name`: String!
*   `email`: String
*   `linkedUserId`: String (If the contact is also a registered user)

### `Transaction`
The central record of a financial interaction.
*   `id`: ID!
*   `type`: TransactionType! (GIVEN, RECEIVED)
*   `amount`: Float!
*   `currency`: String!
*   `category`: TransactionCategory! (FUNDS, ITEMS)
*   `witnesses`: [Witness!]

## 🚀 Key Operations

### Queries

#### `me`
Fetch the current authenticated user's profile.
```graphql
query Me {
  me {
    id
    email
    firstName
    lastName
  }
}
```

#### `transactions`
Fetch a paginated list of transactions with filtering.
```graphql
query GetTransactions($limit: Int, $offset: Int, $filter: TransactionFilterInput) {
  transactions(limit: $limit, offset: $offset, filter: $filter) {
    items {
      id
      amount
      description
      date
      contact {
        name
      }
    }
    total
  }
}
```

### Mutations

#### `createTransaction`
Create a new transaction record.
```graphql
mutation CreateTransaction($input: CreateTransactionInput!) {
  createTransaction(input: $input) {
    id
    amount
    status
  }
}
```

#### `inviteWitness`
Invite a witness to a transaction.
```graphql
mutation InviteWitness($transactionId: ID!, $email: String!) {
  inviteWitness(transactionId: $transactionId, email: $email) {
    id
    status # PENDING
  }
}
```

## 🛠️ Tooling
We use **Apollo Sandbox** (enabled in development) for exploring the schema and testing queries. Navigate to the GraphQL endpoint in your browser to access it.
