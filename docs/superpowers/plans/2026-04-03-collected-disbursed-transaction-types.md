# COLLECTED / DISBURSED Transaction Types Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add `COLLECTED` and `DISBURSED` transaction types to model cashless payment flows (e.g., RAPI agent collecting from a buyer and remitting to a farmer) and custodial holding scenarios — distinct from the loan semantics of `GIVEN`/`RECEIVED`.

**Architecture:** Eight tasks ordered so the codebase compiles and tests pass at every commit. Database migration first (Task 1), failing backend tests second (Task 2), then backend logic (Task 3), witnesses/notifications (Tasks 4–5), then frontend (Tasks 6–8). Balance semantics: `COLLECTED` is a positive inflow (credited to me, same direction as `GIVEN`); `DISBURSED` is a negative outflow (I am debited, same direction as `RECEIVED`). Perspectives flip between the two (`COLLECTED` ↔ `DISBURSED`) when a shared transaction is viewed from the contact's side.

**Tech Stack:** NestJS, Prisma 7, Atlas migrations, BullMQ, Handlebars, React 19, TanStack Router, Apollo Client, Zod, Shadcn UI, Vitest

---

## File Map

| Action | File                                                               | Change                                                                                                                                                 |
| ------ | ------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Modify | `apps/api/prisma/schema.prisma`                                    | Add `COLLECTED`, `DISBURSED` to `TransactionType` enum                                                                                                 |
| Modify | `apps/api/src/modules/transactions/transactions.service.ts`        | `TransactionSummary` interface; `updateSummaryWithTransaction`; two perspective-flip blocks; two `netBalance` formulas; two `getInitialSummary` blocks |
| Modify | `apps/api/src/modules/contacts/contacts.service.ts`                | `computeContactBalance` private method; inline balance loop in `findContactBalance`                                                                    |
| Modify | `apps/api/src/modules/witnesses/witnesses.service.ts`              | Add new types to `qualifyingTypes`                                                                                                                     |
| Modify | `apps/api/src/modules/notifications/notifications.processor.ts`    | Add labels to `typeLabels` in both SMS and email handlers                                                                                              |
| Modify | `apps/api/src/modules/transactions/transactions.balance.spec.ts`   | Tests for new types in summary and perspective flip                                                                                                    |
| Modify | `apps/api/src/modules/contacts/contacts.service.spec.ts`           | Tests for `computeContactBalance` with new types                                                                                                       |
| Modify | `apps/api/src/modules/witnesses/witnesses.service.spec.ts`         | Tests for `acknowledge()` with new types                                                                                                               |
| Modify | `apps/web/src/routes/transactions/new.tsx`                         | Zod schema; contact type validation refinement; `SelectItem` list                                                                                      |
| Modify | `apps/web/src/components/transactions/TransactionCard.tsx`         | `isPositive` logic; `getTheme()` cases                                                                                                                 |
| Modify | `apps/web/src/components/onboarding/SharedHistoryInterstitial.tsx` | `getTypeLabel`; `getTypeBadgeClass`                                                                                                                    |
| Modify | `apps/web/src/components/transactions/TransactionTypeHelp.tsx`     | Add tooltip entries for new types                                                                                                                      |

---

## Task 1: Database — add enum values and migrate

**Files:**

- Modify: `apps/api/prisma/schema.prisma`

- [ ] **Step 1.1: Add `COLLECTED` and `DISBURSED` to the `TransactionType` enum**

In `apps/api/prisma/schema.prisma`, find the `TransactionType` enum (currently `GIVEN RECEIVED RETURNED GIFT EXPENSE INCOME`). Replace it with:

```prisma
enum TransactionType {
  GIVEN
  RECEIVED
  RETURNED
  GIFT
  EXPENSE
  INCOME
  COLLECTED
  DISBURSED
}
```

- [ ] **Step 1.2: Regenerate the Prisma client**

```bash
cd /Users/fawazabdganiyu/akanors-ventures/apps/wathiqah && pnpm --filter api db:generate 2>&1 | tail -5
```

Expected: `Generated Prisma Client` message, no errors.

- [ ] **Step 1.3: Generate the Atlas migration**

```bash
cd /Users/fawazabdganiyu/akanors-ventures/apps/wathiqah && pnpm --filter api db:migrate 2>&1 | tail -10
```

Expected: New migration file created in `apps/api/atlas/migrations/`.

- [ ] **Step 1.4: Apply the migration locally**

```bash
cd /Users/fawazabdganiyu/akanors-ventures/apps/wathiqah && pnpm --filter api db:apply 2>&1 | tail -10
```

Expected: Migration applied with zero errors.

- [ ] **Step 1.5: Verify the new enum values are in the generated client**

```bash
grep -n "COLLECTED\|DISBURSED" /Users/fawazabdganiyu/akanors-ventures/apps/wathiqah/apps/api/src/generated/prisma/enums.ts
```

Expected: Both values appear.

- [ ] **Step 1.6: Commit**

```bash
cd /Users/fawazabdganiyu/akanors-ventures/apps/wathiqah && git add apps/api/prisma/schema.prisma apps/api/src/generated/ apps/api/atlas/ && git commit -m "feat(db): add COLLECTED and DISBURSED to TransactionType enum"
```

---

## Task 2: Write failing backend tests

**Files:**

- Modify: `apps/api/src/modules/transactions/transactions.balance.spec.ts`
- Modify: `apps/api/src/modules/contacts/contacts.service.spec.ts`
- Modify: `apps/api/src/modules/witnesses/witnesses.service.spec.ts`

- [ ] **Step 2.1: Add balance tests for new types in `transactions.balance.spec.ts`**

Open `apps/api/src/modules/transactions/transactions.balance.spec.ts`. After the last `it()` block inside the `'Balance Calculation (calculateConvertedSummary)'` describe, add:

```typescript
it("should accumulate COLLECTED as inflow and DISBURSED as outflow", async () => {
  (prisma.user.findUnique as jest.Mock).mockResolvedValue({
    preferredCurrency: "NGN",
  });
  (prisma.transaction.findMany as jest.Mock).mockResolvedValue([]);

  (prisma.transaction.groupBy as jest.Mock)
    .mockResolvedValueOnce([
      {
        type: TransactionType.COLLECTED,
        returnDirection: null,
        currency: "NGN",
        _sum: { amount: 30000 },
      },
      {
        type: TransactionType.DISBURSED,
        returnDirection: null,
        currency: "NGN",
        _sum: { amount: 20000 },
      },
    ])
    .mockResolvedValueOnce([]);

  const result = await service.findAll(userId);

  expect(result.summary.totalCollected).toBe(30000);
  expect(result.summary.totalDisbursed).toBe(20000);
  expect(result.summary.netBalance).toBe(10000); // 30000 - 20000
});

it("should flip COLLECTED to DISBURSED when processing shared (contact) transactions", async () => {
  (prisma.user.findUnique as jest.Mock).mockResolvedValue({
    preferredCurrency: "NGN",
  });
  (prisma.transaction.findMany as jest.Mock).mockResolvedValue([]);

  // Contact recorded COLLECTED (from my perspective that's DISBURSED — they collected from me)
  (prisma.transaction.groupBy as jest.Mock)
    .mockResolvedValueOnce([])
    .mockResolvedValueOnce([
      {
        type: TransactionType.COLLECTED,
        returnDirection: null,
        currency: "NGN",
        _sum: { amount: 15000 },
      },
    ]);

  const result = await service.findAll(userId);

  // When a contact recorded COLLECTED, from my view it appears as DISBURSED
  expect(result.summary.totalCollected).toBe(0);
  expect(result.summary.totalDisbursed).toBe(15000);
  expect(result.summary.netBalance).toBe(-15000);
});
```

- [ ] **Step 2.2: Add `computeContactBalance` tests in `contacts.service.spec.ts`**

Open `apps/api/src/modules/contacts/contacts.service.spec.ts`. After the existing `findAll` describe block, add a new describe block:

```typescript
describe("ContactsService — computeContactBalance", () => {
  let service: ContactsService;
  let prisma: { contact: { findMany: jest.Mock; count: jest.Mock } };

  beforeEach(async () => {
    prisma = { contact: { findMany: jest.fn(), count: jest.fn() } };

    const module = await Test.createTestingModule({
      providers: [
        ContactsService,
        { provide: PrismaService, useValue: prisma },
        { provide: NotificationService, useValue: {} },
      ],
    }).compile();

    service = module.get(ContactsService);
  });

  it("returns positive balance for COLLECTED transactions", async () => {
    prisma.contact.findMany.mockResolvedValue([
      {
        id: "c1",
        firstName: "Ali",
        lastName: "B",
        transactions: [
          {
            type: "COLLECTED",
            amount: { toNumber: () => 50000 },
            status: "ACTIVE",
            returnDirection: null,
          },
        ],
      },
    ]);
    prisma.contact.count.mockResolvedValue(1);

    const result = await service.findAll("user-1", { page: 1, limit: 10 });

    expect(result.items[0].balance).toBe(50000);
  });

  it("returns negative balance for DISBURSED transactions", async () => {
    prisma.contact.findMany.mockResolvedValue([
      {
        id: "c1",
        firstName: "Ali",
        lastName: "B",
        transactions: [
          {
            type: "DISBURSED",
            amount: { toNumber: () => 20000 },
            status: "ACTIVE",
            returnDirection: null,
          },
        ],
      },
    ]);
    prisma.contact.count.mockResolvedValue(1);

    const result = await service.findAll("user-1", { page: 1, limit: 10 });

    expect(result.items[0].balance).toBe(-20000);
  });
});
```

- [ ] **Step 2.3: Add witness acknowledge tests for new types in `witnesses.service.spec.ts`**

Open `apps/api/src/modules/witnesses/witnesses.service.spec.ts`. Inside the `'WitnessesService — acknowledge()'` describe block, add after the last `it()`:

```typescript
it("sends contact notification on first ACKNOWLEDGED witness for COLLECTED transaction", async () => {
  prisma.witness.findUnique.mockResolvedValue(makeWitness());
  prisma.witness.update.mockResolvedValue(
    makeUpdatedWitness({
      transaction: {
        id: "tx-1",
        type: TransactionType.COLLECTED,
        amount: { toNumber: () => 50000 },
        currency: "NGN",
        createdById: "creator-1",
        createdBy: { firstName: "Musa", lastName: "Ibrahim" },
        contact: {
          firstName: "Aminu",
          lastName: "Bello",
          phoneNumber: "+2348012345678",
          email: null,
        },
      },
    }),
  );
  prisma.transactionHistory.create.mockResolvedValue({});
  prisma.witness.count.mockResolvedValue(0);

  await service.acknowledge("witness-1", WitnessStatus.ACKNOWLEDGED, "user-1");

  expect(notificationService.sendContactNotification).toHaveBeenCalledWith(
    expect.objectContaining({ transactionType: "COLLECTED" }),
  );
});

it("sends contact notification on first ACKNOWLEDGED witness for DISBURSED transaction", async () => {
  prisma.witness.findUnique.mockResolvedValue(makeWitness());
  prisma.witness.update.mockResolvedValue(
    makeUpdatedWitness({
      transaction: {
        id: "tx-1",
        type: TransactionType.DISBURSED,
        amount: { toNumber: () => 30000 },
        currency: "NGN",
        createdById: "creator-1",
        createdBy: { firstName: "Musa", lastName: "Ibrahim" },
        contact: {
          firstName: "Aminu",
          lastName: "Bello",
          phoneNumber: null,
          email: "aminu@example.com",
        },
      },
    }),
  );
  prisma.transactionHistory.create.mockResolvedValue({});
  prisma.witness.count.mockResolvedValue(0);

  await service.acknowledge("witness-1", WitnessStatus.ACKNOWLEDGED, "user-1");

  expect(notificationService.sendContactNotification).toHaveBeenCalledWith(
    expect.objectContaining({ transactionType: "DISBURSED" }),
  );
});
```

- [ ] **Step 2.4: Run the new tests to confirm they fail**

```bash
cd /Users/fawazabdganiyu/akanors-ventures/apps/wathiqah && pnpm --filter api test 2>&1 | tail -20
```

Expected: The new tests fail (totalCollected undefined, balance wrong, sendContactNotification not called for new types).

- [ ] **Step 2.5: Commit**

```bash
cd /Users/fawazabdganiyu/akanors-ventures/apps/wathiqah && git add apps/api/src/modules/transactions/transactions.balance.spec.ts apps/api/src/modules/contacts/contacts.service.spec.ts apps/api/src/modules/witnesses/witnesses.service.spec.ts && git commit -m "test: add failing tests for COLLECTED/DISBURSED balance and notification logic"
```

---

## Task 3: Backend balance logic

**Files:**

- Modify: `apps/api/src/modules/transactions/transactions.service.ts`
- Modify: `apps/api/src/modules/contacts/contacts.service.ts`

- [ ] **Step 3.1: Extend `TransactionSummary` interface**

In `apps/api/src/modules/transactions/transactions.service.ts`, find the `TransactionSummary` interface (lines 53–65). Replace it with:

```typescript
export interface TransactionSummary {
  totalGiven: number;
  totalReceived: number;
  totalReturned: number;
  totalReturnedToMe: number;
  totalReturnedToOther: number;
  totalExpense: number;
  totalIncome: number;
  totalGiftGiven: number;
  totalGiftReceived: number;
  totalCollected: number;
  totalDisbursed: number;
  netBalance?: number;
  currency: string;
}
```

- [ ] **Step 3.2: Update `updateSummaryWithTransaction()`**

Find the `updateSummaryWithTransaction` private method (lines ~944–972). Replace it with:

```typescript
private updateSummaryWithTransaction(
  summary: TransactionSummary,
  type: TransactionType,
  returnDirection: string,
  amount: number,
) {
  if (type === 'GIVEN') {
    summary.totalGiven += amount;
  } else if (type === 'RECEIVED') {
    summary.totalReceived += amount;
  } else if (type === 'RETURNED') {
    summary.totalReturned += amount;
    if (returnDirection === 'TO_ME') {
      summary.totalReturnedToMe += amount;
    } else {
      summary.totalReturnedToOther += amount;
    }
  } else if (type === 'EXPENSE') {
    summary.totalExpense += amount;
  } else if (type === 'INCOME') {
    summary.totalIncome += amount;
  } else if (type === 'GIFT') {
    if (returnDirection === 'TO_ME') {
      summary.totalGiftReceived += amount;
    } else {
      summary.totalGiftGiven += amount;
    }
  } else if (type === 'COLLECTED') {
    summary.totalCollected += amount;
  } else if (type === 'DISBURSED') {
    summary.totalDisbursed += amount;
  }
}
```

- [ ] **Step 3.3: Update the two `getInitialSummary` / inline summary initializers**

There are two places that initialize a summary object with zero values. Both need `totalCollected: 0` and `totalDisbursed: 0` added.

**First occurrence** — the inline object in `calculateConvertedSummary` (lines ~843–855):

```typescript
const summary = {
  totalGiven: 0,
  totalReceived: 0,
  totalReturned: 0,
  totalReturnedToMe: 0,
  totalReturnedToOther: 0,
  totalExpense: 0,
  totalIncome: 0,
  totalGiftGiven: 0,
  totalGiftReceived: 0,
  totalCollected: 0,
  totalDisbursed: 0,
  netBalance: 0,
  currency: targetCurrency,
};
```

**Second occurrence** — the `getInitialSummary` arrow function in `groupByContact` (lines ~1051–1063):

```typescript
const getInitialSummary = (): TransactionSummary => ({
  totalGiven: 0,
  totalReceived: 0,
  totalReturned: 0,
  totalReturnedToMe: 0,
  totalReturnedToOther: 0,
  totalExpense: 0,
  totalIncome: 0,
  totalGiftGiven: 0,
  totalGiftReceived: 0,
  totalCollected: 0,
  totalDisbursed: 0,
  netBalance: 0,
  currency: targetCurrency,
});
```

- [ ] **Step 3.4: Update the two perspective-flip blocks**

There are two loops that flip type when processing contact/shared transactions. Both need COLLECTED ↔ DISBURSED flipping added.

**First occurrence** — in `calculateConvertedSummary`, the contact aggregation loop (lines ~891–901):

```typescript
if (agg.type === TransactionType.GIVEN) {
  flippedType = TransactionType.RECEIVED;
} else if (agg.type === TransactionType.RECEIVED) {
  flippedType = TransactionType.GIVEN;
} else if (agg.type === TransactionType.RETURNED) {
  flippedReturnDirection =
    agg.returnDirection === "TO_ME" ? "TO_CONTACT" : "TO_ME";
} else if (agg.type === TransactionType.GIFT) {
  flippedReturnDirection =
    agg.returnDirection === "TO_ME" ? "TO_CONTACT" : "TO_ME";
} else if (agg.type === TransactionType.COLLECTED) {
  flippedType = TransactionType.DISBURSED;
} else if (agg.type === TransactionType.DISBURSED) {
  flippedType = TransactionType.COLLECTED;
}
```

**Second occurrence** — in `groupByContact`, the shared aggregation loop (lines ~1116–1126):

```typescript
if (agg.type === TransactionType.GIVEN) {
  flippedType = TransactionType.RECEIVED;
} else if (agg.type === TransactionType.RECEIVED) {
  flippedType = TransactionType.GIVEN;
} else if (agg.type === TransactionType.RETURNED) {
  flippedReturnDirection =
    agg.returnDirection === "TO_ME" ? "TO_CONTACT" : "TO_ME";
} else if (agg.type === TransactionType.GIFT) {
  flippedReturnDirection =
    agg.returnDirection === "TO_ME" ? "TO_CONTACT" : "TO_ME";
} else if (agg.type === TransactionType.COLLECTED) {
  flippedType = TransactionType.DISBURSED;
} else if (agg.type === TransactionType.DISBURSED) {
  flippedType = TransactionType.COLLECTED;
}
```

- [ ] **Step 3.5: Update the two `netBalance` formulas**

There are two places that compute `netBalance`. Both need `+ totalCollected - totalDisbursed` appended.

**First occurrence** — in `calculateConvertedSummary` (lines ~931–939):

```typescript
summary.netBalance =
  summary.totalIncome -
  summary.totalExpense +
  summary.totalReceived -
  summary.totalGiven +
  summary.totalReturnedToMe -
  summary.totalReturnedToOther +
  summary.totalGiftReceived -
  summary.totalGiftGiven +
  summary.totalCollected -
  summary.totalDisbursed;
```

**Second occurrence** — in `groupByContact`, inside the result map (lines ~1139–1147):

```typescript
summary.netBalance =
  summary.totalIncome -
  summary.totalExpense +
  summary.totalReceived -
  summary.totalGiven +
  summary.totalReturnedToMe -
  summary.totalReturnedToOther +
  summary.totalGiftReceived -
  summary.totalGiftGiven +
  summary.totalCollected -
  summary.totalDisbursed;
```

- [ ] **Step 3.6: Update `computeContactBalance` in contacts.service.ts**

Find the `computeContactBalance` private method (lines ~127–152). Replace it with:

```typescript
private computeContactBalance(
  transactions: Array<{
    type: string;
    amount: unknown;
    status: string;
    returnDirection: string | null;
  }>,
): number {
  let balance = 0;
  for (const tx of transactions) {
    if (tx.status === 'CANCELLED') continue;
    const amount =
      typeof tx.amount === 'object' &&
      tx.amount !== null &&
      'toNumber' in tx.amount
        ? (tx.amount as { toNumber: () => number }).toNumber()
        : Number(tx.amount);
    if (tx.type === 'GIVEN') balance += amount;
    else if (tx.type === 'RECEIVED') balance -= amount;
    else if (tx.type === 'RETURNED') {
      if (tx.returnDirection === 'TO_ME') balance -= amount;
      else if (tx.returnDirection === 'TO_CONTACT') balance += amount;
    } else if (tx.type === 'COLLECTED') balance += amount;
    else if (tx.type === 'DISBURSED') balance -= amount;
  }
  return balance;
}
```

- [ ] **Step 3.7: Update the inline balance loop in `findContactBalance` (contacts.service.ts)**

Find the inline `if (isCreator)` balance loop (lines ~285–303). Replace it with:

```typescript
if (isCreator) {
  if (tx.type === "GIVEN") balance += amount;
  else if (tx.type === "RECEIVED") balance -= amount;
  else if (tx.type === "RETURNED") {
    if (tx.returnDirection === "TO_ME") balance -= amount;
    else if (tx.returnDirection === "TO_CONTACT") balance += amount;
  } else if (tx.type === "COLLECTED") balance += amount;
  else if (tx.type === "DISBURSED") balance -= amount;
} else {
  // Perspective flipping for shared transactions
  if (tx.type === "GIVEN")
    balance -= amount; // They gave to me -> I received
  else if (tx.type === "RECEIVED")
    balance += amount; // They received from me -> I gave
  else if (tx.type === "RETURNED") {
    if (tx.returnDirection === "TO_ME")
      balance += amount; // They got it back -> I returned to contact
    else if (tx.returnDirection === "TO_CONTACT") balance -= amount; // They returned to me -> I got it back
  } else if (tx.type === "COLLECTED")
    balance -= amount; // They collected from me -> I disbursed
  else if (tx.type === "DISBURSED") balance += amount; // They disbursed to me -> I collected
}
```

- [ ] **Step 3.8: Run backend tests — balance tests should now pass**

```bash
cd /Users/fawazabdganiyu/akanors-ventures/apps/wathiqah && pnpm --filter api test 2>&1 | tail -20
```

Expected: The balance and computeContactBalance tests from Task 2 now pass. Witness tests for new types still fail (Task 4).

- [ ] **Step 3.9: Commit**

```bash
cd /Users/fawazabdganiyu/akanors-ventures/apps/wathiqah && git add apps/api/src/modules/transactions/transactions.service.ts apps/api/src/modules/contacts/contacts.service.ts && git commit -m "feat(transactions): add COLLECTED/DISBURSED to balance, summary, and perspective-flip logic"
```

---

## Task 4: Witness notification — qualify new types

**Files:**

- Modify: `apps/api/src/modules/witnesses/witnesses.service.ts`

- [ ] **Step 4.1: Add `COLLECTED` and `DISBURSED` to `qualifyingTypes`**

In `apps/api/src/modules/witnesses/witnesses.service.ts`, find the `qualifyingTypes` array (lines ~98–100). Replace it with:

```typescript
const qualifyingTypes: TransactionType[] = [
  TransactionType.GIVEN,
  TransactionType.RECEIVED,
  TransactionType.RETURNED,
  TransactionType.COLLECTED,
  TransactionType.DISBURSED,
];
```

- [ ] **Step 4.2: Run witness tests — all should pass**

```bash
cd /Users/fawazabdganiyu/akanors-ventures/apps/wathiqah && pnpm --filter api test witnesses.service 2>&1 | tail -20
```

Expected: All 11 tests pass (1 pagination + 7 existing acknowledge + 2 new COLLECTED/DISBURSED tests).

- [ ] **Step 4.3: Run full backend test suite**

```bash
cd /Users/fawazabdganiyu/akanors-ventures/apps/wathiqah && pnpm --filter api test 2>&1 | tail -10
```

Expected: All tests pass.

- [ ] **Step 4.4: Commit**

```bash
cd /Users/fawazabdganiyu/akanors-ventures/apps/wathiqah && git add apps/api/src/modules/witnesses/witnesses.service.ts && git commit -m "feat(witnesses): trigger contact notification on COLLECTED/DISBURSED acknowledgment"
```

---

## Task 5: Notification processor — type labels

**Files:**

- Modify: `apps/api/src/modules/notifications/notifications.processor.ts`

- [ ] **Step 5.1: Update `typeLabels` in `handleContactNotificationSms`**

Find the `typeLabels` map inside `handleContactNotificationSms` (lines ~157–162). Replace it with:

```typescript
const typeLabels: Record<string, string> = {
  GIVEN: "loan",
  RECEIVED: "credit",
  RETURNED: "repayment",
  COLLECTED: "collection",
  DISBURSED: "disbursement",
};
```

- [ ] **Step 5.2: Update `typeLabels` in `handleContactNotificationEmail`**

Find the second `typeLabels` map inside `handleContactNotificationEmail` (lines ~192–197). Replace it with the same map:

```typescript
const typeLabels: Record<string, string> = {
  GIVEN: "loan",
  RECEIVED: "credit",
  RETURNED: "repayment",
  COLLECTED: "collection",
  DISBURSED: "disbursement",
};
```

- [ ] **Step 5.3: Commit**

```bash
cd /Users/fawazabdganiyu/akanors-ventures/apps/wathiqah && git add apps/api/src/modules/notifications/notifications.processor.ts && git commit -m "feat(notifications): add collection and disbursement labels for new transaction types"
```

---

## Task 6: Frontend form — schema, validation, and selectors

**Files:**

- Modify: `apps/web/src/routes/transactions/new.tsx`

- [ ] **Step 6.1: Regenerate frontend GraphQL types**

```bash
cd /Users/fawazabdganiyu/akanors-ventures/apps/wathiqah && pnpm --filter web codegen 2>&1 | tail -5
```

Expected: Codegen succeeds. `TransactionType.Collected` and `TransactionType.Disbursed` now exist in `apps/web/src/types/__generated__/graphql.ts`.

- [ ] **Step 6.2: Update the Zod `type` field enum**

In `apps/web/src/routes/transactions/new.tsx`, find the `type: z.enum([...])` declaration (lines ~52–59). Replace it with:

```typescript
type: z.enum([
  TransactionType.Given,
  TransactionType.Received,
  TransactionType.Returned,
  TransactionType.Gift,
  TransactionType.Expense,
  TransactionType.Income,
  TransactionType.Collected,
  TransactionType.Disbursed,
]),
```

- [ ] **Step 6.3: Update the contact-type validation refinement**

Find the `.refine()` that validates contact types (lines ~105–115):

```typescript
if (data.contactId) {
  return (
    [
      TransactionType.Given,
      TransactionType.Received,
      TransactionType.Returned,
      TransactionType.Gift,
    ] as string[]
  ).includes(data.type);
}
```

Replace the inner array with:

```typescript
if (data.contactId) {
  return (
    [
      TransactionType.Given,
      TransactionType.Received,
      TransactionType.Returned,
      TransactionType.Gift,
      TransactionType.Collected,
      TransactionType.Disbursed,
    ] as string[]
  ).includes(data.type);
}
```

- [ ] **Step 6.4: Add `SelectItem` entries for new types**

Find the block of `SelectItem` components for contact transaction types (lines ~345–348):

```tsx
<SelectItem value={TransactionType.Given}>Given</SelectItem>
<SelectItem value={TransactionType.Received}>Received</SelectItem>
<SelectItem value={TransactionType.Returned}>Returned</SelectItem>
<SelectItem value={TransactionType.Gift}>Gift</SelectItem>
```

Replace with:

```tsx
<SelectItem value={TransactionType.Given}>Given</SelectItem>
<SelectItem value={TransactionType.Received}>Received</SelectItem>
<SelectItem value={TransactionType.Returned}>Returned</SelectItem>
<SelectItem value={TransactionType.Collected}>Collected</SelectItem>
<SelectItem value={TransactionType.Disbursed}>Disbursed</SelectItem>
<SelectItem value={TransactionType.Gift}>Gift</SelectItem>
```

- [ ] **Step 6.5: Verify the frontend builds**

```bash
cd /Users/fawazabdganiyu/akanors-ventures/apps/wathiqah && pnpm --filter web build 2>&1 | tail -10
```

Expected: Build succeeds, no TypeScript errors.

- [ ] **Step 6.6: Commit**

```bash
cd /Users/fawazabdganiyu/akanors-ventures/apps/wathiqah && git add apps/web/src/routes/transactions/new.tsx apps/web/src/types/__generated__/graphql.ts && git commit -m "feat(web): add COLLECTED/DISBURSED to transaction form schema and type selector"
```

---

## Task 7: Frontend display — TransactionCard and SharedHistoryInterstitial

**Files:**

- Modify: `apps/web/src/components/transactions/TransactionCard.tsx`
- Modify: `apps/web/src/components/onboarding/SharedHistoryInterstitial.tsx`

- [ ] **Step 7.1: Update `isPositive` in `TransactionCard.tsx`**

Find the `isPositive` declaration (lines ~48–53). Replace it with:

```typescript
const isPositive =
  tx.type === "GIVEN" ||
  tx.type === "COLLECTED" ||
  (tx.type === "RETURNED" && tx.returnDirection === "TO_ME") ||
  tx.type === "INCOME" ||
  (tx.type === "GIFT" && tx.returnDirection === "TO_ME");
```

- [ ] **Step 7.2: Add color cases to `getTheme()` in `TransactionCard.tsx`**

Find the `getTheme()` switch statement. Add two cases before the `default:` case:

```typescript
case "COLLECTED":
  return {
    bg: "bg-teal-500/10",
    text: "text-teal-500",
    border: "border-teal-500/20",
    gradient: "from-teal-500 via-teal-500/80 to-teal-500/60",
  };
case "DISBURSED":
  return {
    bg: "bg-orange-500/10",
    text: "text-orange-500",
    border: "border-orange-500/20",
    gradient: "from-orange-500 via-orange-500/80 to-orange-500/60",
  };
```

- [ ] **Step 7.3: Update `getTypeLabel` in `SharedHistoryInterstitial.tsx`**

Find the `getTypeLabel` function (lines ~22–30). Replace it with:

```typescript
function getTypeLabel(
  type: string,
  returnDirection: string | null | undefined,
): string {
  if (type === "RETURNED") {
    return returnDirection === "TO_ME"
      ? "RETURNED TO ME"
      : "RETURNED TO CONTACT";
  }
  if (type === "GIFT") {
    return returnDirection === "TO_ME" ? "GIFT RECEIVED" : "GIFT GIVEN";
  }
  if (type === "COLLECTED") return "COLLECTED";
  if (type === "DISBURSED") return "DISBURSED";
  return type;
}
```

- [ ] **Step 7.4: Update `getTypeBadgeClass` in `SharedHistoryInterstitial.tsx`**

Find the `getTypeBadgeClass` function (lines ~38–59). Add two new conditions before the final `return` (the gray fallback):

```typescript
if (type === "COLLECTED") {
  return "text-teal-600 border-teal-200 bg-teal-50 dark:bg-teal-950/40 dark:border-teal-800 dark:text-teal-400";
}
if (type === "DISBURSED") {
  return "text-orange-600 border-orange-200 bg-orange-50 dark:bg-orange-950/40 dark:border-orange-800 dark:text-orange-400";
}
```

- [ ] **Step 7.5: Commit**

```bash
cd /Users/fawazabdganiyu/akanors-ventures/apps/wathiqah && git add apps/web/src/components/transactions/TransactionCard.tsx apps/web/src/components/onboarding/SharedHistoryInterstitial.tsx && git commit -m "feat(web): add teal/orange display for COLLECTED/DISBURSED transaction types"
```

---

## Task 8: Frontend — TransactionTypeHelp tooltip

**Files:**

- Modify: `apps/web/src/components/transactions/TransactionTypeHelp.tsx`

- [ ] **Step 8.1: Read the current file**

Read `apps/web/src/components/transactions/TransactionTypeHelp.tsx` to understand where the RETURNED block ends (it's before the GIFT block).

- [ ] **Step 8.2: Insert tooltip entries for new types**

After the RETURNED tooltip block and before the GIFT tooltip block, insert:

```tsx
<div className="space-y-1">
  <div className="flex items-center gap-2">
    <span className="font-medium text-teal-600 dark:text-teal-400 bg-teal-50 dark:bg-teal-900/20 px-1.5 py-0.5 rounded text-[10px] border border-teal-100 dark:border-teal-900/30">
      COLLECTED
    </span>
    <span className="text-[10px] font-bold text-teal-600/80 uppercase tracking-tight">
      Collection / Receipt
    </span>
  </div>
  <p>
    Money collected from or received on behalf of a contact — not a loan. Use this for payments
    collected, fees received, or funds held in trust.
  </p>
</div>

<div className="space-y-1">
  <div className="flex items-center gap-2">
    <span className="font-medium text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/20 px-1.5 py-0.5 rounded text-[10px] border border-orange-100 dark:border-orange-900/30">
      DISBURSED
    </span>
    <span className="text-[10px] font-bold text-orange-600/80 uppercase tracking-tight">
      Disbursement / Remittance
    </span>
  </div>
  <p>
    Money paid out or remitted to a contact — not a loan. Use this for remittances, payouts, or
    releasing funds held on their behalf.
  </p>
</div>
```

- [ ] **Step 8.3: Run frontend tests**

```bash
cd /Users/fawazabdganiyu/akanors-ventures/apps/wathiqah && pnpm --filter web test 2>&1 | tail -10
```

Expected: All tests pass.

- [ ] **Step 8.4: Run full test suite**

```bash
cd /Users/fawazabdganiyu/akanors-ventures/apps/wathiqah && pnpm --filter api test 2>&1 | tail -5 && pnpm --filter web test 2>&1 | tail -5
```

Expected: All backend and frontend tests pass.

- [ ] **Step 8.5: Commit**

```bash
cd /Users/fawazabdganiyu/akanors-ventures/apps/wathiqah && git add apps/web/src/components/transactions/TransactionTypeHelp.tsx && git commit -m "feat(web): add COLLECTED/DISBURSED entries to transaction type help tooltip"
```

---

## Self-Review

**Spec coverage:**

- ✅ DB enum: Task 1
- ✅ Balance (summary, netBalance, perspective flip): Task 3
- ✅ Contact balance (`computeContactBalance`, inline loop): Task 3
- ✅ Witness notification trigger: Task 4
- ✅ Notification labels (SMS + email): Task 5
- ✅ Frontend form (Zod, validation, selectors): Task 6
- ✅ Frontend display (TransactionCard color, SharedHistoryInterstitial badges): Task 7
- ✅ Frontend help tooltip: Task 8
- ✅ Tests for all new logic: Task 2 (failing) + Tasks 3/4 (green)

**Placeholder scan:** None found.

**Type consistency:** `TransactionType.COLLECTED` / `TransactionType.DISBURSED` (backend enum) and `TransactionType.Collected` / `TransactionType.Disbursed` (frontend generated enum) used consistently throughout. `totalCollected` / `totalDisbursed` fields defined in Task 3.1 and referenced in all subsequent tasks.
