# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## General Rules

- Do NOT add pagination, extra features, or refactors beyond what was explicitly requested. Keep changes minimal and scoped to the ask.

## Git Workflow

- Always target `dev` branch for PRs and merges — use `gh pr create --base dev`. Never target `main` unless explicitly told.
- Never delete git worktree directories directly. Use `git worktree remove <path>` from outside the worktree to avoid breaking the shell session.

## Testing

- Run targeted backend tests from the api directory: `cd apps/api && npx jest --testPathPattern="<pattern>" --no-coverage`
- `pnpm --filter api test -- --testPathPattern=<x>` mangles args in worktrees — use the `cd apps/api && npx jest` form instead.
- In test files, use `as unknown as T` double-cast to access private members — never `as any` and never eslint-disable comments to suppress `no-explicit-any`.
- When using `jest.spyOn`, always add `afterEach(() => jest.restoreAllMocks())` in the same describe block to prevent cross-test mock leakage.

## TypeScript Checks

- `pnpm typecheck` runs `tsc --noEmit` across both apps via Turbo. Use it for full-monorepo type validation.

## TanStack Router — Typed Search Params

- Routes with `validateSearch` (e.g. `/pricing`, `/transactions`) require all search params to be passed explicitly in `<Link search={{ ... }}>`. Omitting `search` is a TypeScript error. Use `search={{ param: undefined }}` when no value is needed.

## Pre-commit Hook Auto-formats Files

- lefthook runs `api-format` (Prettier) and `web-biome` on staged files. If you get "file has been modified since read" on a second edit to the same file, the formatter ran between edits — re-read the file before editing again.

## Configuration Changes

- Before modifying any config (lefthook, Atlas, CI, lint-staged), read the existing config files first. Never assume defaults.

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
- **Cash Position (Dashboard)**: Displayed as a dedicated stat card in `components/dashboard/Dashboard.tsx` alongside Total Balance, Inflow, and Outflow. Sourced from `PersonalEntriesTab` cash position computation — not from transaction types.
- **Project Balance**: `project.balance` = `totalIncome − totalExpenses` — `totalIncome`/`totalExpenses` are `@ResolveField` on `Project`, unrelated to transaction types above.

### Dashboard Stat Cards

The personal dashboard (`components/dashboard/Dashboard.tsx`) shows exactly 4 cards:
1. **Total Balance** — net contact-obligation balance, always all-time
2. **Cash Position** — personal income minus expenses
3. **Inflow** — period-filtered inflows
4. **Outflow** — period-filtered outflows

Do not add a fifth card or duplicate Cash Position. Layout: Total Balance and Cash Position each span full width below `lg`; Inflow and Outflow are always side-by-side.

### Personal Notes (`/notes` route)

Route: `apps/web/src/routes/notes.tsx`. Backend module: `apps/api/src/modules/notes/`.

- Fields: optional `title`, required `body`, optional `category`
- Free tier: 5 notes lifetime max (checked against DB count via `@CheckFeature('maxNotes')` on `createNote` resolver). UI shows usage indicator and disables the form with an upgrade prompt at the limit.
- Pro tier: unlimited (`maxNotes: -1` in `subscription.constants.ts`)
- Nav placement: Header "Network" dropdown (desktop) and mobile More sheet
- The limit field is `maxNotes` in both `TierLimits` interface and `SUBSCRIPTION_LIMITS` — not `maxNotesPerMonth` (that name is stale and does not exist)

### Org Notes — Optional Title Field

The org notes `title` field (`string?`) is wired end-to-end:
- Backend DTO: `CreateNoteInput` and `UpdateNoteInput` both declare `title?: string`
- Backend entity: `Note` entity exposes `title` as an optional `@Field`
- Backend service: `createNote` and `updateNote` both pass `title: input.title`
- Frontend: `NoteFormValues` includes `title?: string`; edit pre-populates `title`; `note-entry.tsx` renders the title conditionally when present

### Shared Access — Purpose and Gating

**Intent**: Legacy/estate access — users pre-grant trusted contacts (family, executors) read-only access to their records so those records can be reviewed if the user is deceased or incapacitated.

**Gate rules**:
- Granting access (`grantAccess`) → **free**, no subscription check
- Accepting a grant (`acceptAccess`) → **free**, no subscription check
- Viewing records (`getSharedData` → `sharedData` query) → **viewer must be Pro**

**Implementation** (`shared-access.service.ts`, `getSharedData`): after verifying the grant is `ACCEPTED` and the caller is the correct recipient, look up the viewer's user record by email and check `viewer.tier !== SubscriptionTier.PRO`. Throw `ForbiddenException('You need a Pro subscription to view shared records.')` if not Pro. The granter's tier is irrelevant.

**Frontend locked state** (`routes/shared-access/view.$grantId.tsx`): detects `error.message.includes('Pro subscription')`, shows heading "Pro subscription required" with viewer-centric body copy and an "Upgrade to Pro" CTA linking to `/pricing` (with `search={{ reason: undefined }}`).

### Subscription Tier Check Pattern

**For checking the authenticated caller's features**: use `@CheckFeature('featureName')` decorator on the resolver method. This is the standard path.

**For checking a *different* user's tier** (e.g. checking the granter's or viewer's subscription in shared-access scenarios): do NOT use `@CheckFeature`. Instead, look up that user inline in the service method:
```ts
const user = await this.prisma.user.findUnique({
  where: { id: userId },   // or { email }
  select: { tier: true },
});
if (!user || user.tier !== SubscriptionTier.PRO) {
  throw new ForbiddenException('...');
}
```
`@CheckFeature` always operates on the authenticated caller — using it for cross-user tier checks is wrong.

### Subscription Feature Limit Patterns

Two check patterns exist in `SubscriptionService.checkFeatureLimit` (`apps/api/src/modules/subscription/subscription.service.ts`):

- **DB-count** (`maxContacts`, `maxNotes`): counts actual Prisma rows. `incrementFeatureUsage` skips these (no counter). Add a special-case block in `checkFeatureLimit` to implement a new one.
- **Monthly counter** (`maxWitnessesPerMonth`, `contactNotificationSms`): tracked in `featureUsage` JSON with key `${feature}_${year}_${month}`. `incrementFeatureUsage` bumps these automatically. New monthly-counter features work without any special-casing.

### TanStack Router — Route Registration

`apps/web/src/routeTree.gen.ts` is **auto-generated** by the TanStack Router dev server. When adding a new route file without running the server, TypeScript will error: `Argument of type '"/new-route"' is not assignable to parameter of type 'keyof FileRoutesByPath'` in many places. Fix: run `pnpm --filter web dev` briefly — it regenerates the file within seconds of startup. Never edit `routeTree.gen.ts` manually.

### GraphQL Schema Generation

- `apps/api/src/schema.gql` is **auto-generated at runtime** when NestJS starts — do NOT edit it manually.
- After adding or changing `@Field()` decorators, run `pnpm --filter api dev` once to regenerate `schema.gql`. Kill it as soon as the server prints "Nest application successfully started".
- After regenerating `schema.gql`, run `pnpm --filter web codegen` to regenerate `apps/web/src/types/__generated__/graphql.ts`.
- Commit both `schema.gql` and `graphql.ts` together — a stale `schema.gql` in the repo will break CI codegen validation even if the backend code is correct.
- Frontend codegen reads from `../api/src/schema.gql` — see `apps/web/codegen.ts`.

## Backend Conventions

### HTTP Controllers & Auth
- HTTP controllers are **unauthenticated by default** — auth is GraphQL-only via `GqlAuthGuard`; no `@Public()` decorator exists or is needed
- NestJS global prefix is `/api` — all HTTP routes are under `/api/`, critical when constructing webhook URLs

### Notifications
- `SubscriptionModule` is `@Global()` — `SubscriptionService` is injectable anywhere without adding it to module imports
- BullMQ queue name is `'notifications'`; see `NotificationsProcessor` for existing job patterns
- Format currency amounts with `getLocaleForCurrency` + `Intl.NumberFormat` — never concatenate raw ISO codes (e.g. `"NGN"`)
- Two separate SMS gates: `allowSMS` (witness invite SMS — boolean, Pro only) and `contactNotificationSms` (contact notification SMS sent when a witness verifies a transaction — monthly counter, 10/month free, unlimited Pro). These gate independent code paths and are not redundant.

### Database Migrations

**Atlas is the only migration tool.** Never use `prisma migrate dev`, `prisma migrate deploy`, or any Prisma migrate command — they are disabled. All schema changes go through Atlas.

#### Normal workflow (covers 95% of cases)
1. Edit `apps/api/prisma/schema.prisma`
2. `pnpm --filter api db:generate` — regenerates the Prisma client
3. `pnpm --filter api db:migrate` — Atlas diffs schema.prisma against the DB and **auto-generates** both the migration SQL file and the updated `atlas.sum`. Do not write migration SQL manually.
4. `pnpm --filter api db:apply` — applies the migration locally. Verify zero errors before continuing.
5. Commit `apps/api/atlas/migrations/<timestamp>.sql` and the updated `apps/api/atlas/migrations/atlas.sum` together. Never commit one without the other.

#### Rules
- **Never use `atlas migrate set`** to mark a migration as applied unless every SQL statement in that file has already been executed. Marking without running causes silent schema drift — missing columns crash the app on startup.
- **Do not run `db:apply` on production manually** — CI applies migrations automatically via `.github/workflows/ci-atlas.yaml` on merge to `main`.
- **FK constraints must use `NOT VALID`**: `ADD CONSTRAINT ... FOREIGN KEY ... NOT VALID` followed by `ALTER TABLE ... VALIDATE CONSTRAINT ...` — Atlas lint will block CI if `NOT VALID` is omitted.
- Atlas requires `atlas login` (browser-based); token expires periodically.
- **Worktrees**: if two worktrees both run `db:migrate`, each generates its own migration file with its own timestamp. They will conflict when merged. Coordinate: only one worktree should generate a schema-changing migration at a time, or rebase and re-generate after merging the other.

#### Special case: removing a PostgreSQL enum value

PostgreSQL does not support `ALTER TYPE ... DROP VALUE`. Atlas will error with "reordering enum value is not supported" if you auto-generate a migration that removes enum values. This is the **only** case where you write migration SQL manually:
1. Write the SQL by hand (see `20260403120000.sql` as a reference):
   - `CREATE TYPE foo_new AS ENUM (...)` with only the desired values
   - `ALTER TABLE ... ALTER COLUMN type TYPE foo_new USING type::text::foo_new`
   - `DROP TYPE foo_old; ALTER TYPE foo_new RENAME TO foo_old;`
2. Run `atlas migrate hash --dir file://atlas/migrations` from `apps/api/` to rehash `atlas.sum` — CI will fail with a checksum mismatch if you skip this.
3. Do NOT write migration SQL manually for any other reason — let `db:migrate` generate it.

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
