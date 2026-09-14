# CLAUDE.md

This file provides guidance to Claude Code when working in this repository. Detail files under `.claude/rules/` load when the relevant area is being touched — read the linked file before working in that area rather than guessing from this summary.

**Maintaining this file:** stays ≤200 lines. Before adding to it or extracting from it, read `.claude/rules/claude-md-conventions.md` — what stays inline vs. what moves out, the file map, and the growth procedure.

## General Rules

- Do NOT add pagination, extra features, or refactors beyond what was explicitly requested. Keep changes minimal and scoped to the ask.

## Git Workflow

- Always target `dev` branch for PRs and merges — `gh pr create --base dev`. Never target `main` unless explicitly told.
- Never delete git worktree directories directly. Use `git worktree remove <path>` from outside the worktree.

## Configuration Changes

- Before modifying any config (lefthook, Atlas, CI, lint-staged), read the existing config files first. Never assume defaults.

## Pre-commit Hook Auto-formats Files

- lefthook runs `api-format` (Prettier) and `web-biome` on staged files. If you get "file has been modified since read" on a second edit to the same file, the formatter ran between edits — re-read the file before editing again.

## Quick Start

### Common Commands

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start all dev servers (backend + frontend) |
| `pnpm build` | Build all apps |
| `pnpm lint` / `pnpm lint:fix` | Run linting |
| `pnpm format:fix` | Format code |
| `pnpm test` | Run all tests |
| `pnpm --filter api dev` | Backend only |
| `pnpm --filter web dev` | Frontend only |
| `pnpm --filter api db:generate` | Generate Prisma client |
| `pnpm --filter api test:watch` | Run tests in watch mode |

Test-writing/running gotchas (backend Jest, frontend Vitest): `.claude/rules/testing.md`.

### Environment Setup

**Backend** (`apps/api`): copy `.env.example` to `.env`. Key vars: `DATABASE_URL`, `JWT_SECRET`, `REDIS_HOST`, `REDIS_PORT`, `MAILTRAP_TOKEN` or `SENDGRID_API_KEY`, `TWILIO_ACCOUNT_SID`, `EXCHANGE_RATE_API_KEY`.

**Frontend** (`apps/web`): no `.env.example` — create `.env.local` directly if overriding defaults. Key var: `VITE_API_URL` (optional, defaults to `http://localhost:3001/api/graphql`).

## Project Architecture

```
wathiqah/
├── apps/
│   ├── api/          # NestJS GraphQL Backend (port 3001)
│   └── web/          # TanStack Start Frontend (port 3000)
├── packages/         # shared-constants (shared TypeScript constants)
└── turbo.json        # Turborepo config
```

**Tech Stack**: Backend — NestJS + GraphQL (Code First) + Prisma 7 (PostgreSQL) + JWT. Frontend — TanStack Start (React 19) + TanStack Router + Apollo Client + Shadcn UI + Tailwind CSS. pnpm 10 workspaces, Turbo 2. Linting: Biome (frontend), ESLint (backend).

**Key Principles**:
1. **Strict TypeScript** — no `any` types. Use specific interfaces or generated types.
2. **Standardized Monetary Inputs** — always use the `useAmountInput` hook for amount/monetary fields on the frontend.
3. **Module-based Architecture** — each feature is a self-contained module in `src/modules/`.
4. **Separation of Concerns** — Resolvers handle GraphQL queries/mutations, Services contain business logic, Entities define GraphQL schema, DTOs validate input.

TanStack Router typed search/params gotchas + route registration, GraphQL schema codegen: `.claude/rules/router-and-graphql-codegen.md`.
HMR artifacts on root providers, Apollo one-watcher-per-query, radix-ui import style: `.claude/rules/frontend-gotchas.md`.

## Critical Business Logic — pointers

- **Transactions, balances, witnesses** (AssetCategory, TransactionType table, perspective flipping, net-balance/contact-standing formulas, settlement row-locking pattern): `.claude/rules/transactions-and-balances.md`
- **Dashboard & org-scoping** (stat cards, org-vs-personal resolver scoping, Personal/Org Notes, Shared Access gating): `.claude/rules/dashboard-and-org-features.md`
- **Subscriptions** (`@CheckFeature` pattern, cross-user tier checks, DB-count vs monthly-counter limits): `.claude/rules/subscriptions.md`
- **Admin console** (roles, audit log, pagination, search): `.claude/rules/admin-console.md`

## Backend Conventions — pointers

- **Database migrations (Atlas — the only migration tool, never `prisma migrate`)**: `.claude/rules/database-migrations.md`
- **HTTP/auth, notifications, Prisma transaction timeout, project fund balance, ESLint**: `.claude/rules/backend-conventions.md`

## AI Development Workflow

This project uses an AI-driven development process:

- **PRs target `dev`**, not `main` — always `gh pr create --base dev`
- **Primary IDE**: Zed IDE with Google Gemini AI
- **Claude models**: primary driver for complex architectural decisions and logic
- **Gemini AI**: rapid exploration and large-scale context understanding
- **No Placeholders**: never use TODOs or placeholders in production code
- **Context-Aware**: agents receive Prisma schemas, GraphQL definitions, and file diffs before coding

See `AGENTS.md` for full details.

## Reference Files

- `README.md` — project overview and user-facing documentation
- `ARCHITECTURE.md` — detailed architecture and folder structures
- `AGENTS.md` — AI development rules and workflow
- `WITNESS_SYSTEM.md` — witness system feature documentation
- `apps/api/prisma/schema.prisma` — database schema
- `apps/web/src/router.tsx` — frontend routing configuration
