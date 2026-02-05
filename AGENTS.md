# Project Rules & Context

## Project Overview

**Wathȋqah** is a digital ledger application for personal and shared finances, allowing users to track funds (given, received, collected) and physical items. It features a **Witness System** for accountability.

## Philosophy & Financial Logic

- **Core Principle**: It is better to give out (be a creditor) than to owe people (be a debtor).
- **Categories**:
  - **FUNDS**: For monetary transactions (Cash, Bank transfers). Quantity and Item Name are excluded from UI and audit logs for this category. Supports **multi-currency** (NGN, USD, EUR, GBP, CAD, AED, SAR) with NGN as default.
  - **PHYSICAL ITEMS**: For lending/borrowing physical objects (e.g., Tools, Books). Uses Quantity and Item Name.
- **Currency Logic**:
  - All fund transactions store their own `currency` code.
  - The system uses dynamic formatting via `formatCurrency` utility based on the transaction's currency.
  - History snapshots preserve the currency active at the time of the change for accurate audit trails.
- **Color Coding Logic**:
  - **RECEIVED (Red)**: Marked as Red because it represents a liability/debt. It is better to avoid owing people.
  - **GIVEN (Blue)**: Represented as Blue because it represents an asset/credit. Giving out is viewed more favorably than receiving debt.
  - **RETURNED**: Represents the resolution of a transaction (repayments). Relies on `returnDirection` for UI representation.
    - **To Me (Emerald)**: Positive action (money coming back).
    - **To Contact (Blue)**: Neutral/Resolution (paying back debt).
  - **GIFT**: Non-balance affecting transactions. Relies on `returnDirection` for UI representation.
    - **Received (Purple)**: Gift obtained from a contact (`TO_ME`).
    - **Given (Pink)**: Gift given to a contact (`TO_CONTACT`).
- **Transaction Conversion Logic**:
  - Transactions can be converted to **GIFT** type (e.g., when a debt is forgiven).
  - **Mapping Rule**:
    - Parent `GIVEN` (I lent) → Gift `TO_CONTACT` (I gifted it out/forgave debt).
    - Parent `RECEIVED` (I borrowed) → Gift `TO_ME` (Contact gifted it to me/forgave my debt).
- **Shared Ledger & Perspective Flipping**:
  - **Visibility**: If a transaction's contact is a registered user (`linkedUserId`), the transaction is visible to both the creator and the contact.
  - **Perspective Logic**: When a user views a transaction they didn't create (recorded on them by a contact), the system "flips" the perspective:
    - `GIVEN` (Asset for creator) → `RECEIVED` (Liability for you).
    - `RECEIVED` (Liability for creator) → `GIVEN` (Asset for you).
    - `RETURNED TO ME` → `RETURNED TO CONTACT`.
    - `GIFT RECEIVED` → `GIFT GIVEN`.
  - **Identification**: These transactions are marked with a **SHARED** badge in the UI.
- **Balance Logic**:
  - **Cash Position (Dashboard)**: Uses Liquidity logic. `Balance = (Income + Received + ReturnedToMe + GiftReceived) - (Expense + Given + ReturnedToContact + GiftGiven)`. A negative balance indicates a cash deficit (spending/lending more than received). Includes flipped shared transactions for accurate liquidity.
  - **Relationship Standing (Contact View)**: Uses Net Debt logic. `Standing = Assets (Given) - Liabilities (Received)`. A positive standing means the contact owes you. Includes flipped shared transactions for accurate standing.
- **Analytics & Reporting**:
  - **Context**: Visualizes financial trends and contact activity.
  - **Components**:
    - **Aggregate Summary**: Bar charts showing financial volume (Given, Received, Returned).
    - **Asset Allocation**: Pie charts showing distribution of fund types.
    - **Contact Analysis**: Horizontal bar charts showing activity per contact (Top 10).
  - **Export Logic**: Supports exporting visualizations as PNG (via `html2canvas`) and data as CSV/Excel (via `papaparse` and `xlsx`).

## Tech Stack

### Monorepo

- **Manager**: `pnpm` (Workspaces)
- **Build System**: `turbo`

### Backend (`apps/api`)

- **Framework**: NestJS
- **API**: GraphQL (**Code First** approach)
- **Database**: PostgreSQL
- **ORM**: Prisma 7 (Schema at `apps/api/prisma/schema.prisma`)
- **Auth**: JWT, Passport
- **Validation**: `class-validator`, `class-transformer`

### Frontend (`apps/web`)

- **Framework**: TanStack Start (React + TypeScript)
- **Routing**: TanStack Router (File-based: `apps/web/src/routes`)
- **Data Fetching**: Apollo Client (GraphQL) + TanStack Query (Caching/State)
- **UI Library**: Shadcn UI (Tailwind CSS)
- **Styling**: Tailwind CSS
- **Loading**: Use either `PageLoader` or `BrandLoader` component appropriately. No loading text.

## Architecture & Workflow Rules

### General

1.  **Configuration First**: Check `.cursorrules` and project config files (`package.json`, `tsconfig.json`, `components.json`) before making assumptions.
2.  **Monorepo Commands**: Run commands from the root using `pnpm` or `turbo` unless working strictly within one app. - Example: `pnpm --filter api dev` or `turbo dev`.
3.  **Type Safety**: Strict TypeScript. No `any`. Use Zod or DTOs for validation.

### Backend Rules (NestJS)

1.  **Structure**: Modular architecture (`src/modules/`). Each feature (Auth, Users, Transactions, Witnesses, Promises, SharedAccess) has its own module.
2.  **GraphQL**: - **Code First**: Define schemas using TypeScript classes with `@ObjectType()`, `@InputType()`, and `@Args()`. - **Resolvers**: Handle GraphQL operations. - **Services**: Handle business logic and DB interactions. - **Entities**: Define the GraphQL object structure (in `entities/` folder).
3.  **Database**: - Always use **Prisma** for DB operations. - Update `schema.prisma` and run `pnpm prisma migrate dev` for schema changes. - Never hardcode SQL queries unless absolutely necessary for performance (and document why).
4.  **Security**: - Use `ConfigService` for secrets. - Implement `GqlAuthGuard` for protected endpoints. - Validate all inputs using DTOs with `class-validator` decorators.
5.  **Error Handling**: - Mask internal server errors (Prisma/DB) in GraphQL `formatError` to prevent leaking technical details to the UI. - Log full error details on the server for debugging.

### Frontend Rules (TanStack Start)

1.  **Structure**: - `routes/`: File-based routing. - `components/`: Reusable UI. Colocate feature-specific components (e.g., `components/contacts/`). - `lib/`: Utilities, Apollo setup. - `hooks/`: Custom React hooks.
2.  **Data Fetching**: - Use **Apollo Client** generated hooks or custom hooks wrapping Apollo/TanStack Query. - Ensure GraphQL queries are defined in `lib/apollo/queries` or colocated if specific.
3.  **Styling**: - Use **Tailwind CSS** classes. - Use **Shadcn UI** components for base UI elements. - Avoid custom CSS files unless for global themes.

### Witness System Specifics

- **Context**: The Witness System allows adding third parties to transactions for verification.
- **States**: `PENDING` -> `ACKNOWLEDGED` | `DECLINED`.
- **Flow**:
  1.  Creator adds witness (User ID or Email).
  2.  System creates `Witness` record (Status: `PENDING`).
  3.  Witness views and actions (Acknowledge/Decline).
  4.  **Update Logic**: If a witnessed transaction is modified, witness status must reset to `MODIFIED`.
  5.  **Removal Logic**:
      - Transactions with **NO witnesses**: Can be permanently deleted from the database.
      - Transactions with **witnesses**: Cannot be deleted. They must be marked as `CANCELLED` to preserve the audit trail.
      - Every update or cancellation creates an entry in `TransactionHistory` with a snapshot of `previousState` and `newState`.

## Reference Files

- **Architecture**: [ARCHITECTURE.md](file:///Users/fawazabdganiyu/wathiqah/ARCHITECTURE.md)
- **General Info**: [README.md](file:///Users/fawazabdganiyu/wathiqah/README.md)
- **Witness System**: [WITNESS_SYSTEM.md](file:///Users/fawazabdganiyu/wathiqah/WITNESS_SYSTEM.md)
- **Backend Backlog**: [apps/api/BACKLOG.md](file:///Users/fawazabdganiyu/wathiqah/apps/api/BACKLOG.md)

## Coding Conventions

1.  **Naming**: - Files: `kebab-case.ts` (e.g., `auth.service.ts`, `user-profile.tsx`) - Classes/Components: `PascalCase` (e.g., `AuthService`, `UserProfile`) - Functions/Variables: `camelCase`
2.  **Comments**: Focus on _Business Logic_ and _Why_, not syntax or _What_.
3.  **Async/Await**: Prefer `async/await` over `.then()`.

## AI-Driven Development Process

This project is built using a collaborative AI workflow, leveraging advanced tools to ensure speed, quality, and consistency.

### Tooling Stack

- **Primary IDE**: Zed IDE (High-performance, built for speed and collaboration).
- **AI Models**:
  - **Claude models**: Primary driver for complex architectural decisions, logic implementation, and code refinement.
  - **Gemini AI models**: Utilized for rapid exploration, large-scale context understanding, and specialized code generation tasks.
- **Agentic Workflow**: We use autonomous agents (like Trae) that follow project-specific rules defined in this file to maintain architectural integrity.

### Workflow Principles

1.  **Context-Aware Coding**: Agents are provided with deep context from the monorepo structure, Prisma schemas, and GraphQL definitions before any code change.
2.  **Iterative Refinement**: Code is generated, tested, and linted in a loop. Discrepancies are identified and fixed proactively.
3.  **Consistency First**: All AI-generated code must adhere to the established tech stack (TanStack Start, NestJS, Prisma, GraphQL) and naming conventions.
4.  **Quality of Delivery**:
    - **No Placeholders**: Never use TODOs or placeholders in production-ready code.
    - **Verification**: Always verify changes through manual review or automated tests.
    - **Clean Code**: Prioritize maintainability, proper naming, and adherence to DRY principles and avoid the use of any unless in a very complex scenario.
    - **Self-Correction**: Proactively identify and fix potential side effects or linter errors introduced by changes.
5.  **Documentation as Truth**: Architectural decisions are documented in `.md` files, which serve as the primary source of truth for both human developers and AI agents.
