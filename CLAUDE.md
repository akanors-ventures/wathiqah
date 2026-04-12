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

12 self-describing formal types replace the old ambiguous ones:

| Type | Meaning | Color | Contact-standing sign |
|------|---------|-------|-----------------------|
| `LOAN_GIVEN` | I lent money out | Blue | + (contact owes me) |
| `LOAN_RECEIVED` | I borrowed money | Rose | − (I owe contact) |
| `REPAYMENT_MADE` | I repaid a debt (cash out, debt-clearing) | Emerald | + (reduces my debt) |
| `REPAYMENT_RECEIVED` | Contact repaid me (cash in, debt-clearing) | Emerald | − (reduces their debt) |
| `GIFT_GIVEN` | Gift I gave | Pink | _(no obligation)_ |
| `GIFT_RECEIVED` | Gift I received | Purple | _(no obligation)_ |
| `ADVANCE_PAID` | Advance I paid out | Orange | + (contact owes goods/money) |
| `ADVANCE_RECEIVED` | Advance I received | Purple | − (I owe goods/service) |
| `DEPOSIT_PAID` | Deposit I paid | Orange | + (contact owes it back) |
| `DEPOSIT_RECEIVED` | Deposit I received | Purple | − (I owe it back) |
| `ESCROWED` | Cash I'm holding | Emerald | − (I owe disbursement) |
| `REMITTED` | Cash I disbursed | Orange | + (I paid on their behalf) |
| `EXPENSE` | Personal expense _(legacy, read-only)_ | — | — |
| `INCOME` | Personal income _(legacy, read-only)_ | — | — |

**Note**: Use `AssetCategory.FUNDS` and `AssetCategory.ITEM` when referencing categories in code.

**TransactionType enum active values**: the 12 types above. `EXPENSE`/`INCOME` remain in the DB enum for existing rows but new creation is blocked via `@IsNotIn` guard — a follow-up PersonalEntry plan will migrate them.

- `Transaction.amount` is `Decimal?` — always use `.toNumber()` with a null guard (e.g. `?.toNumber() ?? 0`)
- There is no `returnDirection` field. Direction is encoded in the type name itself.

### Shared Ledger & Perspective Flipping

When a transaction's contact is a registered user (`linkedUserId`):
- The transaction is visible to both parties
- Perspectives flip via `PERSPECTIVE_FLIP_MAP` in `transactions.service.ts`:
  - `LOAN_GIVEN ↔ LOAN_RECEIVED`
  - `REPAYMENT_MADE ↔ REPAYMENT_RECEIVED`
  - `GIFT_GIVEN ↔ GIFT_RECEIVED`
  - `ADVANCE_PAID ↔ ADVANCE_RECEIVED`
  - `DEPOSIT_PAID ↔ DEPOSIT_RECEIVED`
  - `ESCROWED ↔ REMITTED`

### Witness System

- **States**: `PENDING` → `ACKNOWLEDGED` \| `DECLINED` \| `MODIFIED`
- **No Deletion**: Transactions with witnesses cannot be deleted; mark as `CANCELLED` instead
- **Status Reset**: Updating an `ACKNOWLEDGED` transaction resets all witnesses to `MODIFIED`
- See `WITNESS_SYSTEM.md` for full details

### Balance Logic

- **Net Balance (contact-obligation)**: Computed by `computeNetBalance()` in `transactions.service.ts` using all 12 new types. EXPENSE/INCOME are excluded from this computation. Formula: `(LOAN_RECEIVED − LOAN_GIVEN) + (REPAYMENT_RECEIVED − REPAYMENT_MADE) + (GIFT_RECEIVED − GIFT_GIVEN) + (ADVANCE_RECEIVED − ADVANCE_PAID) + (DEPOSIT_RECEIVED − DEPOSIT_PAID) + (ESCROWED − REMITTED)`
- **Contact Standing**: Computed via `CONTACT_STANDING_SIGN` in `contacts.service.ts`. GIFT types are excluded (no ongoing obligation). Positive = contact owes me, negative = I owe contact.
- **Cash Position (Dashboard)**: Deferred to the PersonalEntry follow-up plan (see `docs/pending/personal-entry-plan.md`) once EXPENSE/INCOME have their own model.
- **Project Balance**: `project.balance` = `totalIncome − totalExpenses` — `totalIncome`/`totalExpenses` are `@ResolveField` on `Project`, unrelated to transaction types above.

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

#### Removing PostgreSQL enum values

PostgreSQL does not support `ALTER TYPE ... DROP VALUE`. Atlas will error with "reordering enum value is not supported" if you try to auto-generate a migration that removes enum values. The correct approach:
1. Write the migration SQL manually (see `20260403120000.sql` as a reference)
2. `CREATE TYPE foo_new AS ENUM (...)` with only the desired values
3. `ALTER TABLE ... ALTER COLUMN type TYPE foo_new USING type::text::foo_new`
4. `DROP TYPE foo_old; ALTER TYPE foo_new RENAME TO foo_old;`
5. Run `atlas migrate hash --dir file://atlas/migrations` (from `apps/api/`) to rehash `atlas.sum`

#### PostgreSQL column naming

Prisma uses **camelCase** column names by default (without `@map`). When writing raw SQL in migrations, use the Prisma field name directly: `"returnDirection"` not `"return_direction"`, `"previousState"` not `"previous_state"`. Check the initial migration SQL (`20260224181022.sql`) if unsure.

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
