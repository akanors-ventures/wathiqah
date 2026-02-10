# System Review & Feature Proposal: Project & Fund Management

**Date:** 2026-01-26
**Project:** Wathīqah
**Author:** Trae AI Assistant

---

## 1. Executive Summary

This document provides a comprehensive technical review of the Wathīqah application and a detailed proposal for integrating a **Project & Fund Management** feature. This feature aligns directly with Wathīqah's mission as a "Trusted Ledger" by closing the loop between fund collection and fund utilization.

**Overall Status:**
Wathīqah is a well-structured, modern monorepo application. It leverages a strong type system (TypeScript) across the stack, utilizing NestJS for a robust backend and TanStack Start for a performant frontend. The code quality is high, with established patterns for modularity and scalability.

---

## 2. System Review

### 2.1 Architecture
**Current State:**
- **Monorepo Structure:** Efficiently managed with Turbo and pnpm workspaces.
- **Backend (NestJS):** Modular architecture (Modules, Services, Resolvers) with clean separation of concerns.
- **Frontend (TanStack Start):** Modern React 19 + TanStack Router. Hybrid Apollo Client/TanStack Query fetching.

**Recommendations:**
- **Module Isolation:** Ensure strict boundaries between modules to facilitate future microservices migration if needed.
- **Shared Utilities:** Migrate generic logic to `packages/utils` to enhance code sharing.

### 2.2 Code Quality
**Current State:**
- **Type Safety:** Excellent (Zod, class-validator, graphql-codegen).
- **Linting & Testing:** Biome/ESLint and Vitest/Jest are well-configured.

**Recommendations:**
- **Test Coverage:** Prioritize unit tests for `TransactionsService` business logic.
- **Strict Mode:** Maintain `strict: true` in TS configs.

### 2.3 User Interface (UI/UX)
**Current State:**
- **Design System:** Shadcn UI + Tailwind CSS.
- **Feedback:** Consistent use of toasts (`sonner`) and loading states.

**Recommendations:**
- **Mobile Responsiveness:** Review complex tables (History, Witnesses) for mobile layouts.
- **Accessibility:** Conduct an audit for keyboard navigation and screen readers.

### 2.4 Performance & Security
**Current State:**
- **Caching:** Redis for tokens, TanStack Query for client state.
- **Auth:** Secure JWT implementation.

**Recommendations:**
- **Rate Limiting:** Implement `ThrottlerModule` for public API endpoints.
- **DB Indexing:** Monitor query performance and add indices to foreign keys.

---

## 3. Feature Proposal: Project & Fund Management

### 3.1 Overview
Currently, Wathīqah excels at tracking **Interpersonal Trust** (funds given/received between people). This feature introduces **Project Trust** (funds allocated and spent for a specific purpose).

**The Gap:** Users can track that they *collected* $5,000 for a "Home Renovation", but cannot easily track how that money was *spent* (e.g., $2,000 on "Materials").

**The Solution:** A **Project** entity that acts as a scoped ledger. It holds a balance (from collections/income) and tracks expenses against a budget.

### 3.2 Functional Requirements
1.  **Project Management:**
    *   Create Projects (e.g., "Bali Trip", "Charity Drive").
    *   Set a **Budget** (Goal Amount).
    *   View **Real-time Balance** (Funds Available).
2.  **Fund Inflow (Income):**
    *   Add funds to a project directly.
    *   *Future:* Link P2P "Collection" transactions to a project (e.g., "Collected $50 from Ali" -> Adds to "Charity Drive" balance).
3.  **Fund Outflow (Expenses):**
    *   Log expenses against a project.
    *   Categorize expenses (e.g., "Transport", "Venue").
    *   Deduct from Project Balance automatically.
4.  **Reporting:**
    *   Progress bar: Spent vs. Budget.
    *   Expense breakdown by category.

### 3.3 User Stories
- **US-01:** As a community leader, I want to create a "Winter Relief Fund" project so I can track contributions vs. purchases of blankets.
- **US-02:** As a homeowner, I want to log every hardware store purchase against my "Kitchen Reno" project to ensure I stay within my $10k budget.
- **US-03:** As a user, I want to see exactly how much money is remaining in my "Vacation Fund".

### 3.4 Technical Specifications

#### 3.4.1 Data Model (Prisma Schema)

```prisma
model Project {
  id          String   @id @default(uuid())
  name        String
  description String?
  budget      Decimal? @db.Decimal(10, 2) // Target amount
  balance     Decimal  @default(0.00) @db.Decimal(10, 2) // Current funds available
  currency    String   @default("NGN")
  
  userId      String
  user        User     @relation(fields: [userId], references: [id])
  
  transactions ProjectTransaction[]
  
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  
  @@map("projects")
}

model ProjectTransaction {
  id          String   @id @default(uuid())
  amount      Decimal  @db.Decimal(10, 2)
  type        ProjectTransactionType // INCOME, EXPENSE
  category    String?  // e.g., "Material", "Labor"
  description String?
  date        DateTime @default(now())
  
  projectId   String
  project     Project  @relation(fields: [projectId], references: [id])
  
  // Metadata
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@map("project_transactions")
}

enum ProjectTransactionType {
  INCOME   // Adds to balance
  EXPENSE  // Deducts from balance
}
```

#### 3.4.2 API Endpoints (GraphQL)

**Queries:**
- `myProjects`: List all projects with budget/balance summaries.
- `project(id: ID!)`: Detailed view.
- `projectTransactions(projectId: ID!, filter: FilterInput)`: History for a specific project.

**Mutations:**
- `createProject(input: CreateProjectInput)`
- `updateProject(input: UpdateProjectInput)`
- `logProjectTransaction(input: LogProjectTransactionInput)`:
    - Creates `ProjectTransaction`.
    - Atomically updates `Project.balance`.
    - Validates that Expenses do not exceed Balance (optional config).

### 3.5 Placement & Architecture

**Backend (`apps/api`):**
- **New Module:** `src/modules/projects`
- **Components:** `ProjectsService`, `ProjectsResolver`, `ProjectTransactionsService`.
- **Reasoning:** Keeps project logic distinct from the P2P `Transactions` module, preventing "God Service" antipatterns.

**Frontend (`apps/web`):**
- **Routes:**
    - `/projects` (Dashboard of all projects).
    - `/projects/$projectId` (Details, Budget Visuals, Expense List).
    - `/projects/new` (Creation Wizard).
- **Components:**
    - `ProjectCard`: Quick summary.
    - `BudgetProgressBar`: Visual indicator.
    - `ExpenseForm`: Optimized for quick entry.

### 3.6 Implementation Plan

**Phase 1: Foundation (Backend)**
1.  Update `schema.prisma` with `Project` and `ProjectTransaction`.
2.  Run Prisma migrations.
3.  Generate `ProjectsModule` skeleton.

**Phase 2: Logic & API**
1.  Implement CRUD for Projects.
2.  Implement `logProjectTransaction` with atomic balance updates (`prisma.$transaction`).
3.  Add GraphQL resolvers.

**Phase 3: Frontend Core**
1.  Generate generic hooks (`useProjects`, `useProjectTransaction`).
2.  Build "My Projects" dashboard.
3.  Build Project Details page with Budget visualization.

**Phase 4: Integration**
1.  Add "Add Expense" flow.
2.  (Future) Link P2P Transactions to Projects (e.g., "Import from Ledger").
