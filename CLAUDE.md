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

**TransactionType enum actual values**: `GIVEN`, `RECEIVED`, `RETURNED`, `GIFT`, `EXPENSE`, `INCOME`
- `RETURNED` covers both directions via the `ReturnDirection` field (`TO_ME` / `TO_CONTACT`) — there are no `RETURNED_TO_ME` or `RETURNED_TO_CONTACT` enum values
- `Transaction.amount` is `Decimal?` — always use `.toNumber()` with a null guard (e.g. `?.toNumber() ?? 0`)

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

### GraphQL Schema Generation

- `apps/api/src/schema.gql` is **auto-generated at runtime** when NestJS starts — do NOT edit it manually
- When adding new `@Field()` decorators, run `pnpm --filter api dev` once to regenerate `schema.gql`, then `pnpm --filter web build` will succeed
- Frontend codegen reads from `../api/src/schema.gql` — see `apps/web/codegen.ts`

## Backend Conventions

### HTTP Controllers & Auth
- HTTP controllers are **unauthenticated by default** — auth is GraphQL-only via `GqlAuthGuard`; no `@Public()` decorator exists or is needed
- NestJS global prefix is `/api` — all HTTP routes are under `/api/`, critical when constructing webhook URLs

### Notifications
- `SubscriptionModule` is `@Global()` — `SubscriptionService` is injectable anywhere without adding it to module imports
- BullMQ queue name is `'notifications'`; see `NotificationsProcessor` for existing job patterns
- Format currency amounts with `getLocaleForCurrency` + `Intl.NumberFormat` — never concatenate raw ISO codes (e.g. `"NGN"`)

### Database Migrations

**Atlas is the only migration tool.** Never use `prisma migrate dev`, `prisma migrate deploy`, or any Prisma migrate command — they are disabled. All schema changes go through Atlas.

#### Workflow
1. Edit `apps/api/prisma/schema.prisma`
2. Run `pnpm --filter api db:generate` to regenerate the Prisma client
3. Run `pnpm --filter api db:migrate` (from repo root) to generate an Atlas migration
4. Run `pnpm --filter api db:apply` to apply it locally — **verify it succeeds with zero errors before committing**
5. Commit the migration file and updated `atlas.sum` together

#### Rules
- **Never use `atlas migrate set`** to mark a migration as applied unless you have manually verified that every SQL statement in that migration has already been executed in the target database. Marking without running causes silent schema drift — columns referenced in code will be missing at runtime, crashing the app on startup.
- **Do not run `db:apply` on production manually** — CI applies migrations automatically via `.github/workflows/ci-atlas.yaml` on merge to `main`
- **After editing any migration SQL manually**, run `atlas migrate hash --dir file://atlas/migrations` (from `apps/api/`) to rehash `atlas.sum` — CI will fail with a checksum mismatch otherwise
- **FK constraints must use `NOT VALID`**: `ADD CONSTRAINT ... FOREIGN KEY ... NOT VALID` followed by `ALTER TABLE ... VALIDATE CONSTRAINT ...` — Atlas lint will block CI if `NOT VALID` is omitted
- Atlas requires `atlas login` (browser-based); token expires periodically

#### Diagnosing schema drift
If the app crashes with `column X does not exist` or `relation X does not exist` despite Atlas reporting all migrations applied:
1. Run `atlas migrate status --env local` to confirm Atlas thinks everything is applied
2. Query the DB directly (`psql ... -c "SELECT column_name FROM information_schema.columns WHERE table_name='...' AND column_name='...'"`) to check what's actually there
3. For each missing object, find the migration that creates it and run that SQL directly via `psql`
4. Do **not** re-run `atlas migrate set` — the revision table already has the entry; only the actual DB object is missing

### Project Fund Balance Semantics
- `project.balance` = `totalIncome − totalExpenses` (net cash position, not a budget figure)
- **Budget remaining** = `budget − totalExpenses` — never `budget − balance`, which incorrectly factors in income
- `totalIncome` and `totalExpenses` are `@ResolveField` on `Project`; always include them in fragments when budget analytics are needed

### ESLint
- `@typescript-eslint/no-explicit-any` is enforced — use `unknown` or double-cast (`as unknown as T`) in tests, never `as any`

## AI Development Workflow

This project uses an AI-driven development process:

- **PRs target `dev`**, not `main` — always use `gh pr create --base dev`
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
