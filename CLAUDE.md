# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

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

### Environment Setup

**Backend** (`apps/api`):
- Copy `.env.example` to `.env`
- Key vars: `DATABASE_URL`, `JWT_SECRET`, `REDIS_HOST`, `REDIS_PORT`, `MAILTRAP_TOKEN` or `SENDGRID_API_KEY`, `TWILIO_ACCOUNT_SID`, `EXCHANGE_RATE_API_KEY`

**Frontend** (`apps/web`):
- Copy `.env.example` to `.env.local`
- Key var: `VITE_API_URL`

## Project Architecture

### Monorepo Structure

```
wathiqah/
├── apps/
│   ├── api/          # NestJS GraphQL Backend (port 3001)
│   └── web/          # TanStack Start Frontend (port 3000)
├── packages/         # Shared TypeScript types
└── turbo.json        # Turborepo config
```

### Tech Stack

- **Backend**: NestJS + GraphQL (Code First) + Prisma 7 (PostgreSQL) + JWT
- **Frontend**: TanStack Start (React 19) + TanStack Router + Apollo Client + Shadcn UI + Tailwind CSS
- **Package Manager**: pnpm 10 with workspaces
- **Build System**: Turbo 2
- **Linting**: Biome (frontend), ESLint (backend)

### Key Principles

1. **Strict TypeScript** - No `any` types allowed. Use specific interfaces or generated types.
2. **Standardized Monetary Inputs** - Always use the `useAmountInput` hook for amount/monetary fields in the frontend to ensure consistent real-time formatting and decimal support.
3. **Module-based Architecture** - Each feature is a self-contained module in `src/modules/`
4. **Separation of Concerns**:
   - Resolvers handle GraphQL queries/mutations
   - Services contain business logic
   - Entities define GraphQL schema
   - DTOs validate input data

## Critical Business Logic

### AssetCategory Enum

All code should use the `AssetCategory` enum instead of hardcoded strings:

**Backend** (`apps/api/src/generated/prisma/enums.ts`):
- `AssetCategory.FUNDS` (value: `'FUNDS'`): For monetary transactions
- `AssetCategory.ITEM` (value: `'ITEM'`): For physical items

**Frontend** (`apps/web/src/types/__generated__/graphql.ts`):
- `AssetCategory.Funds` (value: `'FUNDS'`): For monetary transactions
- `AssetCategory.Item` (value: `'ITEM'`): For physical items

**Note**: Do not use hardcoded strings like `"FUNDS"` or `"ITEM"` in comparisons. Always use the enum values from `AssetCategory`.

### Transaction Types & Color Coding

| Type | Meaning | Color |
|------|---------|-------|
| `GIVEN` | I lent/gave (Asset) | Blue |
| `RECEIVED` | I borrowed/owe (Liability) | Red |
| `RETURNED TO ME` | Money coming back | Emerald |
| `RETURNED TO CONTACT` | Paying back debt | Blue |
| `GIFT RECEIVED` | Gift from contact (purple) | Purple |
| `GIFT GIVEN` | Gift to contact (pink) | Pink |

**Note**: Use `AssetCategory.FUNDS` and `AssetCategory.ITEM` when referencing categories in code.

### Shared Ledger & Perspective Flipping

When a transaction's contact is a registered user (`linkedUserId`):
- The transaction is visible to both parties
- Perspectives flip: `GIVEN` ↔ `RECEIVED`, `RETURNED TO ME` ↔ `RETURNED TO CONTACT`

### Witness System

- **States**: `PENDING` → `ACKNOWLEDGED` \| `DECLINED` \| `MODIFIED`
- **No Deletion**: Transactions with witnesses cannot be deleted; mark as `CANCELLED` instead
- **Status Reset**: Updating an `ACKNOWLEDGED` transaction resets all witnesses to `MODIFIED`
- See `WITNESS_SYSTEM.md` for full details

### Balance Logic

- **Cash Position (Dashboard)**: `Balance = (Income + Received + ReturnedToMe + GiftReceived) - (Expense + Given + ReturnedToContact + GiftGiven)`
- **Relationship Standing (Contact View)**: `Standing = Assets (Given) - Liabilities (Received)`

## AI Development Workflow

This project uses an AI-driven development process:

- **Primary IDE**: Zed IDE with Google Gemini AI
- **Claude models**: Primary driver for complex architectural decisions and logic
- **Gemini AI**: Rapid exploration and large-scale context understanding
- **No Placeholders**: Never use TODOs or placeholders in production code
- **Context-Aware**: Agents receive Prisma schemas, GraphQL definitions, and file diffs before coding

See `AGENTS.md` for full details.

## Reference Files

- `README.md` - Project overview and user-facing documentation
- `ARCHITECTURE.md` - Detailed architecture and folder structures
- `AGENTS.md` - AI development rules and workflow
- `WITNESS_SYSTEM.md` - Witness system feature documentation
- `apps/api/prisma/schema.prisma` - Database schema
- `apps/web/src/router.tsx` - Frontend routing configuration
