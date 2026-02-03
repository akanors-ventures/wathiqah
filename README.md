# Wathȋqah

## 🔖 Project Title & Description

**Wathȋqah — Your digital ledger for personal and shared finances.**

Wathȋqah is a secure, user-friendly application for recording, tracking, and managing funds—whether personal savings or money entrusted by others. Users can log amounts given, received, or collected, with transparent running balances and transaction histories per contact.

**Who it's for:**

- Individuals managing personal loans or shared expenses
- Small groups or families needing clear financial records
- Anyone who wants peace of mind through organized tracking

**Why it matters:**
Financial exchanges between people are often undocumented, leading to confusion or disputes. Wathȋqah provides clarity, accountability, and trust with a well-structured digital ledger.

---

## ✨ Features (MVP)

- **Transaction Management**: Record funds (given, received, collected) or physical items (lent, borrowed, returned).
- **Multi-currency Support**: Track fund transactions in multiple currencies (NGN, USD, EUR, GBP, CAD, AED, SAR).
- **Dual Balance Logic**:
  - **Cash Position**: Dashboard balance reflects liquidity (Cash In vs. Cash Out).
  - **Relationship Standing**: Contact view reflects net debt (who owes whom).
- **Contact Balances**: Track balances per contact (both financial and item counts).
- **Audit Logs**: Full transaction history with timestamps and "Before/After" diffs for every update.
- **Witness System**: Add witnesses to transactions for accountability.
  - Add existing users or invite new users via email.
  - Witnesses receive notifications to acknowledge transactions.
  - Easy onboarding for new witnesses via invitation link.
  - Track witness acknowledgment status (Pending, Acknowledged, Declined, Modified).
  - View all witnessed transactions.
- **Privacy-Preserving Witness Search**: Search existing users by exact email or phone and only receive the user ID with masked names (no email/phone exposure).
- **Flexible Contacts**: Contacts can exist independently without linking to an app user; linking (userId) is optional.
- **Shared Access**: Grant read-only access to specific transactions or witness records to external parties.
- **Analytics Dashboard**: Comprehensive visualization of financial data.
  - **Financial Volume**: Bar charts for Aggregate Summary.
  - **Asset Allocation**: Pie charts for distribution.
  - **Contact Activity**: Breakdown of top contacts by Given/Received/Net.
  - **Export Options**: Export charts as Images, and raw data as CSV or Excel.
- **Promise Tracker**: Dedicated module for documenting and tracking personal promises with due dates.
- **Authentication**: Secure JWT-based authentication.
- **API**: Flexible GraphQL API.

**Planned Features & Enhancements:**

- **Project & Fund Management**: Create projects, set budgets, and track project-specific expenses.
- **Advanced Exportable reports** (PDF).
- **Real-time updates** (GraphQL subscriptions).
- **Mobile app**.

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
git clone https://github.com/fawazabdganiyu/wathiqah.git
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

```bash
cd apps/api

# Run Prisma migrations
pnpm prisma migrate dev

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
      type: GIVEN
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

## 🧠 AI Integration Strategy

Wathȋqah leverages cutting-edge AI tools to boost productivity, ensure maintainability, and accelerate development cycles.

### Development Environment

- **Primary IDE:** **Trae**, an AI-first IDE powered by **Google Gemini AI**.
- **Agentic Workflow:** Utilizing **Antigravity** for autonomous coding tasks, context-aware code generation, and project-wide refactoring.
- **Version Control:** **GitLens** for tracking version changes, visualizing code authorship, and comprehensive commit history exploration.

### Code Generation & Assistance

- Leverage Trae's integrated AI to scaffold React components, backend NestJS modules, and GraphQL resolvers.
- Use predictive code completion and smart refactoring driven by Gemini models.

### Testing & Quality Assurance

- Employ AI agents to draft unit and integration tests for key business logic.
- Automated code reviews and optimization suggestions during the development process.

### Documentation

- Auto-generate docstrings, inline comments, and maintain up-to-date documentation (like this README) using context-aware AI.

### Context-aware Techniques

- Feed API specs (via GraphQL schema), database schemas, and file diffs into Trae's context engine for highly accurate, project-specific code generation.

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

## License

[MIT](LICENSE)

---

✨ With Wathȋqah, financial clarity is just a record away.
