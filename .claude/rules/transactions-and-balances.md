# Transactions, Balances & Witnesses

Loads when touching `transactions.service.ts`, `contacts.service.ts`, `TransactionType`/`AssetCategory` enums, or any balance/net-obligation computation.

## AssetCategory Enum

All code should use the `AssetCategory` enum instead of hardcoded strings:

**Backend** (`apps/api/src/generated/prisma/enums.ts`): `AssetCategory.FUNDS` (`'FUNDS'`, monetary transactions), `AssetCategory.ITEM` (`'ITEM'`, physical items).

**Frontend** (`apps/web/src/types/__generated__/graphql.ts`): `AssetCategory.Funds` (`'FUNDS'`), `AssetCategory.Item` (`'ITEM'`).

Do not use hardcoded strings like `"FUNDS"` or `"ITEM"` in comparisons.

## Transaction Types & Color Coding

12 self-describing formal types replace the old ambiguous ones:

| Type                 | Meaning                                    | Color   | Contact-standing sign        |
| -------------------- | ------------------------------------------ | ------- | ---------------------------- |
| `LOAN_GIVEN`         | I lent money out                           | Blue    | + (contact owes me)          |
| `LOAN_RECEIVED`      | I borrowed money                           | Rose    | − (I owe contact)            |
| `REPAYMENT_MADE`     | I repaid a debt (cash out, debt-clearing)  | Emerald | + (reduces my debt)          |
| `REPAYMENT_RECEIVED` | Contact repaid me (cash in, debt-clearing) | Emerald | − (reduces their debt)       |
| `GIFT_GIVEN`         | Gift I gave                                | Pink    | _(no obligation)_            |
| `GIFT_RECEIVED`      | Gift I received                            | Purple  | _(no obligation)_            |
| `ADVANCE_PAID`       | Advance I paid out                         | Orange  | + (contact owes goods/money) |
| `ADVANCE_RECEIVED`   | Advance I received                         | Purple  | − (I owe goods/service)      |
| `DEPOSIT_PAID`       | Deposit I paid                             | Orange  | + (contact owes it back)     |
| `DEPOSIT_RECEIVED`   | Deposit I received                         | Purple  | − (I owe it back)            |
| `ESCROWED`           | Cash I'm holding                           | Emerald | − (I owe disbursement)       |
| `REMITTED`           | Cash I disbursed                           | Orange  | + (I paid on their behalf)   |
| `EXPENSE`            | Personal expense _(legacy, read-only)_     | —       | —                            |
| `INCOME`             | Personal income _(legacy, read-only)_      | —       | —                            |

Use `AssetCategory.FUNDS` and `AssetCategory.ITEM` when referencing categories in code.

**TransactionType enum active values**: the 12 types above. `EXPENSE`/`INCOME` remain in the DB enum for existing rows but new creation is blocked via `@IsNotIn` guard — a follow-up PersonalEntry plan will migrate them.

- `Transaction.amount` is `Decimal?` — always use `.toNumber()` with a null guard (e.g. `?.toNumber() ?? 0`)
- There is no `returnDirection` field. Direction is encoded in the type name itself.

## Shared Ledger & Perspective Flipping

When a transaction's contact is a registered user (`linkedUserId`), the transaction is visible to both parties. Perspectives flip via `PERSPECTIVE_FLIP_MAP` in `transactions.service.ts`:

- `LOAN_GIVEN ↔ LOAN_RECEIVED`
- `REPAYMENT_MADE ↔ REPAYMENT_RECEIVED`
- `GIFT_GIVEN ↔ GIFT_RECEIVED`
- `ADVANCE_PAID ↔ ADVANCE_RECEIVED`
- `DEPOSIT_PAID ↔ DEPOSIT_RECEIVED`
- `ESCROWED ↔ REMITTED`

## Witness System

- **States**: `PENDING` → `ACKNOWLEDGED` | `DECLINED` | `MODIFIED`
- **No Deletion**: Transactions with witnesses cannot be deleted; mark as `CANCELLED` instead
- **Status Reset**: Updating an `ACKNOWLEDGED` transaction resets all witnesses to `MODIFIED`
- See `WITNESS_SYSTEM.md` for full details

## Balance Logic

- **Net Balance (contact-obligation)**: Computed by `computeNetBalance()` in `transactions.service.ts` using all 12 new types. EXPENSE/INCOME are excluded. Formula: `(LOAN_RECEIVED − LOAN_GIVEN) + (REPAYMENT_RECEIVED − REPAYMENT_MADE) + (GIFT_RECEIVED − GIFT_GIVEN) + (ADVANCE_RECEIVED − ADVANCE_PAID) + (DEPOSIT_RECEIVED − DEPOSIT_PAID) + (ESCROWED − REMITTED)`
- **Contact Standing**: Computed via `CONTACT_STANDING_SIGN` in `contacts.service.ts`. GIFT types are excluded (no ongoing obligation). Positive = contact owes me, negative = I owe contact.
- **Sign convention warning**: Net Balance and Contact Standing use _opposite_ sign conventions for the same transaction types (confirmed against `transactions.balance.spec.ts`) — e.g. `LOAN_GIVEN` makes Contact Standing positive (contact owes me) but makes Net Balance _negative_. Don't assume the two move together; check the existing test suite before asserting an expected value for either.
- **Cash Position (Dashboard)**: Displayed as a dedicated stat card in `components/dashboard/Dashboard.tsx` alongside Total Balance, Inflow, and Outflow. Sourced from `PersonalEntriesTab` cash position computation — not from transaction types.
- **Project Balance**: `project.balance` = `totalIncome − totalExpenses` — `totalIncome`/`totalExpenses` are `@ResolveField` on `Project`, unrelated to transaction types above. See `.claude/rules/backend-conventions.md` for the budget-remaining formula.

## Transaction Settlement — Locking Pattern

Any write that validates against or mutates settled/allocated amounts on a `Transaction` row (amount shrink, void-on-delete/cancel) must take `SELECT ... FOR UPDATE` on that row immediately before the validation read, not earlier — `TransactionAllocationsService.allocate()` takes the same lock before creating a `TransactionAllocation`, and a stale pre-lock read lets a concurrent allocation land in the gap. `computeOutstanding`'s `Math.max(0, ...)` clamp hides the resulting over-settlement permanently, so it never surfaces as an error. See `transactions.service.ts`'s `update()` for the reference pattern; `syncMirroredAmount` and `TransactionSettlementService.voidAllocationsFor` follow the same shape.

Prisma test mocks for `TransactionsService`/`TransactionSettlementService` need `$queryRaw: jest.fn().mockResolvedValue([])` or lock-taking code throws `TypeError: tx.$queryRaw is not a function`.
