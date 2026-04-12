# Wathīqah (Digital Ledger)

**Wathīqah** is a digital ledger application for personal and shared finances, allowing users to track funds (given, received, collected) and physical items. It features a **Witness System** for accountability. Developed by **Akanors Ventures Ltd** ([akanors.com](https://akanors.com)).

## 🚀 Quick Links
- **Web App**: [wathiqah.akanors.com](https://wathiqah.akanors.com)
- **Company Website**: [akanors.com](https://akanors.com)
- **Legal**: [Terms of Service](https://wathiqah.akanors.com/legal/terms) | [Privacy Policy](https://wathiqah.akanors.com/legal/privacy)

## 📚 Documentation

For full documentation, please visit the [**Documentation Hub**](./docs/README.md).

- [**Project Overview**](./docs/overview.md): Purpose, philosophy, and key concepts.
- [**Features Guide**](./docs/features.md): Detailed usage instructions for transactions, witnesses, and more.
- [**Installation & Setup**](./docs/installation.md): Step-by-step guide to running Wathīqah locally.
- [**API Reference**](./docs/api-reference.md): GraphQL API overview and key operations.
- [**Contributing**](./CONTRIBUTING.md): Guidelines for developers.



## Philosophy & Financial Logic

- **Core Principle**: It is better to give out (be a creditor) than to owe people (be a debtor).
- **Categories**:
  - **FUNDS**: For monetary transactions (Cash, Bank transfers). Includes **Project Transactions** (Income/Expenses) for business/project tracking. Quantity and Item Name are excluded from UI and audit logs for this category. Supports **multi-currency** (NGN, USD, EUR, GBP, CAD, AED, SAR) with NGN as default.
  - **PHYSICAL ITEMS**: For lending/borrowing physical objects (e.g., Tools, Books). Uses Quantity and Item Name.
- **Transaction Types & Color Coding**:

  | Type | Meaning | Color |
  |------|---------|-------|
  | `LOAN_GIVEN` | I lent money/item out | Blue |
  | `LOAN_RECEIVED` | I borrowed money/item | Rose |
  | `REPAYMENT_MADE` | I repaid a debt | Emerald |
  | `REPAYMENT_RECEIVED` | Contact repaid me | Emerald |
  | `GIFT_GIVEN` | Gift I gave (no obligation) | Pink |
  | `GIFT_RECEIVED` | Gift I received (no obligation) | Purple |
  | `ADVANCE_PAID` | Advance I paid out | Orange |
  | `ADVANCE_RECEIVED` | Advance I received | Purple |
  | `DEPOSIT_PAID` | Deposit I paid | Orange |
  | `DEPOSIT_RECEIVED` | Deposit I received | Purple |
  | `ESCROWED` | Cash I'm holding in trust | Emerald |
  | `REMITTED` | Cash I disbursed on their behalf | Orange |
  | `EXPENSE` | Personal spending _(legacy, read-only)_ | Red |
  | `INCOME` | Personal earnings _(legacy, read-only)_ | Green |

- **Transaction Conversion Logic**:
  - Loan transactions can be converted to **GIFT** type (e.g., when a debt is forgiven).
  - **Mapping Rule**:
    - `LOAN_GIVEN` (I lent) → `GIFT_GIVEN` (I forgave / gifted it out).
    - `LOAN_RECEIVED` (I borrowed) → `GIFT_RECEIVED` (Contact forgave my debt).
- **Shared Ledger & Perspective Flipping**:
  - **Visibility**: If a transaction's contact is a registered user (`linkedUserId`), the transaction is visible to both the creator and the contact.
  - **Perspective Logic**: When a user views a transaction they didn't create, the system "flips" the perspective:
    - `LOAN_GIVEN` ↔ `LOAN_RECEIVED`
    - `REPAYMENT_MADE` ↔ `REPAYMENT_RECEIVED`
    - `GIFT_GIVEN` ↔ `GIFT_RECEIVED`
    - `ADVANCE_PAID` ↔ `ADVANCE_RECEIVED`
    - `DEPOSIT_PAID` ↔ `DEPOSIT_RECEIVED`
    - `ESCROWED` ↔ `REMITTED`
  - **Identification**: These transactions are marked with a **SHARED** badge in the UI.
- **Balance Logic**:
  - **Contact Standing (Contact View)**: Net obligation between you and the contact. Positive = contact owes you; negative = you owe the contact. Computed from all 12 types (GIFT types excluded — no ongoing obligation).
  - **Cash Position (Dashboard)**: Deferred to the PersonalEntry follow-up plan once EXPENSE/INCOME have their own model.

---

## 🛠️ Tech Stack

### Monorepo

- **Package Manager:** pnpm (workspaces)
- **Build System:** Turborepo
- **Version Control:** Git

### Frontend (`apps/web`)

- **Framework:** TanStack Start (React + TypeScript)
- **Routing:** TanStack Router
- **Data Fetching:** Apollo Client + TanStack Query
- **UI Components:** Shadcn UI
- **Styling:** Tailwind CSS
- **Linting:** Biome
- **Deployment:** Netlify (Web) + Cloud Run (API)
- **Hooks:** Feature/page logic extracted into reusable hooks under `apps/web/src/hooks` (e.g., `useContacts`, `useTransaction`).

### Backend (`apps/api`)

- **Framework:** NestJS (Node.js + TypeScript)
- **API:** GraphQL (Apollo Server via `@nestjs/graphql`)
- **Database:** PostgreSQL
- **ORM:** Prisma 7 (with `@prisma/adapter-pg` for custom database connections)
- **Authentication:** JWT
- **Testing:** Jest (unit & integration)
- **Linting:** ESLint + Prettier

### Shared (`packages/*`)

- **Types:** Shared TypeScript types between frontend and backend
- **Utils:** Shared utility functions

---

## 🏗️ Architecture

```
wathiqah/                          # Monorepo root
├── apps/
│   ├── api/                      # NestJS GraphQL Backend
│   └── web/                      # TanStack Start Frontend
│       └── src/hooks/            # Reusable hooks (useContacts, useTransaction)
├── packages/
│   └── types/                    # Shared TypeScript types (future)
├── .gitignore
├── package.json                  # Root package.json
├── pnpm-workspace.yaml           # pnpm workspace config
├── turbo.json                    # Turborepo config
├── ARCHITECTURE.md               # Detailed architecture docs
└── README.md                     # This file
```

**Separation of Concerns:**

- Frontend handles UI/UX and communicates with backend via GraphQL
- Backend handles business logic, database operations, and authentication
- Shared packages ensure type safety across the stack

📖 **See [ARCHITECTURE.md](./ARCHITECTURE.md) for detailed folder structures and best practices.**

---

## 🚀 Installation

### Prerequisites

- Node.js >= 18
- pnpm >= 9.0.0
- PostgreSQL (for backend)

### Clone Repository

```bash
git clone https://github.com/akanors-ventures/wathiqah.git
cd wathiqah
```

```graphql
# Privacy-Preserving Witness Search (exact match only)
query SearchWitnessByEmail {
  searchWitness(input: { query: "john.doe@example.com", type: EMAIL }) {
    id
    firstName # masked, e.g., "J***"
    lastName # masked, e.g., "D***"
  }
}

query SearchWitnessByPhone {
  searchWitness(input: { query: "+1234567890", type: PHONE }) {
    id
    firstName
    lastName
  }
}
```

### Install Dependencies

```bash
# Install pnpm globally (if not already installed)
npm install -g pnpm

# Install all dependencies (root + apps)
pnpm install
```

### Environment Setup

#### Backend (`apps/api`)

```bash
cd apps/api
cp .env.example .env

# Edit .env with your database credentials
# DATABASE_URL="postgresql://user:password@localhost:5432/wathiqah"
# JWT_SECRET="your-secret-key"
```

#### Frontend (`apps/web`)

```bash
cd apps/web
cp .env.example .env.local

# Edit .env.local with your API URL
# VITE_API_URL="http://localhost:3001/api/graphql"
```

### Database Setup

First, start PostgreSQL container (required for Atlas migrations):

```bash
docker run --name postgres -e POSTGRES_PASSWORD=postgres -p 5432:5432 -d postgres:16
```

```bash
cd apps/api

# Run Atlas migrations
pnpm db:migrate

# (Optional) Seed database
pnpm prisma db seed
```

### Run Development Servers

#### Option 1: Run Both Apps (from root)

```bash
# From monorepo root
pnpm dev
```

This will start:

- Frontend: `http://localhost:3000`
- Backend: `http://localhost:3001`
- GraphQL Playground: `http://localhost:3001/api/graphql`

#### Option 2: Run Individually

```bash
# Terminal 1 - Backend
cd apps/api
pnpm dev

# Terminal 2 - Frontend
cd apps/web
pnpm dev
```

---

## 📝 GraphQL Example

```graphql
# Query contacts and balances with witness information
query GetContacts {
  contacts {
    id
    name
    balance
    transactions {
      id
      amount
      currency
      type
      date
      description
      witnesses {
        id
        user {
          id
          name
          email
        }
        status
        acknowledgedAt
      }
    }
  }
}

# Create a transaction with witnesses
mutation CreateTransaction {
  createTransaction(
    input: {
      contactId: "1"
      amount: 100.50
      currency: "USD"
      type: LOAN_GIVEN
      date: "2026-01-21"
      description: "Loan payment"
      witnessUserIds: ["user-123", "user-456"] # Existing users
      witnessInvites: [
        # New users
        { email: "witness@example.com", name: "John Doe" }
      ]
    }
  ) {
    id
    amount
    currency
    type
    witnesses {
      id
      status
    }
  }
}

# Acknowledge a witness invitation
mutation AcknowledgeWitness {
  acknowledgeWitness(witnessId: "witness-123", status: ACKNOWLEDGED) {
    id
    status
    acknowledgedAt
    transaction {
      id
      description
      amount
    }
  }
}

# Query pending witness requests for current user
query MyWitnessRequests {
  myWitnessRequests(status: PENDING) {
    id
    transaction {
      id
      amount
      type
      description
      date
      contact {
        name
      }
      createdBy {
        name
      }
    }
    invitedAt
  }
}
```

---

## 🧪 Testing

```bash
# Run all tests (from root)
pnpm test

# Backend tests only
cd apps/api
pnpm test

# Frontend tests only
cd apps/web
pnpm test
```

## 🔒 Security & Privacy

- **Witness Search**: Blind verification using exact-match email/phone; returns only `id` and masked names to prevent enumeration and PII leakage.
- **Access Control**: All search endpoints use GraphQL auth guards; only authenticated users can query.
- **Data Minimization**: Queries select minimal fields; phone lookups indexed for performance.
- **Auditability**: Transaction history tracks updates and witness status transitions.

See [WITNESS_SEARCH_IMPLEMENTATION.md](./WITNESS_SEARCH_IMPLEMENTATION.md) for details.

---

## 🌐 Live URLs

- Web: https://wathiqah.akanors.com
- API GraphQL Endpoint (example): https://your-api-domain/api/graphql

## 🏗️ Build for Production

```bash
# Build all apps (from root)
pnpm build

# Build individually
cd apps/api && pnpm build
cd apps/web && pnpm build
```

---

## Shared Access

Users can grant "Shared Access" to their contacts, allowing them to view and interact with shared transactions in a collaborative way.

## Support System

The system allows users to support the platform's development (Wathīqah Pro). This is managed through Stripe and Flutterwave.

---

## 📌 Roadmap

- [x] Setup monorepo with Turborepo
- [x] Setup NestJS backend
- [x] Setup TanStack Start frontend
- [x] Design Database Schema (PostgreSQL)
- [x] Configure Prisma 7 with PostgreSQL adapter
- [x] Implement Transactions module (GraphQL API)
- [x] Implement authentication flow (JWT)
- [x] Implement Contacts management
- [x] **Implement Witness System**
  - [x] Database schema for witnesses
  - [x] GraphQL mutations for adding witnesses (via Create Transaction)
  - [x] Backend logic for witness invitation (Tokens/Redis)
  - [x] Email notifications for invitations
  - [x] Frontend: Witness invitation landing page
  - [x] Frontend: Witness acknowledgment UI
  - [x] Frontend: Witness status tracking
- [x] **Notification System**
  - [x] Email Provider (SendGrid)
  - [x] SMS Provider (Twilio)
  - [x] Notification Service (Multi-channel support)
- [x] **Transaction History & Audit**
  - [x] Backend implementation (Audit logs, history table)
  - [x] Frontend history viewer
- [x] **Authentication & Security**
  - [x] Signup/Login (JWT)
  - [x] Change Password
  - [x] Forgot/Reset Password
  - [x] Email Verification
- [x] **Shared Access System**
  - [x] Database schema for access grants
  - [x] GraphQL resolvers for granting/revoking access
  - [x] Read-only public views for shared data
- [x] **Promise Tracker**
  - [x] Database schema for promises
  - [x] CRUD operations for promises
- [x] Frontend UI for tracking commitments
- [x] **Multi-currency Support**
  - [x] Database schema for currency
  - [x] Backend DTO and Service updates
  - [x] Frontend UI (Forms & Filters)
  - [x] Dynamic formatting in History
- [x] Build contacts management UI (Frontend)
- [x] Build transaction management UI (Frontend)
- [x] Integrate Apollo Client with backend
- [ ] Add unit and E2E tests
- [x] Setup CI/CD pipeline (GitHub Actions)
- [x] Deployment (Netlify Web + Cloud Run API)

---

© 2026 **Akanors Ventures Ltd**. All rights reserved.
[wathiqah.akanors.com](https://wathiqah.akanors.com)
