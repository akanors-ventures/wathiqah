# Pagination & Filters Design

**Date:** 2026-03-23
**Scope:** Transactions, Contacts, Contact Details, Projects, Project Details, My Contact Transactions (Shared History), Witness Requests

---

## Problem

All data-heavy pages currently fetch everything at once and apply filtering client-side via `useState`. As data grows, this degrades performance and usability. There is no pagination, no date range filtering on transactions, no balance-based filtering on contacts or projects, and no project status concept.

---

## Goals

1. Add client-side pagination to all list/table pages
2. Add date range filtering to transaction-heavy pages
3. Add balance standing filter to contacts and projects pages
4. Add project status (`ACTIVE`, `COMPLETED`, `ARCHIVED`) via schema migration
5. Add search + date range + witness-specific filters to the Witness Requests page
6. Preserve all existing functionality — no regressions

---

## Architecture

### Approach: Shared Primitives + Per-Feature Filter Hooks

Follows the existing hook pattern (`useTransactions`, `useContacts`, `useProjects`). Shared primitive UI components handle rendering; per-feature hooks manage filter state and apply filtering logic.

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
- Migration file generated via `pnpm --filter api db:generate`

### 2. Projects GraphQL Type

- Add `status: ProjectStatus!` field to `Project` entity
- Add optional `status?: ProjectStatus` to `CreateProjectInput` (defaults to `ACTIVE`)
- Add optional `status?: ProjectStatus` to `UpdateProjectInput`
- Expose `ProjectStatus` enum in GraphQL schema

---

## Shared Frontend Primitives

### `usePagination<T>` Hook

**Path:** `apps/web/src/hooks/usePagination.ts`

```typescript
usePagination<T>(items: T[], defaultPageSize?: number) => {
  paginatedItems: T[]
  page: number
  setPage: (page: number) => void
  pageSize: number
  setPageSize: (size: number) => void
  totalPages: number
  totalItems: number
}
```

- Resets to page 1 when `items` changes (i.e., when filters change)
- Default page size: 25

### `Pagination` Component

**Path:** `apps/web/src/components/ui/pagination.tsx`

- Page number controls (prev / page numbers / next)
- Items-per-page selector (10 / 25 / 50)
- "Showing X–Y of Z results" label
- Hides itself when total items ≤ page size

### `DateRangePicker` Component

**Path:** `apps/web/src/components/ui/date-range-picker.tsx`

- Two date inputs: From / To
- Clear button resets both
- Validates that `from` ≤ `to`
- Returns `{ from: Date | null, to: Date | null }`

---

## Per-Feature Filter Hooks

### `useTransactionFilters`

**Path:** `apps/web/src/hooks/useTransactionFilters.ts`

Manages: `search`, `type` (ALL | GIVEN | RECEIVED | RETURNED_TO_ME | RETURNED_TO_CONTACT | INCOME | EXPENSE | GIFT_GIVEN | GIFT_RECEIVED), `status` (ALL | COMPLETED | PENDING | CANCELLED), `currency` (ALL | NGN | USD | EUR | GBP | CAD | AED | SAR), `dateRange` ({ from, to })

Returns filtered transaction array + all state setters.

### `useContactFilters`

**Path:** `apps/web/src/hooks/useContactFilters.ts`

Manages: `search` (name / email / phone), `balanceStanding` (ALL | OWED_TO_ME | I_OWE)

- `OWED_TO_ME`: contacts where `balance > 0`
- `I_OWE`: contacts where `balance < 0`

### `useProjectFilters`

**Path:** `apps/web/src/hooks/useProjectFilters.ts`

Manages: `search` (project name), `status` (ALL | ACTIVE | COMPLETED | ARCHIVED), `balanceStanding` (ALL | UNDER_BUDGET | OVER_BUDGET)

- `UNDER_BUDGET`: projects where current balance ≤ budget
- `OVER_BUDGET`: projects where current balance > budget

### `useSharedHistoryFilters`

**Path:** `apps/web/src/hooks/useSharedHistoryFilters.ts`

Manages: `search` (description or recorder name), `type`, `status`, `dateRange`

### `useWitnessFilters`

**Path:** `apps/web/src/hooks/useWitnessFilters.ts`

Manages: `search` (transaction description or requester name), `dateRange`

Applied per tab (pending / history) — the tab selection itself acts as the status filter.

---

## Page-by-Page Changes

### 1. Transactions Page (`/transactions`)

**File:** `apps/web/src/routes/transactions/index.tsx`

- Replace inline filter state with `useTransactionFilters`
- Add `DateRangePicker` to the existing filter bar (alongside type/status/currency)
- Add `usePagination` consuming the filtered result
- Render `Pagination` below table/cards on both Funds and Items tabs
- Date range applies to both tabs independently

### 2. Contacts Page (`/contacts`)

**File:** `apps/web/src/routes/contacts/index.tsx`

- Add `useContactFilters` (search already exists — migrate into hook)
- Add balance standing segmented control: `All | They Owe Me | I Owe Them`
- Add `usePagination` consuming the filtered contacts
- Render `Pagination` below the contact grid

### 3. Contact Details Page (`/contacts/$contactId`)

**File:** `apps/web/src/routes/contacts/$contactId.tsx`

- Add compact filter bar: `DateRangePicker` + type selector + status selector
- Add `useTransactionFilters` scoped to the contact's transaction list
- Add `usePagination` consuming filtered transactions
- Render `Pagination` below the transaction table

### 4. Projects Page (`/projects`)

**File:** `apps/web/src/routes/projects/index.tsx`

- Add `useProjectFilters` (search + status + balance standing)
- Add search input + status segmented control (`All | Active | Completed | Archived`) + balance standing filter (`All | Under Budget | Over Budget`)
- Add `usePagination`
- Render `Pagination` below the project grid

### 5. Project Details Page (`/projects/$projectId`)

**File:** `apps/web/src/routes/projects/$projectId.tsx`

- Add compact filter bar: `DateRangePicker` + type (INCOME/EXPENSE) + category dropdown (derived dynamically from transaction categories present in the project)
- Add `usePagination` consuming filtered project transactions
- Render `Pagination` below the transaction table

### 6. My Contact Transactions / Shared History (`/transactions/my-contact-transactions`)

**File:** `apps/web/src/routes/transactions/my-contact-transactions.tsx`

- Add `useSharedHistoryFilters`
- Add filter bar: search input + `DateRangePicker` + type selector + status selector
- Add `usePagination`
- Render `Pagination` below the transaction table

### 7. Witness Requests (`/witnesses`)

**File:** `apps/web/src/routes/witnesses/index.tsx`

- Add `useWitnessFilters`
- Add filter bar: search input + `DateRangePicker`
- Filters apply within the active tab (Pending / History)
- Add `usePagination` per tab
- Render `Pagination` below each tab's list

---

## Data Flow

```
Route Component
  └─ useXxxFilters()         → filtered array
       └─ usePagination()    → paginatedItems + page controls
            └─ renders list + <Pagination />
```

Filter state resets pagination to page 1 on every filter change (handled inside `usePagination` via `useEffect` on `items`).

---

## Error Handling & Edge Cases

- Empty state: when filtered result is 0 items, show existing empty state UI (no new component needed)
- `Pagination` hides when `totalItems <= pageSize` to avoid unnecessary chrome
- DateRangePicker: if `to` < `from`, swap silently or show inline validation
- Balance standing on contacts requires `balance` field — already computed via `ResolveField` in backend, present in `GET_CONTACTS` query response
- Project `balanceStanding` filter derives from `balance` and `budget` fields already returned by `GET_MY_PROJECTS`

---

## Testing Considerations

- `usePagination`: unit test page calculation, reset on items change, pageSize changes
- `useTransactionFilters` / `useContactFilters` / `useProjectFilters`: unit test each filter predicate independently
- Integration: verify filters + pagination compose correctly (filter narrows items, pagination resets to page 1)
- No backend tests needed for filter hooks (client-side only); backend test needed for `ProjectStatus` migration and new GraphQL fields

---

## Files to Create

| File | Type |
|------|------|
| `apps/web/src/hooks/usePagination.ts` | New |
| `apps/web/src/hooks/useTransactionFilters.ts` | New |
| `apps/web/src/hooks/useContactFilters.ts` | New |
| `apps/web/src/hooks/useProjectFilters.ts` | New |
| `apps/web/src/hooks/useSharedHistoryFilters.ts` | New |
| `apps/web/src/hooks/useWitnessFilters.ts` | New |
| `apps/web/src/components/ui/date-range-picker.tsx` | New |
| `apps/web/src/components/ui/pagination.tsx` | New (extend or replace shadcn base) |

## Files to Modify

| File | Change |
|------|--------|
| `apps/api/prisma/schema.prisma` | Add `ProjectStatus` enum + `Project.status` field |
| `apps/api/src/modules/projects/entities/project.entity.ts` | Add `status` GraphQL field |
| `apps/api/src/modules/projects/dto/create-project.input.ts` | Add optional `status` |
| `apps/api/src/modules/projects/dto/update-project.input.ts` | Add optional `status` |
| `apps/api/src/generated/prisma/enums.ts` | Auto-generated after migration |
| `apps/web/src/types/__generated__/graphql.ts` | Auto-generated after schema update |
| `apps/web/src/routes/transactions/index.tsx` | Filters + pagination |
| `apps/web/src/routes/contacts/index.tsx` | Filters + pagination |
| `apps/web/src/routes/contacts/$contactId.tsx` | Filters + pagination |
| `apps/web/src/routes/projects/index.tsx` | Filters + pagination |
| `apps/web/src/routes/projects/$projectId.tsx` | Filters + pagination |
| `apps/web/src/routes/transactions/my-contact-transactions.tsx` | Filters + pagination |
| `apps/web/src/routes/witnesses/index.tsx` | Filters + pagination |
