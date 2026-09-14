# Backend Conventions

Loads when writing NestJS controllers/resolvers/services outside the areas that already have their own rule file (migrations, admin console, subscriptions, transactions).

## HTTP Controllers & Auth

- HTTP controllers are **unauthenticated by default** — auth is GraphQL-only via `GqlAuthGuard`; no `@Public()` decorator exists or is needed.
- NestJS global prefix is `/api` — all HTTP routes are under `/api/`, critical when constructing webhook URLs.

## Notifications

- `SubscriptionModule` is `@Global()` — `SubscriptionService` is injectable anywhere without adding it to module imports.
- BullMQ queue name is `'notifications'`; see `NotificationsProcessor` for existing job patterns.
- Format currency amounts with `getLocaleForCurrency` + `Intl.NumberFormat` — never concatenate raw ISO codes (e.g. `"NGN"`).
- Two separate SMS gates: `allowSMS` (witness invite SMS — boolean, Pro only) and `contactNotificationSms` (contact notification SMS sent when a witness verifies a transaction — monthly counter, 10/month free, unlimited Pro). These gate independent code paths and are not redundant.

## Prisma Interactive Transactions — Default Timeout

`prisma.$transaction(async (tx) => {...})` has a **5000ms default timeout** with no override. A loop inside it that does several sequential DB calls per iteration (create + history write + status recompute, etc.) can exceed this once the loop runs enough iterations — caused a real `INTERNAL_SERVER_ERROR` in `transaction-allocations.service.ts`'s `allocate()` at ~6 iterations. Pass an explicit `{ timeout }` as the second argument for any interactive transaction whose body loops over a caller-controlled list, sized to the realistic max batch size — but treat this as a stopgap, not a fix: round trips still scale with the loop, so prefer batching (`createMany`, one `findMany` instead of N `findUnique`s) when the loop's per-item work allows it.

## Project Fund Balance Semantics

- `project.balance` = `totalIncome − totalExpenses` (net cash position, not a budget figure)
- **Budget remaining** = `budget − totalExpenses` — never `budget − balance`, which incorrectly factors in income
- `totalIncome` and `totalExpenses` are `@ResolveField` on `Project`; always include them in fragments when budget analytics are needed

## ESLint

`@typescript-eslint/no-explicit-any` is enforced — use `unknown` or double-cast (`as unknown as T`) in tests, never `as any`.
