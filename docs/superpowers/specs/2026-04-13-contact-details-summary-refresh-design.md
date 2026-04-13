# Contact Details: Expanded Money Flow Summary & Transaction Refresh Fix

**Date:** 2026-04-13  
**Status:** Approved

---

## Problem

1. The contact details page summary section only shows 5 cards (Net Balance, Loan Given, Loan Received, Repayments Received, Repayments Made). The remaining 8 transaction types — gifts, advances, deposits, escrow, remitted — are not reflected anywhere in the summary.

2. The transaction history table on the contact details page does not update when a new transaction is created. The user must hard-refresh the page to see it.

---

## Goals

- Show all money flows between the user and a contact, scoped to the active date range filter.
- Keep the UI clean — secondary flows (gifts, advances, deposits, escrow) must not add visual noise when they have no values.
- Fix the stale transaction list after creation without adding complexity.

---

## Design

### Feature 1 — ContactSummaryCards Component

**New file:** `apps/web/src/components/contacts/ContactSummaryCards.tsx`

#### Props

```ts
interface ContactSummaryCardsProps {
  summary: TransactionSummary; // from GET_TRANSACTIONS query — already has all 12 fields
  contactBalance: number; // contact.balance for the Net Balance card
}
```

#### Layout

**Row 1 — always visible (3 columns):**
| Card | Value | Colour |
|---|---|---|
| Net Balance | `contact.balance` | Emerald (positive) / Rose (negative) via `BalanceIndicator` |
| Total Loaned Out | `summary.totalLoanGiven` | Blue |
| Total Borrowed | `summary.totalLoanReceived` | Rose |

**Row 2 — always visible (2 columns):**
| Card | Value | Colour |
|---|---|---|
| Repayments Received | `summary.totalRepaymentReceived` | Emerald |
| Repayments Made | `summary.totalRepaymentMade` | Emerald |

**"Other Flows" collapsible panel:**

- Only renders when `max(totalGiftGiven, totalGiftReceived, totalAdvancePaid, totalAdvanceReceived, totalDepositPaid, totalDepositReceived, totalEscrowed, totalRemitted) > 0`
- Collapsed by default; toggled with local `useState`
- Inner grid: 4 columns on desktop, 2 on mobile
- Cards shown: Gift Given (Pink), Gift Received (Purple), Advance Paid (Orange), Advance Received (Purple), Deposit Paid (Orange), Deposit Received (Purple), Escrowed (Emerald), Remitted (Orange)
- Only cards with a non-zero value are rendered inside the panel

#### Integration in `$contactId.tsx`

Replace the current inline summary grid block:

```tsx
// before
{
  summary && (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
      {/* 5 inline cards */}
    </div>
  );
}

// after
{
  summary && (
    <ContactSummaryCards summary={summary} contactBalance={contact.balance} />
  );
}
```

All values respond to the existing date range + type filter automatically — `summary` is derived from the filtered `GET_TRANSACTIONS` query, so no extra data wiring is needed.

---

### Feature 2 — Transaction List Refresh Fix

**File:** `apps/web/src/routes/contacts/$contactId.tsx`

**Root cause:** The `useQuery(GET_TRANSACTIONS, ...)` call uses the default `"cache-first"` fetch policy. When the user navigates away to `/transactions/new`, creates a transaction, and returns, Apollo serves the stale cached result instead of re-fetching.

The `CREATE_TRANSACTION` mutation in `useTransactions` already has `refetchQueries: ["Transactions"]`, which correctly invalidates the cache for active observers. The problem is that the contact details page is unmounted during the navigation, so it is not an active observer at mutation time, and on re-mount it reads from stale cache.

**Fix:** Add `fetchPolicy: "cache-and-network"` to the query:

```ts
const { data: txData, loading: txLoading } = useQuery(GET_TRANSACTIONS, {
  variables: { filter: { ...variables.filter, contactId } },
  fetchPolicy: "cache-and-network",
});
```

`"cache-and-network"` renders cached data immediately (no flash of empty state) while always issuing a network request on mount — ensuring the list is always up to date after any navigation.

---

## Out of Scope

- Changing the backend `summary` resolver — it already returns all 12 fields.
- Adding period filter UI — the date range picker already exists and already affects `summary`.
- Modifying any other page.

---

## Files Changed

| File                                                       | Change                                                                                                                        |
| ---------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `apps/web/src/components/contacts/ContactSummaryCards.tsx` | **New** — renders all summary cards including collapsible "Other Flows"                                                       |
| `apps/web/src/routes/contacts/$contactId.tsx`              | Replace inline summary block with `<ContactSummaryCards>`; add `fetchPolicy: "cache-and-network"` to `GET_TRANSACTIONS` query |
