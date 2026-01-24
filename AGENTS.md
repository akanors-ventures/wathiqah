# Project Rules & Context

## Project Overview

**Wathȋqah** is a digital ledger application for personal and shared finances, allowing users to track funds (given, received, collected) and physical items. It features a **Witness System** for accountability.

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

## Architecture & Workflow Rules

### General

1.  **Configuration First**: Check `.cursorrules` and project config files (`package.json`, `tsconfig.json`, `components.json`) before making assumptions.
2.  **Monorepo Commands**: Run commands from the root using `pnpm` or `turbo` unless working strictly within one app.
    - Example: `pnpm --filter api dev` or `turbo dev`.
3.  **Type Safety**: Strict TypeScript. No `any`. Use Zod or DTOs for validation.

### Backend Rules (NestJS)

1.  **Structure**: Modular architecture (`src/modules/`). Each feature (Auth, Users, Transactions) has its own module.
2.  **GraphQL**:
    - **Code First**: Define schemas using TypeScript classes with `@ObjectType()`, `@InputType()`, and `@Args()`.
    - **Resolvers**: Handle GraphQL operations.
    - **Services**: Handle business logic and DB interactions.
    - **Entities**: Define the GraphQL object structure (in `entities/` folder).
3.  **Database**:
    - Always use **Prisma** for DB operations.
    - Update `schema.prisma` and run `pnpm prisma migrate dev` for schema changes.
    - Never hardcode SQL queries unless absolutely necessary for performance (and document why).
4.  **Security**:
    - Use `ConfigService` for secrets.
    - Implement `GqlAuthGuard` for protected endpoints.
    - Validate all inputs using DTOs with `class-validator` decorators.

### Frontend Rules (TanStack Start)

1.  **Structure**:
    - `routes/`: File-based routing.
    - `components/`: Reusable UI. Colocate feature-specific components (e.g., `components/contacts/`).
    - `lib/`: Utilities, Apollo setup.
    - `hooks/`: Custom React hooks.
2.  **Data Fetching**:
    - Use **Apollo Client** generated hooks or custom hooks wrapping Apollo/TanStack Query.
    - Ensure GraphQL queries are defined in `lib/apollo/queries` or colocated if specific.
3.  **Styling**:
    - Use **Tailwind CSS** classes.
    - Use **Shadcn UI** components for base UI elements.
    - Avoid custom CSS files unless for global themes.

### Witness System Specifics

- **Context**: The Witness System allows adding third parties to transactions for verification.
- **States**: `PENDING` -> `ACKNOWLEDGED` | `DECLINED`.
- **Flow**:
  1.  Creator adds witness (User ID or Email).
  2.  System creates `Witness` record (Status: `PENDING`).
  3.  Witness views and actions (Acknowledge/Decline).
  4.  **Update Logic**: If a witnessed transaction is modified, witness status must reset or change to `MODIFIED` (See `apps/api/BACKLOG.md`).

## Reference Files

- **Architecture**: [ARCHITECTURE.md](file:///Users/fawazabdganiyu/wathiqah/ARCHITECTURE.md)
- **General Info**: [README.md](file:///Users/fawazabdganiyu/wathiqah/README.md)
- **Witness System**: [WITNESS_SYSTEM.md](file:///Users/fawazabdganiyu/wathiqah/WITNESS_SYSTEM.md)
- **Backend Backlog**: [apps/api/BACKLOG.md](file:///Users/fawazabdganiyu/wathiqah/apps/api/BACKLOG.md)

## Coding Conventions

1.  **Naming**:
    - Files: `kebab-case.ts` (e.g., `auth.service.ts`, `user-profile.tsx`)
    - Classes/Components: `PascalCase` (e.g., `AuthService`, `UserProfile`)
    - Functions/Variables: `camelCase`
2.  **Comments**: Focus on _Business Logic_ and _Why_, not syntax or _What_.
3.  **Async/Await**: Prefer `async/await` over `.then()`.
