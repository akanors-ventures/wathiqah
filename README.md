# Haafizh

## 🔖 Project Title & Description

**Haafizh — Your digital ledger for personal and shared finances.**

Haafizh is a secure, user-friendly application for recording, tracking, and managing funds—whether personal savings or money entrusted by others. Users can log amounts given, received, or collected, with transparent running balances and transaction histories per contact.

**Who it's for:**

* Individuals managing personal loans or shared expenses
* Small groups or families needing clear financial records
* Anyone who wants peace of mind through organized tracking

**Why it matters:**
Financial exchanges between people are often undocumented, leading to confusion or disputes. Haafizh provides clarity, accountability, and trust with a well-structured digital ledger.

---

## ✨ Features (MVP)

* Record funds (given, received, or collected) or physical items (lent, borrowed, or returned)
* Track balances per contact (both financial and item counts)
* Transaction history with timestamps for all asset types
* **Witness System**: Add witnesses to transactions for accountability
  - Add existing users or invite new users as witnesses
  - Witnesses receive notifications to acknowledge transactions
  - Easy onboarding for new witnesses via invitation link
  - Track witness acknowledgment status (Pending, Acknowledged, Declined)
  - View all witnessed transactions
* Authentication & authorization (JWT)
* GraphQL API for flexible queries and mutations

**Future Enhancements:**

* Multi-currency support
* Exportable reports (CSV, PDF)
* Asset and item tracking
* Real-time updates (GraphQL subscriptions)
* Email/SMS notifications for witnesses
* Mobile app

---

## 🛠️ Tech Stack

### Monorepo
* **Package Manager:** pnpm (workspaces)
* **Build System:** Turborepo
* **Version Control:** Git

### Frontend (`apps/web`)
* **Framework:** TanStack Start (React + TypeScript)
* **Routing:** TanStack Router
* **Data Fetching:** Apollo Client + TanStack Query
* **UI Components:** Shadcn UI
* **Styling:** Tailwind CSS
* **Linting:** Biome
* **Deployment:** Nitro (platform-agnostic)

### Backend (`apps/api`)
* **Framework:** NestJS (Node.js + TypeScript)
* **API:** GraphQL (Apollo Server via `@nestjs/graphql`)
* **Database:** PostgreSQL
* **ORM:** Prisma 7 (with `@prisma/adapter-pg` for custom database connections)
* **Authentication:** JWT
* **Testing:** Jest (unit & integration)
* **Linting:** ESLint + Prettier

### Shared (`packages/*`)
* **Types:** Shared TypeScript types between frontend and backend
* **Utils:** Shared utility functions

---

## 🏗️ Architecture

```
haafizh/                          # Monorepo root
├── apps/
│   ├── api/                      # NestJS GraphQL Backend
│   └── web/                      # TanStack Start Frontend
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
git clone https://github.com/fawazabdganiyu/haafizh.git
cd haafizh
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
# DATABASE_URL="postgresql://user:password@localhost:5432/haafizh"
# JWT_SECRET="your-secret-key"
```

#### Frontend (`apps/web`)
```bash
cd apps/web
cp .env.example .env.local

# Edit .env.local with your API URL
# VITE_API_URL="http://localhost:3001/graphql"
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
- GraphQL Playground: `http://localhost:3001/graphql`

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
  createTransaction(input: {
    contactId: "1"
    amount: 100.50
    type: GIVEN
    date: "2026-01-21"
    description: "Loan payment"
    witnessUserIds: ["user-123", "user-456"]  # Existing users
    witnessInvites: [                          # New users
      { email: "witness@example.com", name: "John Doe" }
    ]
  }) {
    id
    amount
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

---

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

Haafizh leverages AI tools throughout development to boost productivity and ensure maintainability.

### Code Generation
Use AI-powered IDE tools (e.g., Zed with GitHub Copilot, Gemini AI, CodeRabbit) to scaffold React components, backend endpoints, and database models.

### Testing
Employ AI to draft unit and integration tests for key functions.

### Documentation
Use AI to create docstrings, inline comments, and maintain up-to-date documentation.

### Context-aware Techniques
Feed API specs (via GraphQL schema), database schemas, and file diffs into AI workflows for more accurate code and doc generation.

---

## 📌 Roadmap

* [x] Setup monorepo with Turborepo
* [x] Setup NestJS backend
* [x] Setup TanStack Start frontend
* [x] Design Database Schema (PostgreSQL)
* [x] Configure Prisma 7 with PostgreSQL adapter
* [x] Implement Transactions module (GraphQL API)
* [ ] Implement authentication flow (JWT)
* [ ] Implement Contacts management
* [ ] **Implement Witness System**
  - [x] Database schema for witnesses
  - [ ] GraphQL mutations for adding witnesses
  - [ ] Witness invitation flow (email/link)
  - [ ] Witness acknowledgment UI (Frontend)
  - [ ] Witness status tracking
* [ ] Build contacts management UI (Frontend)
* [ ] Build transaction management UI (Frontend)
* [ ] Integrate Apollo Client with backend
* [ ] Add unit and E2E tests
* [ ] Setup CI/CD pipeline
* [ ] Deployment

---

## License

[MIT](LICENSE)

---

✨ With Haafizh, financial clarity is just a record away.
