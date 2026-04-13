# Pending: PersonalEntry Plan

**Status:** Blocked on transaction type restructure (merged). Ready to implement.

**Context:** After the transaction type restructure, `EXPENSE` and `INCOME` remain in the `TransactionType` enum for backward compatibility. Existing rows using these values are preserved but new creation is blocked via `@IsNotIn` guard in `CreateTransactionInput`.

---

## Goal

Move personal income/expense tracking out of the `transactions` table into a dedicated `personal_entries` table, then drop `EXPENSE` and `INCOME` from `TransactionType`.

---

## Why

- `transactions` is for contact-obligation records (loans, repayments, gifts, etc.)
- Personal income/expenses have no contact, no witness system, no shared-ledger semantics
- Mixing them forces awkward balance computation exclusions and UI branching

---

## What to Build

### 1. New `PersonalEntry` model

```prisma
model PersonalEntry {
  id          String              @id @default(uuid())
  type        PersonalEntryType
  amount      Decimal             @db.Decimal(10, 2)
  currency    String              @default("NGN")
  category    String?             // e.g. "food", "salary", "rent"
  date        DateTime
  description String?
  createdAt   DateTime            @default(now())
  createdById String
  createdBy   User                @relation(fields: [createdById], references: [id])

  @@map("personal_entries")
}

enum PersonalEntryType {
  INCOME
  EXPENSE
}
```

### 2. Data migration

```sql
INSERT INTO personal_entries (id, type, amount, currency, date, description, created_at, created_by_id)
SELECT id, type::text::personal_entry_type, amount, currency, date, description, created_at, created_by_id
FROM transactions
WHERE type IN ('INCOME', 'EXPENSE');

DELETE FROM transactions WHERE type IN ('INCOME', 'EXPENSE');
```

Then drop `EXPENSE` and `INCOME` from `TransactionType` using the manual enum recreation pattern (see CLAUDE.md).

### 3. Backend module

- `PersonalEntriesModule` with CRUD resolver + service
- GraphQL queries: `personalEntries(filter)`, `personalEntrySummary`
- Summary fields: `totalIncome`, `totalExpenses`, `netCashPosition`

### 4. Dashboard cash position

Replace the current placeholder with: `netCashPosition = totalIncome − totalExpenses` from `PersonalEntrySummary`. This completes the dashboard balance logic deferred from the transaction type restructure.

### 5. Frontend

- New `/entries` route (or integrate into existing transactions page as a third tab)
- Form for creating INCOME / EXPENSE entries (no contact required, optional category)
- Dashboard widget showing personal cash position

---

## Atlas migration notes

- This requires two migrations: (a) add `personal_entries` table, (b) data migration + drop EXPENSE/INCOME from enum
- Migration (b) must use manual enum recreation — see CLAUDE.md "Removing PostgreSQL enum values"
- Run `pnpm --filter api db:apply` and verify zero errors before committing each
