# Contact Details: Expanded Summary & Refresh Fix Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a full money-flow summary (all 12 transaction types) to the contact details page via a new `ContactSummaryCards` component, and fix the transaction list going stale after a new transaction is created.

**Architecture:** A new `ContactSummaryCards` component receives the existing `TransactionsSummary` object (already returned by `GET_TRANSACTIONS`) and renders primary stats always, with secondary flows (gifts, advances, deposits, escrow) in a collapsible panel that only appears when at least one value is non-zero. The refresh fix is a single `fetchPolicy` change on the query in `$contactId.tsx`.

**Tech Stack:** React 19, TanStack Start, Apollo Client, Shadcn UI (Card, Badge), Tailwind CSS, Vitest + @testing-library/react

**Spec:** `docs/superpowers/specs/2026-04-13-contact-details-summary-refresh-design.md`

---

## File Map

| File                                                            | Action     | Responsibility                                                       |
| --------------------------------------------------------------- | ---------- | -------------------------------------------------------------------- |
| `apps/web/src/components/contacts/ContactSummaryCards.tsx`      | **Create** | Renders all summary cards + collapsible "Other Flows" panel          |
| `apps/web/src/components/contacts/ContactSummaryCards.test.tsx` | **Create** | Unit tests for the component                                         |
| `apps/web/src/routes/contacts/$contactId.tsx`                   | **Modify** | Replace inline summary block; add `fetchPolicy: "cache-and-network"` |

---

## Task 1: ContactSummaryCards — failing tests

**Files:**

- Create: `apps/web/src/components/contacts/ContactSummaryCards.test.tsx`

- [ ] **Step 1.1: Write the test file**

```tsx
// apps/web/src/components/contacts/ContactSummaryCards.test.tsx
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ContactSummaryCards } from "./ContactSummaryCards";
import type { TransactionsSummary } from "@/types/__generated__/graphql";

const baseSummary: TransactionsSummary = {
  __typename: "TransactionsSummary",
  totalLoanGiven: 500000,
  totalLoanReceived: 200000,
  totalRepaymentMade: 40000,
  totalRepaymentReceived: 80000,
  totalGiftGiven: 0,
  totalGiftReceived: 0,
  totalAdvancePaid: 0,
  totalAdvanceReceived: 0,
  totalDepositPaid: 0,
  totalDepositReceived: 0,
  totalEscrowed: 0,
  totalRemitted: 0,
  netBalance: 0,
  currency: "NGN",
};

describe("ContactSummaryCards", () => {
  it("always renders primary stats", () => {
    render(
      <ContactSummaryCards summary={baseSummary} contactBalance={450000} />,
    );
    expect(screen.getByText("Total Loaned Out")).toBeInTheDocument();
    expect(screen.getByText("Total Borrowed")).toBeInTheDocument();
    expect(screen.getByText("Repayments Received")).toBeInTheDocument();
    expect(screen.getByText("Repayments Made")).toBeInTheDocument();
    expect(screen.getByText("Net Balance with Contact")).toBeInTheDocument();
  });

  it("hides Other Flows panel when all secondary values are zero", () => {
    render(<ContactSummaryCards summary={baseSummary} contactBalance={0} />);
    expect(screen.queryByText("Other Flows")).not.toBeInTheDocument();
  });

  it("shows Other Flows panel when at least one secondary value is non-zero", () => {
    const summary = { ...baseSummary, totalAdvancePaid: 300000 };
    render(<ContactSummaryCards summary={summary} contactBalance={0} />);
    expect(screen.getByText("Other Flows")).toBeInTheDocument();
  });

  it("Other Flows panel is collapsed by default", () => {
    const summary = { ...baseSummary, totalAdvancePaid: 300000 };
    render(<ContactSummaryCards summary={summary} contactBalance={0} />);
    expect(screen.queryByText("Advance Paid")).not.toBeInTheDocument();
  });

  it("expands Other Flows on click", () => {
    const summary = { ...baseSummary, totalAdvancePaid: 300000 };
    render(<ContactSummaryCards summary={summary} contactBalance={0} />);
    fireEvent.click(screen.getByText("Other Flows"));
    expect(screen.getByText("Advance Paid")).toBeInTheDocument();
  });

  it("only renders non-zero cards inside Other Flows", () => {
    const summary = {
      ...baseSummary,
      totalAdvancePaid: 300000,
      totalGiftGiven: 0,
    };
    render(<ContactSummaryCards summary={summary} contactBalance={0} />);
    fireEvent.click(screen.getByText("Other Flows"));
    expect(screen.getByText("Advance Paid")).toBeInTheDocument();
    expect(screen.queryByText("Gift Given")).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 1.2: Run tests to verify they fail**

```bash
pnpm --filter web test -- ContactSummaryCards
```

Expected: FAIL — `Cannot find module './ContactSummaryCards'`

---

## Task 2: ContactSummaryCards — implementation

**Files:**

- Create: `apps/web/src/components/contacts/ContactSummaryCards.tsx`

- [ ] **Step 2.1: Create the component**

```tsx
// apps/web/src/components/contacts/ContactSummaryCards.tsx
import { useState } from "react";
import {
  ArrowDownLeft,
  ArrowRightLeft,
  ArrowUpRight,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import { BalanceIndicator } from "@/components/ui/balance-indicator";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils/formatters";
import type { TransactionsSummary } from "@/types/__generated__/graphql";

interface ContactSummaryCardsProps {
  summary: TransactionsSummary;
  contactBalance: number;
}

interface SecondaryFlow {
  label: string;
  value: number;
  colorClass: string;
}

export function ContactSummaryCards({
  summary,
  contactBalance,
}: ContactSummaryCardsProps) {
  const [otherFlowsOpen, setOtherFlowsOpen] = useState(false);

  const secondaryFlows: SecondaryFlow[] = [
    {
      label: "Gift Given",
      value: summary.totalGiftGiven,
      colorClass: "text-pink-600",
    },
    {
      label: "Gift Received",
      value: summary.totalGiftReceived,
      colorClass: "text-purple-600",
    },
    {
      label: "Advance Paid",
      value: summary.totalAdvancePaid,
      colorClass: "text-orange-600",
    },
    {
      label: "Advance Received",
      value: summary.totalAdvanceReceived,
      colorClass: "text-purple-600",
    },
    {
      label: "Deposit Paid",
      value: summary.totalDepositPaid,
      colorClass: "text-orange-600",
    },
    {
      label: "Deposit Received",
      value: summary.totalDepositReceived,
      colorClass: "text-purple-600",
    },
    {
      label: "Escrowed",
      value: summary.totalEscrowed,
      colorClass: "text-emerald-600",
    },
    {
      label: "Remitted",
      value: summary.totalRemitted,
      colorClass: "text-orange-600",
    },
  ];

  const visibleSecondaryFlows = secondaryFlows.filter((f) => f.value > 0);
  const hasOtherFlows = visibleSecondaryFlows.length > 0;

  return (
    <div className="space-y-4">
      {/* Row 1: Net Balance + Loans */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Net Balance with Contact
            </CardTitle>
            <div className="h-4 w-4 text-muted-foreground">💰</div>
          </CardHeader>
          <CardContent>
            <BalanceIndicator
              amount={contactBalance}
              currency="NGN"
              className="text-2xl px-3 py-1 h-auto"
            />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Loaned Out
            </CardTitle>
            <ArrowUpRight className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {formatCurrency(summary.totalLoanGiven, "NGN")}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Borrowed
            </CardTitle>
            <ArrowDownLeft className="h-4 w-4 text-rose-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-rose-600">
              {formatCurrency(summary.totalLoanReceived, "NGN")}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Row 2: Repayments */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Repayments Received
            </CardTitle>
            <ArrowRightLeft className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600">
              {formatCurrency(summary.totalRepaymentReceived, "NGN")}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Repayments Made
            </CardTitle>
            <ArrowRightLeft className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600">
              {formatCurrency(summary.totalRepaymentMade, "NGN")}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Other Flows — only renders when at least one secondary value is non-zero */}
      {hasOtherFlows && (
        <Card>
          <CardHeader
            className="flex flex-row items-center justify-between space-y-0 pb-2 cursor-pointer select-none"
            onClick={() => setOtherFlowsOpen((prev) => !prev)}
          >
            <CardTitle className="text-sm font-medium">Other Flows</CardTitle>
            {otherFlowsOpen ? (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            )}
          </CardHeader>
          {otherFlowsOpen && (
            <CardContent>
              <div className="grid gap-3 grid-cols-2 md:grid-cols-4">
                {visibleSecondaryFlows.map((flow) => (
                  <div key={flow.label} className="space-y-1">
                    <p className="text-xs font-medium text-muted-foreground">
                      {flow.label}
                    </p>
                    <p className={`text-base font-bold ${flow.colorClass}`}>
                      {formatCurrency(flow.value, "NGN")}
                    </p>
                  </div>
                ))}
              </div>
            </CardContent>
          )}
        </Card>
      )}
    </div>
  );
}
```

- [ ] **Step 2.2: Run tests to verify they pass**

```bash
pnpm --filter web test -- ContactSummaryCards
```

Expected: All 6 tests PASS

- [ ] **Step 2.3: Commit**

```bash
git add apps/web/src/components/contacts/ContactSummaryCards.tsx \
        apps/web/src/components/contacts/ContactSummaryCards.test.tsx
git commit -m "feat(contacts): add ContactSummaryCards with full 12-type summary and collapsible Other Flows"
```

---

## Task 3: Wire ContactSummaryCards into the contact details page

**Files:**

- Modify: `apps/web/src/routes/contacts/$contactId.tsx`

- [ ] **Step 3.1: Add the import at the top of `$contactId.tsx`**

In `apps/web/src/routes/contacts/$contactId.tsx`, add to the existing import block:

```tsx
import { ContactSummaryCards } from "@/components/contacts/ContactSummaryCards";
```

- [ ] **Step 3.2: Replace the inline summary grid with the new component**

Find and replace the inline summary block (currently lines ~208–268):

```tsx
// REMOVE this entire block:
{
  summary && (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            Net Balance with Contact
          </CardTitle>
          <div className="h-4 w-4 text-muted-foreground">💰</div>
        </CardHeader>
        <CardContent>
          <BalanceIndicator
            amount={contact.balance}
            currency="NGN"
            className="text-2xl px-3 py-1 h-auto"
          />
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            Total Loaned Out
          </CardTitle>
          <ArrowUpRight className="h-4 w-4 text-blue-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-blue-600">
            {formatCurrency(summary.totalLoanGiven, "NGN")}
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Borrowed</CardTitle>
          <ArrowDownLeft className="h-4 w-4 text-rose-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-rose-600">
            {formatCurrency(summary.totalLoanReceived, "NGN")}
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            Repayments Received
          </CardTitle>
          <ArrowRightLeft className="h-4 w-4 text-emerald-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-emerald-600">
            {formatCurrency(summary.totalRepaymentReceived, "NGN")}
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Repayments Made</CardTitle>
          <ArrowRightLeft className="h-4 w-4 text-emerald-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-emerald-600">
            {formatCurrency(summary.totalRepaymentMade, "NGN")}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
```

Replace with:

```tsx
{
  summary && (
    <ContactSummaryCards summary={summary} contactBalance={contact.balance} />
  );
}
```

- [ ] **Step 3.3: Clean up now-unused imports from `$contactId.tsx`**

Remove from the import block the icons that are no longer used directly in this file (they're now used inside `ContactSummaryCards`):

```tsx
// Remove these from the lucide-react import:
ArrowDownLeft,
ArrowRightLeft,
ArrowUpRight,
```

Also remove these component imports if they are no longer used elsewhere in the file:

```tsx
// Check if these are still used in the file; if not, remove them:
import { BalanceIndicator } from "@/components/ui/balance-indicator";
// formatCurrency — check if still used in exportToCSV; if yes, keep it
```

> **Note:** `formatCurrency` is used in `exportToCSV` — keep it. `BalanceIndicator` is no longer used in `$contactId.tsx` — remove it.

- [ ] **Step 3.4: Verify no TypeScript errors**

```bash
pnpm --filter web build 2>&1 | head -30
```

Expected: Build completes with no type errors. (It may warn about env vars — that is fine.)

- [ ] **Step 3.5: Commit**

```bash
git add apps/web/src/routes/contacts/'$contactId.tsx'
git commit -m "feat(contacts): replace inline summary with ContactSummaryCards component"
```

---

## Task 4: Fix transaction list stale cache on re-mount

**Files:**

- Modify: `apps/web/src/routes/contacts/$contactId.tsx`

- [ ] **Step 4.1: Add `fetchPolicy` to the GET_TRANSACTIONS query**

In `apps/web/src/routes/contacts/$contactId.tsx`, find the `useQuery(GET_TRANSACTIONS, ...)` call (currently ~line 85) and add `fetchPolicy`:

```tsx
// Before:
const { data: txData, loading: txLoading } = useQuery(GET_TRANSACTIONS, {
  variables: {
    filter: {
      ...variables.filter,
      contactId,
    },
  },
});

// After:
const { data: txData, loading: txLoading } = useQuery(GET_TRANSACTIONS, {
  variables: {
    filter: {
      ...variables.filter,
      contactId,
    },
  },
  fetchPolicy: "cache-and-network",
});
```

- [ ] **Step 4.2: Manually verify the fix**

1. Start the dev server: `pnpm dev`
2. Navigate to a contact's detail page
3. Click **Add Transaction** — this goes to `/transactions/new`
4. Fill in the form and submit
5. Use the browser back button or navigate back to the contact page
6. Confirm the new transaction appears in the list **without a hard refresh**

- [ ] **Step 4.3: Commit**

```bash
git add apps/web/src/routes/contacts/'$contactId.tsx'
git commit -m "fix(contacts): use cache-and-network so transaction list refreshes after creation"
```

---

## Self-Review

**Spec coverage:**

- ✅ `ContactSummaryCards` component created with correct props
- ✅ Row 1 (3 cols): Net Balance, Loan Given, Loan Received
- ✅ Row 2 (2 cols): Repayments Received, Repayments Made
- ✅ "Other Flows" panel: only renders when ≥1 secondary value > 0
- ✅ Only non-zero secondary cards render inside the panel
- ✅ Panel collapsed by default, toggled by click
- ✅ `$contactId.tsx` updated to use `ContactSummaryCards`
- ✅ `fetchPolicy: "cache-and-network"` added to fix stale list

**Placeholder scan:** No TBDs, no "similar to Task N", all code blocks complete.

**Type consistency:** `TransactionsSummary` used consistently across all tasks. `contactBalance: number` matches `contact.balance` which is typed as `number` in the generated GraphQL types.
