# Pagination & Filters Design (Revised — Server-Side)

**Date:** 2026-03-24
**Replaces:** `2026-03-23-pagination-and-filters-design.md`
**Scope:** Transactions, Contacts, Contact Details, Projects, Project Details, My Contact Transactions (Shared History), Witness Requests

---

## Problem

All data-heavy pages currently fetch everything at once and apply filtering client-side via `useState`. As data grows, this degrades performance and usability. There is no pagination, no date range filtering on transactions, no balance-based filtering on contacts or projects, and no project status concept.

---

## Goals

1. Add server-side pagination and filtering to all list/table pages
2. Add date range filtering to all transaction-heavy pages
3. Add balance standing filter to contacts and projects pages
4. Add project status (`ACTIVE`, `COMPLETED`, `ARCHIVED`) via schema migration
5. Add search + date range filters to Witness Requests page
6. Preserve all existing functionality — no regressions

---

## Architecture

### Approach: Offset-Based Server-Side Pagination + Server-Side Filtering

Pagination parameters (`page`, `limit`) and all filters are sent to the backend with each query. The backend applies `skip`/`take` via Prisma and returns `{ items, total }`. The frontend manages filter + page state per route and passes it to the relevant hook.

**Why offset-based over cursor-based:** Offset pagination supports jumping to arbitrary pages (user-facing page number controls), which is the expected UX for list pages in this app. Cursor-based pagination is better for infinite scroll, which is not the pattern here.

---

## Backend Changes

### 1. Prisma Migration — `ProjectStatus` Enum

```prisma
enum ProjectStatus {
  ACTIVE
  COMPLETED
  ARCHIVED
}

model Project {
  // ...existing fields
  status  ProjectStatus  @default(ACTIVE)
}
```

- Default `ACTIVE` ensures no existing projects are affected
- Generate migration: `pnpm --filter api db:migrate` (creates the Atlas migration file)
- Regenerate Prisma client: `pnpm --filter api db:generate`

### 2. Shared Pagination Input DTO

**New file:** `apps/api/src/common/dto/pagination.input.ts`

```typescript
@InputType()
export class PaginationInput {
  @Field(() => Int, { nullable: true, defaultValue: 1 })
  page?: number;

  @Field(() => Int, { nullable: true, defaultValue: 25 })
  limit?: number;
}
```

Used by all filter inputs. Helper: `getPrismaSkip(page, limit) = (page - 1) * limit`.

### 3. Updated `FilterTransactionInput`

**File:** `apps/api/src/modules/transactions/dto/filter-transaction.input.ts`

Add `page` and `limit` fields (replacing the existing standalone `limit` field). All other fields unchanged.

```typescript
page?: number;   // default: 1
limit?: number;  // default: 25
```

Also applies to the `myContactTransactions` query — add a new `FilterSharedHistoryInput` DTO:

**New file:** `apps/api/src/modules/transactions/dto/filter-shared-history.input.ts`

```typescript
@InputType()
export class FilterSharedHistoryInput {
  search?: string;               // matches description or recorder name
  types?: TransactionType[];
  status?: TransactionStatus;
  startDate?: Date;
  endDate?: Date;
  page?: number;                 // default: 1
  limit?: number;                // default: 25
}
```

### 4. New `FilterContactInput`

**New file:** `apps/api/src/modules/contacts/dto/filter-contact.input.ts`

```typescript
@InputType()
export class FilterContactInput {
  search?: string;               // matches firstName, lastName, email, phoneNumber
  balanceStanding?: ContactBalanceStanding;  // ALL | OWED_TO_ME | I_OWE
  page?: number;                 // default: 1
  limit?: number;                // default: 25
}

export enum ContactBalanceStanding {
  ALL = 'ALL',
  OWED_TO_ME = 'OWED_TO_ME',  // balance > 0
  I_OWE = 'I_OWE',            // balance < 0
}
// Must call: registerEnumType(ContactBalanceStanding, { name: 'ContactBalanceStanding' })
```

**Balance standing note:** Contact balance is computed from transaction aggregations. In the service, when `balanceStanding` is set, all search-matching contacts are loaded with their transaction data, balances are computed in memory, the list is filtered by standing, and then offset/limit is applied. Since contacts are a bounded small set per user, this two-phase approach is acceptable.

### 5. Updated `FilterProjectInput`

**File:** `apps/api/src/modules/projects/dto/filter-project.input.ts`

This file exists but is currently unused. It has an existing `userId?` field — **remove it**; user scoping is already handled server-side via `@CurrentUser()` and exposing it is a security concern. Replace the file contents entirely with:

```typescript
@InputType()
export class FilterProjectInput {
  search?: string;                        // matches project name
  status?: ProjectStatus;                 // ACTIVE | COMPLETED | ARCHIVED
  balanceStanding?: ProjectBalanceStanding;  // ALL | UNDER_BUDGET | OVER_BUDGET
  page?: number;                          // default: 1
  limit?: number;                         // default: 25
}

export enum ProjectBalanceStanding {
  ALL = 'ALL',
  UNDER_BUDGET = 'UNDER_BUDGET',   // balance <= budget
  OVER_BUDGET = 'OVER_BUDGET',     // balance > budget
}
// Must call: registerEnumType(ProjectBalanceStanding, { name: 'ProjectBalanceStanding' })
```

Balance and budget are stored fields on the `Project` model, so `UNDER_BUDGET`/`OVER_BUDGET` can be applied directly in the Prisma `where` clause.

### 6. New `FilterWitnessInput`

**New file:** `apps/api/src/modules/witnesses/dto/filter-witness.input.ts`

```typescript
@InputType()
export class FilterWitnessInput {
  search?: string;       // matches transaction description or requester name
  startDate?: Date;
  endDate?: Date;
  page?: number;         // default: 1
  limit?: number;        // default: 25
}
```

The `status` (PENDING | ACKNOWLEDGED | DECLINED | MODIFIED) is passed as a separate argument alongside the filter — it already exists on the `myWitnessRequests` query and drives the tab UI. Keep it as a standalone param.

### 7. Paginated Response Entities

GraphQL does not support generic types, so each module needs a concrete paginated response type.

**Modify existing** `apps/api/src/modules/transactions/entities/transactions-response.entity.ts`:
- Add `total: number` field
- Add `page: number` field
- Add `limit: number` field
- `items` and `summary` fields remain unchanged

**New file:** `apps/api/src/modules/contacts/entities/paginated-contacts-response.entity.ts`
```typescript
@ObjectType()
export class PaginatedContactsResponse {
  @Field(() => [Contact]) items: Contact[];
  @Field(() => Int) total: number;
  @Field(() => Int) page: number;
  @Field(() => Int) limit: number;
}
```

**New file:** `apps/api/src/modules/projects/entities/paginated-projects-response.entity.ts`
```typescript
@ObjectType()
export class PaginatedProjectsResponse {
  @Field(() => [Project]) items: Project[];
  @Field(() => Int) total: number;
  @Field(() => Int) page: number;
  @Field(() => Int) limit: number;
}
```

**New file:** `apps/api/src/modules/witnesses/entities/paginated-witnesses-response.entity.ts`
```typescript
@ObjectType()
export class PaginatedWitnessesResponse {
  @Field(() => [Witness]) items: Witness[];
  @Field(() => Int) total: number;
  @Field(() => Int) page: number;
  @Field(() => Int) limit: number;
}
```

**Prerequisite fix:** The `Witness` GraphQL entity currently declares `transactionId` as non-nullable (`@Field() transactionId: string`), but the Prisma model has `transactionId` as nullable (witnesses can belong to a `ProjectTransaction` instead). Before implementing `PaginatedWitnessesResponse`, `Witness.transactionId` must be made nullable in the entity (`@Field({ nullable: true }) transactionId?: string`). The search filter in the service must also handle both join paths — regular transaction witnesses (join `transaction`) and project transaction witnesses (join `projectTransaction`).

**New file:** `apps/api/src/modules/transactions/entities/paginated-shared-history-response.entity.ts`
```typescript
@ObjectType()
export class PaginatedSharedHistoryResponse {
  @Field(() => [Transaction]) items: Transaction[];
  @Field(() => Int) total: number;
  @Field(() => Int) page: number;
  @Field(() => Int) limit: number;
}
```

### 8. Resolver & Service Changes

**Transactions resolver:**
- `transactions(filter?: FilterTransactionInput)` — already returns `TransactionsResponse`; apply `skip`/`take` in service, add `total`/`page`/`limit` to response
- `myContactTransactions()` → `myContactTransactions(filter?: FilterSharedHistoryInput)` returns `PaginatedSharedHistoryResponse` — **coordinated breaking change**: the frontend call site in `my-contact-transactions.tsx` and the new `useMyContactTransactions` hook must be updated in the same changeset

**Transactions service:**
- `findAll(userId, filter)`: add `prisma.$transaction([count, findMany])` for accurate total with filters applied
- New or updated `findMyContactTransactions(userId, filter)` method with pagination

**Contacts resolver:**
- `contacts()` → `contacts(filter?: FilterContactInput)` returns `PaginatedContactsResponse`

**Contacts service:**
- `findAll(userId, filter)`: apply search to Prisma `where`, apply balance standing post-query if needed (two-phase), apply `skip`/`take`, return `{ items, total, page, limit }`

**Projects resolver:**
- `myProjects()` → `myProjects(filter?: FilterProjectInput)` returns `PaginatedProjectsResponse`
- Add `status` field to `Project` GraphQL entity

**Projects service:**
- `findAll(userId, filter)`: apply all filter fields to Prisma `where`, including `balanceStanding` via `lte`/`gt` on `balance` vs `budget`, apply `skip`/`take`, return `{ items, total, page, limit }`
- Add optional `status` to `create` and `update` service methods

**Witnesses resolver:**
- `myWitnessRequests(status?, filter?: FilterWitnessInput)` returns `PaginatedWitnessesResponse`

**Witnesses service:**
- `findMyRequests(userId, status?, filter?)`: apply search (JOIN transaction + user), date range, `skip`/`take`, return `{ items, total, page, limit }`

---

## Frontend Changes

### Shared UI Components (unchanged from original design)

**`DateRangePicker` component** — `apps/web/src/components/ui/date-range-picker.tsx`
- Two date inputs: From / To with clear button
- Validates `from` ≤ `to`

**`Pagination` component** — `apps/web/src/components/ui/pagination.tsx`
- Page number controls (prev / numbered pages / next)
- Items-per-page selector (10 / 25 / 50)
- "Showing X–Y of Z results" label using `total` from server
- Hides when `total <= limit`
- **Custom implementation** — do NOT install Shadcn's `pagination` via CLI (`shadcn add pagination`), it would overwrite this file

### No `usePagination` Hook Needed

Since pagination is server-side, there is no client-side array to slice. Page state (`page`, `limit`) is managed as `useState` in each route component (or a filter hook) and passed to the data-fetching hook.

### Per-Feature Filter Hooks

These hooks manage filter + pagination state and return it as query variables. They do **not** filter arrays — they produce variables for Apollo queries.

**`useTransactionFilters`** — `apps/web/src/hooks/useTransactionFilters.ts`
- State: `search`, `type[]` (TransactionType enum values: `GIVEN | RECEIVED | RETURNED | GIFT | INCOME | EXPENSE`), `status`, `currency`, `dateRange`, `page`, `limit`
- Returns: filter state, setters, reset function, and a `variables` object ready for Apollo

**`useContactFilters`** — `apps/web/src/hooks/useContactFilters.ts`
- State: `search`, `balanceStanding` (ALL | OWED_TO_ME | I_OWE), `page`, `limit`

**`useProjectFilters`** — `apps/web/src/hooks/useProjectFilters.ts`
- State: `search`, `status` (ALL | ACTIVE | COMPLETED | ARCHIVED), `balanceStanding` (ALL | UNDER_BUDGET | OVER_BUDGET), `page`, `limit`

**`useSharedHistoryFilters`** — `apps/web/src/hooks/useSharedHistoryFilters.ts`
- State: `search`, `types[]` (same TransactionType enum), `status`, `dateRange`, `page`, `limit`

**`useWitnessFilters`** — `apps/web/src/hooks/useWitnessFilters.ts`
- State: `search`, `dateRange`, `page`, `limit`
- (Status/tab is managed separately by existing tab state in the route)

All filter hooks reset `page` to 1 whenever any non-pagination filter changes.

### Updated Data Hooks

The existing hooks (`useTransactions`, `useContacts`, `useProjects`) need to accept filter variables and return paginated results:

- **`useTransactions(filter?)`** — already accepts `FilterTransactionInput`; update to pass `page`/`limit`, read `total`/`page`/`limit` from response
- **`useContacts(filter?)`** — currently no args; update signature to accept `FilterContactInput`, return `{ contacts, total, page, limit, loading, error }`
- **`useProjects(filter?)`** — currently no args; update signature to accept `FilterProjectInput`
- **New `useMyContactTransactions(filter?)`** — replaces inline `useQuery` call in the shared history page
- **`useMyWitnessRequests(status?, filter?)`** — update to accept `FilterWitnessInput`

### Updated GraphQL Queries/Fragments

**`apps/web/src/lib/apollo/queries/transactions.ts`:**
- Update `GET_TRANSACTIONS` to pass `page`/`limit` variables and request `total`, `page`, `limit` in response
- Update `GET_MY_CONTACT_TRANSACTIONS` to accept `FilterSharedHistoryInput` variables and return `PaginatedSharedHistoryResponse` shape

**`apps/web/src/lib/apollo/queries/contacts.ts`:**
- Update `GET_CONTACTS` to accept `FilterContactInput` variables, return `PaginatedContactsResponse` shape

**`apps/web/src/lib/apollo/queries/projects.ts`:**
- Add `status` to `PROJECT_FRAGMENT`
- Update `GET_MY_PROJECTS` to accept `FilterProjectInput` variables, return `PaginatedProjectsResponse` shape

**`apps/web/src/lib/apollo/queries/witnesses.ts`** (or wherever witness queries live):
- Update `GET_MY_WITNESS_REQUESTS` to accept `FilterWitnessInput` variables, return `PaginatedWitnessesResponse` shape

### Page-by-Page Route Changes

**Transactions page** (`/routes/transactions/index.tsx`):
- Replace inline filter `useState` with `useTransactionFilters`
- Add `DateRangePicker` to existing filter bar
- Pass filter variables to `useTransactions`
- Render `Pagination` below table/cards (both Funds and Items tabs)

**Contacts page** (`/routes/contacts/index.tsx`):
- Replace inline search `useState` with `useContactFilters`
- Add balance standing control: `All | They Owe Me | I Owe Them`
- Pass filter to `useContacts`
- Render `Pagination` below contact grid

**Contact Details page** (`/routes/contacts/$contactId.tsx`):
- Add compact filter bar using `useTransactionFilters` scoped to contact transactions
- `DateRangePicker` + type selector + status selector
- Pass filter + `contactId` to `useTransactions`
- Render `Pagination` below transaction table

**Projects page** (`/routes/projects/index.tsx`):
- Add `useProjectFilters`
- Add search + status segmented control + balance standing control
- Pass filter to `useProjects`
- Render `Pagination` below project grid

**Project Details page** (`/routes/projects/$projectId.tsx`):
- Project transactions are returned as a nested field on the project — to paginate these server-side, the `GET_PROJECT` query needs to pass pagination args through to the `transactions` resolve field on `Project`
- Add compact filter bar: `DateRangePicker` + type (INCOME/EXPENSE) + category dropdown (dynamic from existing transaction categories)
- Pass filter + pagination to `useProject`

**My Contact Transactions** (`/routes/transactions/my-contact-transactions.tsx`):
- Replace inline `useQuery` with `useMyContactTransactions(filter)`
- Add `useSharedHistoryFilters`
- Add filter bar: search + `DateRangePicker` + type + status
- Render `Pagination` below table

**Witness Requests** (`/routes/witnesses/index.tsx`):
- Add `useWitnessFilters`
- Add filter bar: search + `DateRangePicker`
- Pass filter (alongside existing `status` tab param) to `useMyWitnessRequests`
- Render `Pagination` below each tab's list

---

## Project Details — Transaction Pagination Special Case

Project transactions are currently fetched as a nested field (`project { transactions { ... } }`) — everything comes back in one query. To paginate project transactions server-side, the `transactions` resolve field on `Project` must accept filter + pagination args.

**Backend change:** Add `@Args` to the `transactions` `@ResolveField` in `projects.resolver.ts`:
```typescript
@ResolveField(() => PaginatedProjectTransactionsResponse)
async transactions(
  @Parent() project: Project,
  @Args('filter', { nullable: true }) filter?: FilterProjectTransactionInput,
) { ... }
```

**New DTO:** `FilterProjectTransactionInput` — `type?`, `category?`, `startDate?`, `endDate?`, `page?`, `limit?`

**New entity:** `PaginatedProjectTransactionsResponse` — `{ items: ProjectTransaction[], total, page, limit }`

---

## Data Flow

```
Route Component
  └─ useXxxFilters()          → { filterState, setters, variables }
       └─ useXxx(variables)   → { items, total, page, limit, loading }
            └─ renders list + <Pagination total={total} page={page} ... />
```

Filter hook resets `page → 1` on any non-pagination state change.

---

## Error Handling & Edge Cases

- Empty state: filtered result returns `total: 0` — show existing empty state UI
- `Pagination` hides when `total <= limit`
- `DateRangePicker`: if `to < from`, show inline validation error
- Contacts balance standing (`OWED_TO_ME` / `I_OWE`) uses two-phase query in service — total count reflects post-balance-filter count
- Apollo cache: use `fetchPolicy: 'cache-and-network'` (already in place) — page/filter changes trigger refetch; do not use `cache-first` as stale pagination counts would be misleading

---

## Testing Considerations

- Backend unit tests: each service's pagination logic (correct `skip`/`take`, correct `total` with filters applied)
- Backend unit tests: `ProjectStatus` migration and new GraphQL fields on Project
- Backend unit tests: contacts balance standing two-phase query
- Frontend: filter hooks — test that page resets to 1 on filter change
- Frontend: `Pagination` component renders correct range labels, hides when appropriate
- No end-to-end tests in scope for this feature

---

## Files to Create

### Backend
| File | Purpose |
|------|---------|
| `apps/api/src/common/dto/pagination.input.ts` | Shared `PaginationInput` DTO |
| `apps/api/src/modules/transactions/dto/filter-shared-history.input.ts` | Filter DTO for shared history |
| `apps/api/src/modules/contacts/dto/filter-contact.input.ts` | Filter DTO for contacts list |
| `apps/api/src/modules/witnesses/dto/filter-witness.input.ts` | Filter DTO for witness requests |
| `apps/api/src/modules/contacts/entities/paginated-contacts-response.entity.ts` | Paginated contacts response type |
| `apps/api/src/modules/projects/entities/paginated-projects-response.entity.ts` | Paginated projects response type |
| `apps/api/src/modules/witnesses/entities/paginated-witnesses-response.entity.ts` | Paginated witnesses response type |
| `apps/api/src/modules/transactions/entities/paginated-shared-history-response.entity.ts` | Paginated shared history response |
| `apps/api/src/modules/projects/dto/filter-project-transaction.input.ts` | Filter DTO for project transactions |
| `apps/api/src/modules/projects/entities/paginated-project-transactions-response.entity.ts` | Paginated project transactions response |

### Frontend
| File | Purpose |
|------|---------|
| `apps/web/src/components/ui/date-range-picker.tsx` | Date range picker UI component |
| `apps/web/src/components/ui/pagination.tsx` | Pagination UI component (custom, not Shadcn CLI) |
| `apps/web/src/hooks/useTransactionFilters.ts` | Transaction filter state hook |
| `apps/web/src/hooks/useContactFilters.ts` | Contact filter state hook |
| `apps/web/src/hooks/useProjectFilters.ts` | Project filter state hook |
| `apps/web/src/hooks/useSharedHistoryFilters.ts` | Shared history filter state hook |
| `apps/web/src/hooks/useWitnessFilters.ts` | Witness filter state hook |
| `apps/web/src/hooks/useMyContactTransactions.ts` | Data hook for shared history page |

---

## Files to Modify

### Backend
| File | Change |
|------|--------|
| `apps/api/prisma/schema.prisma` | Add `ProjectStatus` enum + `Project.status` field |
| `apps/api/src/modules/transactions/dto/filter-transaction.input.ts` | Replace standalone `limit` with `page` + `limit` |
| `apps/api/src/modules/projects/dto/filter-project.input.ts` | Add `search`, `status`, `balanceStanding`, `page`, `limit` |
| `apps/api/src/modules/transactions/entities/transactions-response.entity.ts` | Add `total`, `page`, `limit` fields |
| `apps/api/src/modules/transactions/transactions.service.ts` | Add `skip`/`take` + `total` to `findAll`; add `findMyContactTransactions` with pagination |
| `apps/api/src/modules/transactions/transactions.resolver.ts` | Update `myContactTransactions` signature and return type |
| `apps/api/src/modules/contacts/contacts.service.ts` | Update `findAll` to accept `FilterContactInput`, return paginated result |
| `apps/api/src/modules/contacts/contacts.resolver.ts` | Update `contacts` query signature and return type |
| `apps/api/src/modules/projects/projects.service.ts` | Update `findAll` to accept `FilterProjectInput`, return paginated result; add `status` support to `create`/`update` |
| `apps/api/src/modules/projects/projects.resolver.ts` | Update `myProjects` signature and return type; add `status` to Project entity resolver; add filter args to `transactions` ResolveField |
| `apps/api/src/modules/projects/entities/project.entity.ts` | Add `status: ProjectStatus` field; add `transactions?: PaginatedProjectTransactionsResponse` field declaration (required for NestJS Code First schema generation even though the value is resolved via `@ResolveField`) |
| `apps/api/src/modules/projects/dto/create-project.input.ts` | Add optional `status` field (UpdateProjectInput inherits via PartialType — no change needed there) |
| `apps/api/src/modules/witnesses/witnesses.service.ts` | Update `findMyRequests` to accept `FilterWitnessInput`, return paginated result |
| `apps/api/src/modules/witnesses/witnesses.resolver.ts` | Update `myWitnessRequests` signature and return type |
| `apps/api/src/modules/witnesses/entities/witness.entity.ts` | Make `transactionId` nullable; ensure `projectTransactionId` is handled |
| `apps/api/src/generated/prisma/enums.ts` | Auto-generated after migration |

### Frontend
| File | Change |
|------|--------|
| `apps/web/src/types/__generated__/graphql.ts` | Auto-generated after schema update |
| `apps/web/src/lib/apollo/queries/transactions.ts` | Update `GET_TRANSACTIONS` + `GET_MY_CONTACT_TRANSACTIONS` for pagination |
| `apps/web/src/lib/apollo/queries/contacts.ts` | Update `GET_CONTACTS` for pagination + filter |
| `apps/web/src/lib/apollo/queries/projects.ts` | Add `status` to `PROJECT_FRAGMENT`; update `GET_MY_PROJECTS` for pagination + filter; update `GET_PROJECT` transactions field for pagination |
| `apps/web/src/lib/apollo/queries/witnesses.ts` | Update witness queries for pagination + filter |
| `apps/web/src/hooks/useTransactions.ts` | Accept filter with pagination vars, return `total`/`page`/`limit` |
| `apps/web/src/hooks/useContacts.ts` | Accept `FilterContactInput`, return paginated result |
| `apps/web/src/hooks/useProjects.ts` | Accept `FilterProjectInput`, return paginated result |
| `apps/web/src/hooks/useWitnesses.ts` | Accept `FilterWitnessInput`, return paginated result |
| `apps/web/src/routes/transactions/index.tsx` | Add `useTransactionFilters`, `DateRangePicker`, `Pagination` |
| `apps/web/src/routes/contacts/index.tsx` | Add `useContactFilters`, balance standing control, `Pagination` |
| `apps/web/src/routes/contacts/$contactId.tsx` | Add compact filter bar, `Pagination` |
| `apps/web/src/routes/projects/index.tsx` | Add `useProjectFilters`, filter controls, `Pagination` |
| `apps/web/src/routes/projects/$projectId.tsx` | Add compact filter bar, `Pagination` |
| `apps/web/src/routes/transactions/my-contact-transactions.tsx` | Add `useSharedHistoryFilters`, filter bar, `Pagination` |
| `apps/web/src/routes/witnesses/index.tsx` | Add `useWitnessFilters`, filter bar, `Pagination` per tab |
