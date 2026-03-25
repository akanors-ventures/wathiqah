# Pagination & Filters Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add server-side pagination and filtering to all data-heavy pages (Transactions, Contacts, Contact Details, Projects, Project Details, Shared History, Witness Requests).

**Architecture:** Offset-based pagination (`page`/`limit`) with all filter params sent to the backend per query. Backend applies `skip`/`take` via Prisma and returns `{ items, total, page, limit }`. Frontend manages filter + page state per page via feature-specific filter hooks and passes variables to Apollo queries.

**Tech Stack:** NestJS + GraphQL Code First (backend), TanStack Start + Apollo Client (frontend), Prisma 7 (PostgreSQL), TypeScript strict mode, Biome (frontend lint), ESLint (backend lint), Jest (backend tests), Vitest (frontend tests).

---

## Codegen Flow

After all backend changes in a task are complete, if GraphQL types changed:

1. Run `pnpm --filter api dev` — wait for "Application is running" to regenerate `apps/api/src/schema.gql`
2. Stop the backend (Ctrl+C)
3. Run `pnpm --filter web codegen` — regenerates `apps/web/src/types/__generated__/graphql.ts`

---

## Task 1: Prisma Schema Migration — ProjectStatus + Project category

**Files:**

- Modify: `apps/api/prisma/schema.prisma`

> **Status: COMPLETE** (commits `77e8880` and subsequent commit for `category`)

- [x] **Step 1: Add `ProjectStatus` enum and `status` field to `Project` model**
- [x] **Step 2: Add `category String?` field to `Project` model** (placed after `status`)
- [x] **Step 3: Generate + apply migrations** (Atlas migrations `20260324125528.sql` and `20260324141210.sql`)
- [x] **Step 4: Regenerate Prisma client**

`FilterProjectInput` also updated to include `category?: string` filter field.

---

## Task 2: Backend DTOs — Filter Inputs + Pagination

**Files:**

- Create: `apps/api/src/common/dto/pagination.input.ts`
- Modify: `apps/api/src/modules/transactions/dto/filter-transaction.input.ts`
- Create: `apps/api/src/modules/transactions/dto/filter-shared-history.input.ts`
- Create: `apps/api/src/modules/contacts/dto/filter-contact.input.ts`
- Modify: `apps/api/src/modules/projects/dto/filter-project.input.ts`
- Create: `apps/api/src/modules/witnesses/dto/filter-witness.input.ts`
- Create: `apps/api/src/modules/projects/dto/filter-project-transaction.input.ts`

- [ ] **Step 1: Create shared pagination helper**

Create `apps/api/src/common/dto/pagination.input.ts`:

```typescript
import { InputType, Field, Int } from "@nestjs/graphql";

@InputType()
export class PaginationInput {
  @Field(() => Int, { nullable: true, defaultValue: 1 })
  page?: number;

  @Field(() => Int, { nullable: true, defaultValue: 25 })
  limit?: number;
}

export function getPrismaSkip(page = 1, limit = 25): number {
  return (page - 1) * limit;
}
```

- [ ] **Step 2: Update `FilterTransactionInput`**

Replace the content of `apps/api/src/modules/transactions/dto/filter-transaction.input.ts`:

```typescript
import { InputType, Field, Int } from "@nestjs/graphql";
import {
  TransactionType,
  TransactionStatus,
} from "../../../generated/prisma/client";

@InputType()
export class FilterTransactionInput {
  @Field({ nullable: true })
  search?: string;

  @Field(() => [TransactionType], { nullable: true })
  types?: TransactionType[];

  @Field(() => TransactionStatus, { nullable: true })
  status?: TransactionStatus;

  @Field({ nullable: true })
  contactId?: string;

  @Field({ nullable: true })
  currency?: string;

  @Field({ nullable: true })
  summaryCurrency?: string;

  @Field(() => Date, { nullable: true })
  startDate?: Date;

  @Field(() => Date, { nullable: true })
  endDate?: Date;

  @Field({ nullable: true })
  minAmount?: number;

  @Field({ nullable: true })
  maxAmount?: number;

  @Field(() => Int, { nullable: true, defaultValue: 1 })
  page?: number;

  @Field(() => Int, { nullable: true, defaultValue: 25 })
  limit?: number;
}
```

Note: The standalone `limit` field is replaced by `page` + `limit` pair.

- [ ] **Step 3: Create `FilterSharedHistoryInput`**

Create `apps/api/src/modules/transactions/dto/filter-shared-history.input.ts`:

```typescript
import { InputType, Field, Int } from "@nestjs/graphql";
import {
  TransactionType,
  TransactionStatus,
} from "../../../generated/prisma/client";

@InputType()
export class FilterSharedHistoryInput {
  @Field({ nullable: true })
  search?: string;

  @Field(() => [TransactionType], { nullable: true })
  types?: TransactionType[];

  @Field(() => TransactionStatus, { nullable: true })
  status?: TransactionStatus;

  @Field(() => Date, { nullable: true })
  startDate?: Date;

  @Field(() => Date, { nullable: true })
  endDate?: Date;

  @Field(() => Int, { nullable: true, defaultValue: 1 })
  page?: number;

  @Field(() => Int, { nullable: true, defaultValue: 25 })
  limit?: number;
}
```

- [ ] **Step 4: Create `FilterContactInput` with `ContactBalanceStanding` enum**

Create `apps/api/src/modules/contacts/dto/filter-contact.input.ts`:

```typescript
import { InputType, Field, Int, registerEnumType } from "@nestjs/graphql";

export enum ContactBalanceStanding {
  ALL = "ALL",
  OWED_TO_ME = "OWED_TO_ME",
  I_OWE = "I_OWE",
}

registerEnumType(ContactBalanceStanding, { name: "ContactBalanceStanding" });

@InputType()
export class FilterContactInput {
  @Field({ nullable: true })
  search?: string;

  @Field(() => ContactBalanceStanding, { nullable: true })
  balanceStanding?: ContactBalanceStanding;

  @Field(() => Int, { nullable: true, defaultValue: 1 })
  page?: number;

  @Field(() => Int, { nullable: true, defaultValue: 25 })
  limit?: number;
}
```

- [ ] **Step 5: Replace `FilterProjectInput` with full implementation**

Replace the full contents of `apps/api/src/modules/projects/dto/filter-project.input.ts`:

```typescript
import { InputType, Field, Int, registerEnumType } from "@nestjs/graphql";
import { ProjectStatus } from "../../../generated/prisma/enums";

export enum ProjectBalanceStanding {
  ALL = "ALL",
  UNDER_BUDGET = "UNDER_BUDGET",
  OVER_BUDGET = "OVER_BUDGET",
}

registerEnumType(ProjectBalanceStanding, { name: "ProjectBalanceStanding" });

@InputType()
export class FilterProjectInput {
  @Field({ nullable: true })
  search?: string;

  @Field(() => ProjectStatus, { nullable: true })
  status?: ProjectStatus;

  @Field(() => ProjectBalanceStanding, { nullable: true })
  balanceStanding?: ProjectBalanceStanding;

  @Field(() => Int, { nullable: true, defaultValue: 1 })
  page?: number;

  @Field(() => Int, { nullable: true, defaultValue: 25 })
  limit?: number;
}
```

- [ ] **Step 6: Create `FilterWitnessInput`**

Create `apps/api/src/modules/witnesses/dto/filter-witness.input.ts`:

```typescript
import { InputType, Field, Int } from "@nestjs/graphql";

@InputType()
export class FilterWitnessInput {
  @Field({ nullable: true })
  search?: string;

  @Field(() => Date, { nullable: true })
  startDate?: Date;

  @Field(() => Date, { nullable: true })
  endDate?: Date;

  @Field(() => Int, { nullable: true, defaultValue: 1 })
  page?: number;

  @Field(() => Int, { nullable: true, defaultValue: 25 })
  limit?: number;
}
```

- [ ] **Step 7: Create `FilterProjectTransactionInput`**

Create `apps/api/src/modules/projects/dto/filter-project-transaction.input.ts`:

```typescript
import { InputType, Field, Int } from "@nestjs/graphql";
import { ProjectTransactionType } from "../../../generated/prisma/client";

@InputType()
export class FilterProjectTransactionInput {
  @Field(() => ProjectTransactionType, { nullable: true })
  type?: ProjectTransactionType;

  @Field({ nullable: true })
  category?: string;

  @Field(() => Date, { nullable: true })
  startDate?: Date;

  @Field(() => Date, { nullable: true })
  endDate?: Date;

  @Field(() => Int, { nullable: true, defaultValue: 1 })
  page?: number;

  @Field(() => Int, { nullable: true, defaultValue: 25 })
  limit?: number;
}
```

- [ ] **Step 8: Verify build compiles**

```bash
pnpm --filter api build
```

Expected: No TypeScript errors.

- [ ] **Step 9: Commit**

```bash
git add apps/api/src/common/dto/ apps/api/src/modules/transactions/dto/ apps/api/src/modules/contacts/dto/ apps/api/src/modules/projects/dto/ apps/api/src/modules/witnesses/dto/
git commit -m "feat(api): add filter input DTOs and pagination fields"
```

---

## Task 3: Backend Entities — Paginated Response Types + Entity Fixes

**Files:**

- Modify: `apps/api/src/modules/transactions/entities/transactions-response.entity.ts`
- Create: `apps/api/src/modules/transactions/entities/paginated-shared-history-response.entity.ts`
- Create: `apps/api/src/modules/contacts/entities/paginated-contacts-response.entity.ts`
- Create: `apps/api/src/modules/projects/entities/paginated-projects-response.entity.ts`
- Create: `apps/api/src/modules/witnesses/entities/paginated-witnesses-response.entity.ts`
- Create: `apps/api/src/modules/projects/entities/paginated-project-transactions-response.entity.ts`
- Modify: `apps/api/src/modules/projects/entities/project.entity.ts`
- Modify: `apps/api/src/modules/projects/dto/create-project.input.ts`
- Modify: `apps/api/src/modules/witnesses/entities/witness.entity.ts`

- [ ] **Step 1: Add `total`, `page`, `limit` to `TransactionsResponse`**

In `apps/api/src/modules/transactions/entities/transactions-response.entity.ts`, add `Int` to the import and add three fields to `TransactionsResponse`:

```typescript
import { ObjectType, Field, Float, Int } from "@nestjs/graphql";
import { Transaction } from "./transaction.entity";

// TransactionsSummary unchanged ...

@ObjectType()
export class TransactionsResponse {
  @Field(() => [Transaction])
  items: Transaction[];

  @Field(() => TransactionsSummary)
  summary: TransactionsSummary;

  @Field(() => Int)
  total: number;

  @Field(() => Int)
  page: number;

  @Field(() => Int)
  limit: number;
}
```

- [ ] **Step 2: Create `PaginatedSharedHistoryResponse`**

Create `apps/api/src/modules/transactions/entities/paginated-shared-history-response.entity.ts`:

```typescript
import { ObjectType, Field, Int } from "@nestjs/graphql";
import { Transaction } from "./transaction.entity";

@ObjectType()
export class PaginatedSharedHistoryResponse {
  @Field(() => [Transaction])
  items: Transaction[];

  @Field(() => Int)
  total: number;

  @Field(() => Int)
  page: number;

  @Field(() => Int)
  limit: number;
}
```

- [ ] **Step 3: Create `PaginatedContactsResponse`**

Create `apps/api/src/modules/contacts/entities/paginated-contacts-response.entity.ts`:

```typescript
import { ObjectType, Field, Int } from "@nestjs/graphql";
import { Contact } from "./contact.entity";

@ObjectType()
export class PaginatedContactsResponse {
  @Field(() => [Contact])
  items: Contact[];

  @Field(() => Int)
  total: number;

  @Field(() => Int)
  page: number;

  @Field(() => Int)
  limit: number;
}
```

- [ ] **Step 4: Create `PaginatedProjectsResponse`**

Create `apps/api/src/modules/projects/entities/paginated-projects-response.entity.ts`:

```typescript
import { ObjectType, Field, Int } from "@nestjs/graphql";
import { Project } from "./project.entity";

@ObjectType()
export class PaginatedProjectsResponse {
  @Field(() => [Project])
  items: Project[];

  @Field(() => Int)
  total: number;

  @Field(() => Int)
  page: number;

  @Field(() => Int)
  limit: number;
}
```

- [ ] **Step 5: Create `PaginatedProjectTransactionsResponse`**

Create `apps/api/src/modules/projects/entities/paginated-project-transactions-response.entity.ts`:

```typescript
import { ObjectType, Field, Int } from "@nestjs/graphql";
import { ProjectTransaction } from "./project-transaction.entity";

@ObjectType()
export class PaginatedProjectTransactionsResponse {
  @Field(() => [ProjectTransaction])
  items: ProjectTransaction[];

  @Field(() => Int)
  total: number;

  @Field(() => Int)
  page: number;

  @Field(() => Int)
  limit: number;
}
```

- [ ] **Step 6: Create `PaginatedWitnessesResponse`**

Create `apps/api/src/modules/witnesses/entities/paginated-witnesses-response.entity.ts`:

```typescript
import { ObjectType, Field, Int } from "@nestjs/graphql";
import { Witness } from "./witness.entity";

@ObjectType()
export class PaginatedWitnessesResponse {
  @Field(() => [Witness])
  items: Witness[];

  @Field(() => Int)
  total: number;

  @Field(() => Int)
  page: number;

  @Field(() => Int)
  limit: number;
}
```

- [ ] **Step 7: Fix `Witness` entity — make `transactionId` nullable and expose `projectTransactionId`**

In `apps/api/src/modules/witnesses/entities/witness.entity.ts`, change:

```typescript
// Before:
@Field()
transactionId: string;

// After:
@Field({ nullable: true })
transactionId?: string;

@Field({ nullable: true })
projectTransactionId?: string;
```

Check the Prisma `Witness` model to confirm `projectTransactionId` exists as a column — it should be present. This field is required for the witness search join in Task 7 (searching by project transaction description).

- [ ] **Step 8: Update `Project` entity — add `status` and `transactions` fields**

Replace `apps/api/src/modules/projects/entities/project.entity.ts`:

```typescript
import { ObjectType, Field, Float, ID } from "@nestjs/graphql";
import { ProjectStatus } from "../../../generated/prisma/enums";
import { PaginatedProjectTransactionsResponse } from "./paginated-project-transactions-response.entity";

@ObjectType()
export class Project {
  @Field(() => ID)
  id: string;

  @Field()
  name: string;

  @Field({ nullable: true })
  description?: string;

  @Field(() => Float, { nullable: true })
  budget?: number;

  @Field(() => Float, { defaultValue: 0 })
  balance: number;

  @Field(() => Float, { defaultValue: 0 })
  totalIncome: number;

  @Field(() => Float, { defaultValue: 0 })
  totalExpenses: number;

  @Field({ defaultValue: "NGN" })
  currency: string;

  @Field(() => ProjectStatus, { defaultValue: ProjectStatus.ACTIVE })
  status: ProjectStatus;

  @Field()
  userId: string;

  @Field()
  createdAt: Date;

  @Field()
  updatedAt: Date;

  @Field(() => PaginatedProjectTransactionsResponse, { nullable: true })
  transactions?: PaginatedProjectTransactionsResponse;
}
```

- [ ] **Step 9: Add `status` to `CreateProjectInput`**

In `apps/api/src/modules/projects/dto/create-project.input.ts`, add:

```typescript
import { InputType, Field, Float } from "@nestjs/graphql";
import { ProjectStatus } from "../../../generated/prisma/enums";

@InputType()
export class CreateProjectInput {
  @Field()
  name: string;

  @Field({ nullable: true })
  description?: string;

  @Field(() => Float, { nullable: true })
  budget?: number;

  @Field({ nullable: true })
  currency?: string;

  @Field(() => ProjectStatus, {
    nullable: true,
    defaultValue: ProjectStatus.ACTIVE,
  })
  status?: ProjectStatus;
}
```

Note: `UpdateProjectInput` uses `PartialType(CreateProjectInput)` and inherits `status` automatically — no changes needed there.

- [ ] **Step 10: Verify build compiles**

```bash
pnpm --filter api build
```

Expected: No TypeScript errors.

- [ ] **Step 11: Commit**

```bash
git add apps/api/src/modules/
git commit -m "feat(api): add paginated response entities and fix witness/project types"
```

---

## Task 4: Transactions Service + Resolver — Pagination

**Files:**

- Modify: `apps/api/src/modules/transactions/transactions.service.ts`
- Modify: `apps/api/src/modules/transactions/transactions.resolver.ts`
- Test: `apps/api/src/modules/transactions/transactions.service.spec.ts`

The `findAll` method must return `total`, `page`, `limit` alongside `items` and `summary`. `findMyContactTransactions` must accept a filter and return a paginated result.

- [ ] **Step 1: Write failing tests for pagination in `findAll`**

Create or update `apps/api/src/modules/transactions/transactions.service.spec.ts`:

```typescript
import { Test, TestingModule } from "@nestjs/testing";
import { TransactionsService } from "./transactions.service";
import { PrismaService } from "../../prisma/prisma.service";

describe("TransactionsService — pagination", () => {
  let service: TransactionsService;
  let prisma: any;

  beforeEach(async () => {
    prisma = {
      transaction: jest.fn(),
      projectTransaction: { findMany: jest.fn().mockResolvedValue([]) },
    };
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TransactionsService,
        { provide: PrismaService, useValue: prisma },
        {
          provide: "CACHE_MANAGER",
          useValue: { get: jest.fn(), set: jest.fn() },
        },
        { provide: "ConfigService", useValue: { get: jest.fn() } },
        { provide: "NotificationService", useValue: {} },
        {
          provide: "ExchangeRateService",
          useValue: { convert: jest.fn().mockResolvedValue(1) },
        },
      ],
    }).compile();
    service = module.get<TransactionsService>(TransactionsService);
  });

  it("returns total, page, limit in findAll response", async () => {
    prisma.transaction.mockResolvedValue([5, []]);
    const result = await service.findAll("user-1", { page: 1, limit: 10 });
    expect(result.total).toBe(5);
    expect(result.page).toBe(1);
    expect(result.limit).toBe(10);
    expect(result.items).toEqual([]);
  });

  it("applies skip correctly for page 2", async () => {
    prisma.transaction.mockResolvedValue([20, []]);
    await service.findAll("user-1", { page: 2, limit: 10 });
    // prisma.$transaction is called — verify count and findMany are called with correct skip
    expect(prisma.transaction).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
pnpm --filter api test:watch -- --testPathPattern=transactions.service
```

Expected: Tests fail because `total`/`page`/`limit` are not returned yet.

- [ ] **Step 3: Update `findAll` in `transactions.service.ts` to return pagination**

Find the `findAll` method in `apps/api/src/modules/transactions/transactions.service.ts`. The method currently returns `{ items, summary }`. Update it to also accept and apply pagination, and use `prisma.$transaction` to atomically fetch count + data:

Key changes to make in `findAll`:

1. Destructure `page = 1` and `limit = 25` from `filter`
2. Compute `skip = (page - 1) * limit`
3. Replace the current `findMany` call with `this.prisma.$transaction([countQuery, findManyQuery])`
4. Return `{ items, summary, total, page, limit }` where `total` comes from the count query

The `where` clause for counting must match the `where` clause for the data query exactly. Use a shared `where` variable built from the filter before the `$transaction` call.

- [ ] **Step 4: Add `findMyContactTransactions` with pagination**

Find `findMyContactTransactions` in the service. Update its signature to:

```typescript
async findMyContactTransactions(userId: string, filter?: FilterSharedHistoryInput)
```

Import `FilterSharedHistoryInput`. Apply:

- `search` filter: `OR [{ description: { contains: search, mode: 'insensitive' } }, { createdBy: { firstName/lastName contains search } }]`
- `types` filter: `type: { in: types }`
- `status` filter: `status: status`
- `startDate`/`endDate` filter: `date: { gte: startDate, lte: endDate }`
- Pagination: `skip`, `take: limit`
- Count: use `this.prisma.transaction.count({ where })` in parallel

Return `{ items, total, page, limit }`.

- [ ] **Step 5: Update resolver — `myContactTransactions`**

In `apps/api/src/modules/transactions/transactions.resolver.ts`:

```typescript
import { PaginatedSharedHistoryResponse } from './entities/paginated-shared-history-response.entity';
import { FilterSharedHistoryInput } from './dto/filter-shared-history.input';

@Query(() => PaginatedSharedHistoryResponse, { name: 'myContactTransactions' })
async findMyContactTransactions(
  @CurrentUser() user: User,
  @Args('filter', { nullable: true }) filter?: FilterSharedHistoryInput,
) {
  return this.transactionsService.findMyContactTransactions(user.id, filter);
}
```

- [ ] **Step 6: Run tests**

```bash
pnpm --filter api test:watch -- --testPathPattern=transactions.service
```

Expected: All tests pass.

- [ ] **Step 7: Verify build**

```bash
pnpm --filter api build
```

- [ ] **Step 8: Commit**

```bash
git add apps/api/src/modules/transactions/
git commit -m "feat(api): add pagination to transactions service and resolver"
```

---

## Task 5: Contacts Service + Resolver — Pagination + Filter

**Files:**

- Modify: `apps/api/src/modules/contacts/contacts.service.ts`
- Modify: `apps/api/src/modules/contacts/contacts.resolver.ts`
- Test: `apps/api/src/modules/contacts/contacts.service.spec.ts`

- [ ] **Step 1: Write failing tests**

Create `apps/api/src/modules/contacts/contacts.service.spec.ts`:

```typescript
import { Test } from "@nestjs/testing";
import { ContactsService } from "./contacts.service";
import { PrismaService } from "../../prisma/prisma.service";
import { ContactBalanceStanding } from "./dto/filter-contact.input";

describe("ContactsService — findAll pagination", () => {
  let service: ContactsService;
  let prisma: any;

  beforeEach(async () => {
    prisma = {
      contact: {
        findMany: jest.fn(),
        count: jest.fn(),
      },
    };
    const module = await Test.createTestingModule({
      providers: [
        ContactsService,
        { provide: PrismaService, useValue: prisma },
        { provide: "NotificationService", useValue: {} },
      ],
    }).compile();
    service = module.get(ContactsService);
  });

  it("returns paginated contacts with total", async () => {
    prisma.contact.findMany.mockResolvedValue([
      { id: "1", firstName: "Ali", lastName: "B", transactions: [] },
    ]);
    prisma.contact.count.mockResolvedValue(1);
    const result = await service.findAll("user-1", { page: 1, limit: 10 });
    expect(result.total).toBe(1);
    expect(result.page).toBe(1);
    expect(result.limit).toBe(10);
    expect(result.items).toHaveLength(1);
  });

  it("filters contacts by balance standing OWED_TO_ME — returns only positive-balance contacts", async () => {
    const contacts = [
      {
        id: "1",
        firstName: "Ali",
        transactions: [
          {
            type: "GIVEN",
            amount: 100,
            status: "COMPLETED",
            returnDirection: null,
          },
        ],
      },
      {
        id: "2",
        firstName: "Ben",
        transactions: [
          {
            type: "RECEIVED",
            amount: 50,
            status: "COMPLETED",
            returnDirection: null,
          },
        ],
      },
    ];
    prisma.contact.findMany.mockResolvedValue(contacts);
    const result = await service.findAll("user-1", {
      balanceStanding: ContactBalanceStanding.OWED_TO_ME,
    });
    expect(result.items.map((c) => c.id)).toEqual(["1"]);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
pnpm --filter api test:watch -- --testPathPattern=contacts.service
```

- [ ] **Step 3: Update `findAll` in `contacts.service.ts`**

Update the signature and implementation:

```typescript
import { FilterContactInput, ContactBalanceStanding } from './dto/filter-contact.input';

async findAll(userId: string, filter?: FilterContactInput) {
  const page = filter?.page ?? 1;
  const limit = filter?.limit ?? 25;
  const search = filter?.search;

  const where: Prisma.ContactWhereInput = {
    userId,
    ...(search && {
      OR: [
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { phoneNumber: { contains: search, mode: 'insensitive' } },
      ],
    }),
  };

  // Two-phase query: balance standing requires in-memory filtering
  if (filter?.balanceStanding && filter.balanceStanding !== ContactBalanceStanding.ALL) {
    const allContacts = await this.prisma.contact.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        transactions: {
          select: { type: true, amount: true, status: true, returnDirection: true },
        },
      },
    });

    const filtered = allContacts.filter((c) => {
      const balance = this.computeBalance(c.transactions);
      if (filter.balanceStanding === ContactBalanceStanding.OWED_TO_ME) return balance > 0;
      if (filter.balanceStanding === ContactBalanceStanding.I_OWE) return balance < 0;
      return true;
    });

    const total = filtered.length;
    const items = filtered.slice((page - 1) * limit, page * limit);
    return { items, total, page, limit };
  }

  const [total, items] = await Promise.all([
    this.prisma.contact.count({ where }),
    this.prisma.contact.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
  ]);

  return { items, total, page, limit };
}
```

Add a private `computeBalance` helper that computes the relationship balance from a list of transactions (mirrors the logic already in `getBalance`).

- [ ] **Step 4: Update `contacts.resolver.ts`**

```typescript
import { FilterContactInput } from './dto/filter-contact.input';
import { PaginatedContactsResponse } from './entities/paginated-contacts-response.entity';

@Query(() => PaginatedContactsResponse, { name: 'contacts' })
async findAll(
  @CurrentUser() user: User,
  @Args('filter', { nullable: true }) filter?: FilterContactInput,
) {
  return this.contactsService.findAll(user.id, filter);
}
```

- [ ] **Step 5: Run tests**

```bash
pnpm --filter api test:watch -- --testPathPattern=contacts.service
```

Expected: All pass.

- [ ] **Step 6: Build**

```bash
pnpm --filter api build
```

- [ ] **Step 7: Commit**

```bash
git add apps/api/src/modules/contacts/
git commit -m "feat(api): add pagination and balance standing filter to contacts"
```

---

## Task 6: Projects Service + Resolver — Pagination + Status + Project Transactions

**Files:**

- Modify: `apps/api/src/modules/projects/projects.service.ts`
- Modify: `apps/api/src/modules/projects/projects.resolver.ts`
- Modify: `apps/api/src/modules/projects/project-transactions.service.ts`
- Test: `apps/api/src/modules/projects/projects.service.spec.ts`

- [ ] **Step 1: Write failing tests**

Create `apps/api/src/modules/projects/projects.service.spec.ts`:

```typescript
import { Test } from "@nestjs/testing";
import { ProjectsService } from "./projects.service";
import { PrismaService } from "../../prisma/prisma.service";
import { ProjectBalanceStanding } from "./dto/filter-project.input";

describe("ProjectsService — findAll pagination", () => {
  let service: ProjectsService;
  let prisma: any;

  beforeEach(async () => {
    prisma = {
      project: { findMany: jest.fn(), count: jest.fn() },
      projectTransaction: { groupBy: jest.fn().mockResolvedValue([]) },
    };
    const module = await Test.createTestingModule({
      providers: [
        ProjectsService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();
    service = module.get(ProjectsService);
  });

  it("returns paginated projects with total", async () => {
    prisma.project.findMany.mockResolvedValue([
      { id: "p1", name: "Alpha", balance: 100, budget: 200, status: "ACTIVE" },
    ]);
    prisma.project.count.mockResolvedValue(1);
    const result = await service.findAll("user-1", { page: 1, limit: 10 });
    expect(result.total).toBe(1);
    expect(result.items).toHaveLength(1);
  });

  it("filters by OVER_BUDGET — balance > budget", async () => {
    prisma.project.findMany.mockResolvedValue([]);
    prisma.project.count.mockResolvedValue(0);
    await service.findAll("user-1", {
      balanceStanding: ProjectBalanceStanding.OVER_BUDGET,
    });
    expect(prisma.project.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          balance: expect.objectContaining({ gt: expect.anything() }),
        }),
      }),
    );
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
pnpm --filter api test:watch -- --testPathPattern=projects.service
```

- [ ] **Step 3: Update `findAll` in `projects.service.ts`**

```typescript
import { FilterProjectInput, ProjectBalanceStanding } from './dto/filter-project.input';
import { ProjectStatus } from '../../generated/prisma/enums';
import { Prisma } from '../../generated/prisma/client';

async findAll(userId: string, filter?: FilterProjectInput) {
  const page = filter?.page ?? 1;
  const limit = filter?.limit ?? 25;

  const where: Prisma.ProjectWhereInput = {
    userId,
    ...(filter?.search && { name: { contains: filter.search, mode: 'insensitive' } }),
    ...(filter?.status && { status: filter.status }),
    ...(filter?.balanceStanding === ProjectBalanceStanding.UNDER_BUDGET && {
      OR: [{ budget: null }, { balance: { lte: this.prisma.project.fields.budget } }],
    }),
    ...(filter?.balanceStanding === ProjectBalanceStanding.OVER_BUDGET && {
      budget: { not: null },
      balance: { gt: this.prisma.project.fields.budget },
    }),
  };

  const [total, items] = await Promise.all([
    this.prisma.project.count({ where }),
    this.prisma.project.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
  ]);

  return { items, total, page, limit };
}
```

**Note on balance standing:** Prisma does not support comparing two stored columns in a `where` clause via the standard ORM API. Use raw SQL for `UNDER_BUDGET`/`OVER_BUDGET`:

```typescript
if (
  filter?.balanceStanding &&
  filter.balanceStanding !== ProjectBalanceStanding.ALL
) {
  const isOverBudget =
    filter.balanceStanding === ProjectBalanceStanding.OVER_BUDGET;
  const rawIds = await this.prisma.$queryRaw<{ id: string }[]>`
    SELECT id FROM "Project"
    WHERE "userId" = ${userId}
    AND "budget" IS NOT NULL
    AND ${isOverBudget ? Prisma.sql`"balance" > "budget"` : Prisma.sql`"balance" <= "budget"`}
    ${filter?.search ? Prisma.sql`AND "name" ILIKE ${"%" + filter.search + "%"}` : Prisma.empty}
    ${filter?.status ? Prisma.sql`AND "status" = ${filter.status}::"ProjectStatus"` : Prisma.empty}
  `;
  const ids = rawIds.map((r) => r.id);
  const total = ids.length;
  const items = await this.prisma.project.findMany({
    where: { id: { in: ids } },
    orderBy: { createdAt: "desc" },
    skip: (page - 1) * limit,
    take: limit,
  });
  return { items, total, page, limit };
}
```

Import `Prisma` from `'../../generated/prisma/client'` for tagged template support.

- [ ] **Step 4: Update `create` and `update` in `projects.service.ts` to handle `status`**

The `create` method uses `{ ...input, userId }` — since `status` is now part of `CreateProjectInput`, it flows through automatically. No change needed.

Verify the `update` method also spreads input correctly — it should already work via `PartialType`.

- [ ] **Step 5: Update `projects.resolver.ts` — `myProjects` query**

```typescript
import { FilterProjectInput } from './dto/filter-project.input';
import { PaginatedProjectsResponse } from './entities/paginated-projects-response.entity';

@Query(() => PaginatedProjectsResponse, { name: 'myProjects' })
async myProjects(
  @CurrentUser() user: User,
  @Args('filter', { nullable: true }) filter?: FilterProjectInput,
) {
  return this.projectsService.findAll(user.id, filter);
}
```

- [ ] **Step 6: Update `transactions` `@ResolveField` in `projects.resolver.ts` to accept filter args**

```typescript
import { FilterProjectTransactionInput } from './dto/filter-project-transaction.input';
import { PaginatedProjectTransactionsResponse } from './entities/paginated-project-transactions-response.entity';

@ResolveField(() => PaginatedProjectTransactionsResponse)
async transactions(
  @Parent() project: Project,
  @Args('filter', { nullable: true }) filter?: FilterProjectTransactionInput,
): Promise<PaginatedProjectTransactionsResponse> {
  return this.projectTransactionsService.findByProject(project.id, filter);
}
```

- [ ] **Step 7: Add `findByProject` to `project-transactions.service.ts`**

Add a new method:

```typescript
import { FilterProjectTransactionInput } from './dto/filter-project-transaction.input';
import { PaginatedProjectTransactionsResponse } from './entities/paginated-project-transactions-response.entity';
import { Prisma } from '../../generated/prisma/client';

async findByProject(
  projectId: string,
  filter?: FilterProjectTransactionInput,
): Promise<PaginatedProjectTransactionsResponse> {
  const page = filter?.page ?? 1;
  const limit = filter?.limit ?? 25;

  const where: Prisma.ProjectTransactionWhereInput = {
    projectId,
    ...(filter?.type && { type: filter.type }),
    ...(filter?.category && { category: { contains: filter.category, mode: 'insensitive' } }),
    ...(filter?.startDate && { date: { gte: filter.startDate } }),
    ...(filter?.endDate && { date: { ...((filter.startDate && { gte: filter.startDate }) || {}), lte: filter.endDate } }),
  };

  const [total, items] = await Promise.all([
    this.prisma.projectTransaction.count({ where }),
    this.prisma.projectTransaction.findMany({
      where,
      orderBy: { date: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
      include: {
        witnesses: { include: { user: true } },
        history: true,
      },
    }),
  ]);

  return { items, total, page, limit };
}
```

- [ ] **Step 8: Run tests**

```bash
pnpm --filter api test:watch -- --testPathPattern=projects.service
```

- [ ] **Step 9: Build**

```bash
pnpm --filter api build
```

- [ ] **Step 10: Commit**

```bash
git add apps/api/src/modules/projects/
git commit -m "feat(api): add pagination, status, and filter to projects"
```

---

## Task 7: Witnesses Service + Resolver — Pagination + Filter

**Files:**

- Modify: `apps/api/src/modules/witnesses/witnesses.service.ts`
- Modify: `apps/api/src/modules/witnesses/witnesses.resolver.ts`
- Test: `apps/api/src/modules/witnesses/witnesses.service.spec.ts`

- [ ] **Step 1: Write failing tests**

Create `apps/api/src/modules/witnesses/witnesses.service.spec.ts`:

```typescript
import { Test } from "@nestjs/testing";
import { WitnessesService } from "./witnesses.service";
import { PrismaService } from "../../prisma/prisma.service";

describe("WitnessesService — findMyRequests pagination", () => {
  let service: WitnessesService;
  let prisma: any;

  beforeEach(async () => {
    prisma = {
      witness: { findMany: jest.fn(), count: jest.fn() },
    };
    const module = await Test.createTestingModule({
      providers: [
        WitnessesService,
        { provide: PrismaService, useValue: prisma },
        {
          provide: "CACHE_MANAGER",
          useValue: { get: jest.fn(), set: jest.fn() },
        },
        { provide: "NotificationService", useValue: {} },
        { provide: "ConfigService", useValue: { get: jest.fn() } },
      ],
    }).compile();
    service = module.get(WitnessesService);
  });

  it("returns paginated witnesses with total", async () => {
    prisma.witness.findMany.mockResolvedValue([{ id: "w1" }]);
    prisma.witness.count.mockResolvedValue(1);
    const result = await service.findMyRequests("user-1", undefined, {
      page: 1,
      limit: 10,
    });
    expect(result.total).toBe(1);
    expect(result.items).toHaveLength(1);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
pnpm --filter api test:watch -- --testPathPattern=witnesses.service
```

- [ ] **Step 3: Update `findMyRequests` in `witnesses.service.ts`**

```typescript
import { FilterWitnessInput } from './dto/filter-witness.input';
import { WitnessStatus, Prisma } from '../../generated/prisma/client';

async findMyRequests(
  userId: string,
  status?: WitnessStatus,
  filter?: FilterWitnessInput,
) {
  const page = filter?.page ?? 1;
  const limit = filter?.limit ?? 25;
  const search = filter?.search;

  const where: Prisma.WitnessWhereInput = {
    userId,
    ...(status && { status }),
    ...(filter?.startDate && { invitedAt: { gte: filter.startDate } }),
    ...(filter?.endDate && {
      invitedAt: {
        ...((filter.startDate && { gte: filter.startDate }) || {}),
        lte: filter.endDate,
      },
    }),
    ...(search && {
      OR: [
        { transaction: { description: { contains: search, mode: 'insensitive' } } },
        { transaction: { createdBy: { firstName: { contains: search, mode: 'insensitive' } } } },
        { transaction: { createdBy: { lastName: { contains: search, mode: 'insensitive' } } } },
        { projectTransaction: { description: { contains: search, mode: 'insensitive' } } },
      ],
    }),
  };

  const [total, items] = await Promise.all([
    this.prisma.witness.count({ where }),
    this.prisma.witness.findMany({
      where,
      orderBy: { invitedAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
      include: {
        transaction: {
          include: { createdBy: true, contact: true },
        },
        user: true,
      },
    }),
  ]);

  return { items, total, page, limit };
}
```

- [ ] **Step 4: Update `witnesses.resolver.ts`**

```typescript
import { FilterWitnessInput } from './dto/filter-witness.input';
import { PaginatedWitnessesResponse } from './entities/paginated-witnesses-response.entity';

@Query(() => PaginatedWitnessesResponse, { name: 'myWitnessRequests' })
async myWitnessRequests(
  @CurrentUser() user: User,
  @Args('status', { nullable: true }) status?: WitnessStatus,
  @Args('filter', { nullable: true }) filter?: FilterWitnessInput,
) {
  return this.witnessesService.findMyRequests(user.id, status, filter);
}
```

- [ ] **Step 5: Run tests**

```bash
pnpm --filter api test:watch -- --testPathPattern=witnesses.service
```

- [ ] **Step 6: Build + regenerate schema**

```bash
pnpm --filter api build
pnpm --filter api dev
# Wait for "Application is running on port 3001", then Ctrl+C
```

- [ ] **Step 7: Commit**

```bash
git add apps/api/src/modules/witnesses/
git commit -m "feat(api): add pagination and search filter to witness requests"
```

---

## Task 8: Frontend TypeScript Types Regeneration

**Files:**

- Modify: `apps/web/src/types/__generated__/graphql.ts` (auto-generated)

- [ ] **Step 1: Run frontend codegen**

```bash
pnpm --filter web codegen
```

Expected: `apps/web/src/types/__generated__/graphql.ts` updated with new types including `PaginatedContactsResponse`, `PaginatedProjectsResponse`, `PaginatedWitnessesResponse`, `PaginatedSharedHistoryResponse`, `PaginatedProjectTransactionsResponse`, `FilterContactInput`, `FilterProjectInput`, `FilterWitnessInput`, `FilterSharedHistoryInput`, `ProjectStatus`, `ContactBalanceStanding`, `ProjectBalanceStanding`.

- [ ] **Step 2: Verify no compile errors**

```bash
pnpm --filter web build
```

Expected: TypeScript errors about missing pagination fields in queries — these will be fixed in subsequent tasks.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/types/__generated__/
git commit -m "chore(web): regenerate GraphQL types for pagination and filters"
```

---

## Task 9: Frontend Shared UI Components

**Files:**

- Create: `apps/web/src/components/ui/date-range-picker.tsx`
- Create: `apps/web/src/components/ui/pagination.tsx`

- [ ] **Step 1: Create `DateRangePicker` component**

Create `apps/web/src/components/ui/date-range-picker.tsx`:

```tsx
import { useState } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface DateRange {
  from: string | null;
  to: string | null;
}

interface DateRangePickerProps {
  value: DateRange;
  onChange: (range: DateRange) => void;
}

export function DateRangePicker({ value, onChange }: DateRangePickerProps) {
  const [error, setError] = useState<string | null>(null);

  const handleFromChange = (from: string) => {
    if (value.to && from > value.to) {
      setError("Start date must be before end date");
      return;
    }
    setError(null);
    onChange({ ...value, from: from || null });
  };

  const handleToChange = (to: string) => {
    if (value.from && to < value.from) {
      setError("End date must be after start date");
      return;
    }
    setError(null);
    onChange({ ...value, to: to || null });
  };

  const handleClear = () => {
    setError(null);
    onChange({ from: null, to: null });
  };

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1.5">
          <Label className="text-xs text-muted-foreground shrink-0">From</Label>
          <Input
            type="date"
            value={value.from ?? ""}
            onChange={(e) => handleFromChange(e.target.value)}
            className="h-8 w-36 text-xs"
          />
        </div>
        <div className="flex items-center gap-1.5">
          <Label className="text-xs text-muted-foreground shrink-0">To</Label>
          <Input
            type="date"
            value={value.to ?? ""}
            onChange={(e) => handleToChange(e.target.value)}
            className="h-8 w-36 text-xs"
          />
        </div>
        {(value.from || value.to) && (
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 shrink-0"
            onClick={handleClear}
            aria-label="Clear date range"
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
```

- [ ] **Step 2: Create `Pagination` component**

Create `apps/web/src/components/ui/pagination.tsx`:

**Important:** This is a fully custom component. Do NOT install Shadcn's `pagination` via `shadcn add pagination` — it would overwrite this file.

```tsx
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface PaginationProps {
  total: number;
  page: number;
  limit: number;
  onPageChange: (page: number) => void;
  onLimitChange: (limit: number) => void;
}

export function Pagination({
  total,
  page,
  limit,
  onPageChange,
  onLimitChange,
}: PaginationProps) {
  if (total <= limit) return null;

  const totalPages = Math.ceil(total / limit);
  const start = (page - 1) * limit + 1;
  const end = Math.min(page * limit, total);

  const getPageNumbers = () => {
    const pages: (number | "...")[] = [];
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    pages.push(1);
    if (page > 3) pages.push("...");
    for (
      let i = Math.max(2, page - 1);
      i <= Math.min(totalPages - 1, page + 1);
      i++
    ) {
      pages.push(i);
    }
    if (page < totalPages - 2) pages.push("...");
    pages.push(totalPages);
    return pages;
  };

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 py-4">
      <p className="text-sm text-muted-foreground">
        Showing {start}–{end} of {total} results
      </p>
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Rows per page</span>
          <Select
            value={String(limit)}
            onValueChange={(v) => {
              onLimitChange(Number(v));
              onPageChange(1);
            }}
          >
            <SelectTrigger className="h-8 w-16">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="10">10</SelectItem>
              <SelectItem value="25">25</SelectItem>
              <SelectItem value="50">50</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => onPageChange(page - 1)}
            disabled={page === 1}
            aria-label="Previous page"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          {getPageNumbers().map((p, i) =>
            p === "..." ? (
              <span
                key={`ellipsis-${i}`}
                className="px-2 text-sm text-muted-foreground"
              >
                …
              </span>
            ) : (
              <Button
                key={p}
                variant={p === page ? "default" : "outline"}
                size="icon"
                className="h-8 w-8"
                onClick={() => onPageChange(p as number)}
              >
                {p}
              </Button>
            ),
          )}
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => onPageChange(page + 1)}
            disabled={page === totalPages}
            aria-label="Next page"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Lint**

```bash
pnpm --filter web lint:fix
```

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/components/ui/date-range-picker.tsx apps/web/src/components/ui/pagination.tsx
git commit -m "feat(web): add DateRangePicker and Pagination UI components"
```

---

## Task 10: Frontend Filter Hooks

**Files:**

- Create: `apps/web/src/hooks/useTransactionFilters.ts`
- Create: `apps/web/src/hooks/useContactFilters.ts`
- Create: `apps/web/src/hooks/useProjectFilters.ts`
- Create: `apps/web/src/hooks/useSharedHistoryFilters.ts`
- Create: `apps/web/src/hooks/useWitnessFilters.ts`

Each hook manages filter + pagination state and resets `page` to 1 whenever a non-pagination filter changes.

- [ ] **Step 1: Create `useTransactionFilters`**

Create `apps/web/src/hooks/useTransactionFilters.ts`:

```typescript
import { useState, useEffect } from "react";
import {
  TransactionStatus,
  TransactionType,
} from "@/types/__generated__/graphql";

interface DateRange {
  from: string | null;
  to: string | null;
}

export function useTransactionFilters() {
  const [search, setSearch] = useState("");
  const [types, setTypes] = useState<TransactionType[]>([]);
  const [status, setStatus] = useState<TransactionStatus | "ALL">("ALL");
  const [currency, setCurrency] = useState("ALL");
  const [dateRange, setDateRange] = useState<DateRange>({
    from: null,
    to: null,
  });
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);

  // Reset page on any filter change
  useEffect(() => {
    setPage(1);
  }, [search, types, status, currency, dateRange]);

  const reset = () => {
    setSearch("");
    setTypes([]);
    setStatus("ALL");
    setCurrency("ALL");
    setDateRange({ from: null, to: null });
    setPage(1);
  };

  const variables = {
    filter: {
      ...(search && { search }),
      ...(types.length > 0 && { types }),
      ...(status !== "ALL" && { status: status as TransactionStatus }),
      ...(currency !== "ALL" && { currency }),
      ...(dateRange.from && { startDate: new Date(dateRange.from) }),
      ...(dateRange.to && { endDate: new Date(dateRange.to) }),
      page,
      limit,
    },
  };

  return {
    search,
    setSearch,
    types,
    setTypes,
    status,
    setStatus,
    currency,
    setCurrency,
    dateRange,
    setDateRange,
    page,
    setPage,
    limit,
    setLimit,
    reset,
    variables,
  };
}
```

- [ ] **Step 2: Create `useContactFilters`**

Create `apps/web/src/hooks/useContactFilters.ts`:

```typescript
import { useState, useEffect } from "react";
import { ContactBalanceStanding } from "@/types/__generated__/graphql";

export function useContactFilters() {
  const [search, setSearch] = useState("");
  const [balanceStanding, setBalanceStanding] = useState<
    ContactBalanceStanding | "ALL"
  >("ALL");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);

  useEffect(() => {
    setPage(1);
  }, [search, balanceStanding]);

  const variables = {
    filter: {
      ...(search && { search }),
      ...(balanceStanding !== "ALL" && {
        balanceStanding: balanceStanding as ContactBalanceStanding,
      }),
      page,
      limit,
    },
  };

  return {
    search,
    setSearch,
    balanceStanding,
    setBalanceStanding,
    page,
    setPage,
    limit,
    setLimit,
    variables,
  };
}
```

- [ ] **Step 3: Create `useProjectFilters`**

Create `apps/web/src/hooks/useProjectFilters.ts`:

```typescript
import { useState, useEffect } from "react";
import {
  ProjectStatus,
  ProjectBalanceStanding,
} from "@/types/__generated__/graphql";

export function useProjectFilters() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<ProjectStatus | "ALL">("ALL");
  const [balanceStanding, setBalanceStanding] = useState<
    ProjectBalanceStanding | "ALL"
  >("ALL");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);

  useEffect(() => {
    setPage(1);
  }, [search, status, balanceStanding]);

  const variables = {
    filter: {
      ...(search && { search }),
      ...(status !== "ALL" && { status: status as ProjectStatus }),
      ...(balanceStanding !== "ALL" && {
        balanceStanding: balanceStanding as ProjectBalanceStanding,
      }),
      page,
      limit,
    },
  };

  return {
    search,
    setSearch,
    status,
    setStatus,
    balanceStanding,
    setBalanceStanding,
    page,
    setPage,
    limit,
    setLimit,
    variables,
  };
}
```

- [ ] **Step 4: Create `useSharedHistoryFilters`**

Create `apps/web/src/hooks/useSharedHistoryFilters.ts`:

```typescript
import { useState, useEffect } from "react";
import {
  TransactionType,
  TransactionStatus,
} from "@/types/__generated__/graphql";

interface DateRange {
  from: string | null;
  to: string | null;
}

export function useSharedHistoryFilters() {
  const [search, setSearch] = useState("");
  const [types, setTypes] = useState<TransactionType[]>([]);
  const [status, setStatus] = useState<TransactionStatus | "ALL">("ALL");
  const [dateRange, setDateRange] = useState<DateRange>({
    from: null,
    to: null,
  });
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);

  useEffect(() => {
    setPage(1);
  }, [search, types, status, dateRange]);

  const variables = {
    filter: {
      ...(search && { search }),
      ...(types.length > 0 && { types }),
      ...(status !== "ALL" && { status: status as TransactionStatus }),
      ...(dateRange.from && { startDate: new Date(dateRange.from) }),
      ...(dateRange.to && { endDate: new Date(dateRange.to) }),
      page,
      limit,
    },
  };

  return {
    search,
    setSearch,
    types,
    setTypes,
    status,
    setStatus,
    dateRange,
    setDateRange,
    page,
    setPage,
    limit,
    setLimit,
    variables,
  };
}
```

- [ ] **Step 5: Create `useWitnessFilters`**

Create `apps/web/src/hooks/useWitnessFilters.ts`:

```typescript
import { useState, useEffect } from "react";

interface DateRange {
  from: string | null;
  to: string | null;
}

export function useWitnessFilters() {
  const [search, setSearch] = useState("");
  const [dateRange, setDateRange] = useState<DateRange>({
    from: null,
    to: null,
  });
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);

  useEffect(() => {
    setPage(1);
  }, [search, dateRange]);

  const variables = {
    filter: {
      ...(search && { search }),
      ...(dateRange.from && { startDate: new Date(dateRange.from) }),
      ...(dateRange.to && { endDate: new Date(dateRange.to) }),
      page,
      limit,
    },
  };

  return {
    search,
    setSearch,
    dateRange,
    setDateRange,
    page,
    setPage,
    limit,
    setLimit,
    variables,
  };
}
```

- [ ] **Step 6: Lint**

```bash
pnpm --filter web lint:fix
```

- [ ] **Step 7: Commit**

```bash
git add apps/web/src/hooks/useTransactionFilters.ts apps/web/src/hooks/useContactFilters.ts apps/web/src/hooks/useProjectFilters.ts apps/web/src/hooks/useSharedHistoryFilters.ts apps/web/src/hooks/useWitnessFilters.ts
git commit -m "feat(web): add per-feature filter state hooks"
```

---

## Task 11: Frontend GraphQL Queries

**Files:**

- Modify: `apps/web/src/lib/apollo/queries/transactions.ts`
- Modify: `apps/web/src/lib/apollo/queries/contacts.ts`
- Modify: `apps/web/src/lib/apollo/queries/projects.ts`
- Modify: `apps/web/src/lib/apollo/queries/witnesses.ts`

- [ ] **Step 1: Update `GET_TRANSACTIONS` in `transactions.ts`**

The query must pass `filter` (which now includes `page`/`limit`) and request `total`, `page`, `limit` in the response:

```graphql
query Transactions($filter: FilterTransactionInput) {
  transactions(filter: $filter) {
    items {
      # ... existing transaction fields unchanged
    }
    summary {
      # ... existing summary fields unchanged
    }
    total
    page
    limit
  }
}
```

Update the TypedDocumentNode type annotation to `TransactionsQuery` / `TransactionsQueryVariables` (these should already exist — regenerate if missing).

- [ ] **Step 2: Update `GET_MY_CONTACT_TRANSACTIONS` in `transactions.ts`**

```graphql
query MyContactTransactions($filter: FilterSharedHistoryInput) {
  myContactTransactions(filter: $filter) {
    items {
      id
      amount
      currency
      type
      category
      itemName
      description
      date
      returnDirection
      status
      createdBy {
        id
        firstName
        lastName
        name
      }
      contact {
        id
        name
      }
    }
    total
    page
    limit
  }
}
```

Update the TypedDocumentNode types accordingly (add new generated types for the new query shape).

- [ ] **Step 3: Update `GET_CONTACTS` in `contacts.ts`**

```graphql
query GetContacts($filter: FilterContactInput) {
  contacts(filter: $filter) {
    items {
      id
      name
      email
      phoneNumber
      balance
      isOnPlatform
      isSupporter
      hasPendingInvitation
      createdAt
    }
    total
    page
    limit
  }
}
```

Update the TypedDocumentNode type annotation (`GetContactsQuery` / `GetContactsQueryVariables`).

- [ ] **Step 4: Update `PROJECT_FRAGMENT` and queries in `projects.ts`**

Add `status` to `PROJECT_FRAGMENT`:

```graphql
fragment ProjectFields on Project {
  id
  name
  description
  budget
  balance
  totalIncome
  totalExpenses
  currency
  status
  userId
  createdAt
  updatedAt
}
```

Update `GET_MY_PROJECTS`:

```graphql
query GetMyProjects($filter: FilterProjectInput) {
  myProjects(filter: $filter) {
    items {
      ...ProjectFields
    }
    total
    page
    limit
  }
}
```

Update `GET_PROJECT` to pass filter to `transactions`:

```graphql
query GetProject($id: ID!, $transactionFilter: FilterProjectTransactionInput) {
  project(id: $id) {
    ...ProjectFields
    transactions(filter: $transactionFilter) {
      items {
        ...ProjectTransactionFields
      }
      total
      page
      limit
    }
  }
}
```

- [ ] **Step 5: Update `MY_WITNESS_REQUESTS` in `witnesses.ts`**

```graphql
query MyWitnessRequests($status: WitnessStatus, $filter: FilterWitnessInput) {
  myWitnessRequests(status: $status, filter: $filter) {
    items {
      id
      status
      invitedAt
      acknowledgedAt
      transaction {
        id
        amount
        currency
        type
        category
        itemName
        description
        date
        returnDirection
        createdBy {
          name
          email
          isSupporter
        }
        contact {
          id
          firstName
          lastName
          name
          isSupporter
        }
      }
    }
    total
    page
    limit
  }
}
```

- [ ] **Step 6: Build frontend to identify type errors**

```bash
pnpm --filter web build
```

Expected: TypeScript errors about old vs. new query shapes — these will be fixed in the next task (data hooks + route updates).

- [ ] **Step 7: Commit**

```bash
git add apps/web/src/lib/apollo/queries/
git commit -m "feat(web): update GraphQL queries for server-side pagination"
```

---

## Task 12: Frontend Data Hooks

**Files:**

- Modify: `apps/web/src/hooks/useTransactions.ts`
- Modify: `apps/web/src/hooks/useContacts.ts`
- Modify: `apps/web/src/hooks/useProjects.ts`
- Modify: `apps/web/src/hooks/useWitnesses.ts`
- Create: `apps/web/src/hooks/useMyContactTransactions.ts`

- [ ] **Step 1: Update `useTransactions`**

```typescript
export function useTransactions(filter?: FilterTransactionInput) {
  const { data, loading, error, refetch } = useQuery(GET_TRANSACTIONS, {
    variables: { filter },
    fetchPolicy: "cache-and-network",
  });

  // ... existing mutations unchanged ...

  return {
    transactions: data?.transactions?.items || [],
    summary: data?.transactions?.summary,
    total: data?.transactions?.total ?? 0,
    page: data?.transactions?.page ?? 1,
    limit: data?.transactions?.limit ?? 25,
    loading,
    error,
    createTransaction,
    creating,
    removeTransaction,
    removing,
    refetch,
  };
}
```

- [ ] **Step 2: Update `useContacts`**

```typescript
import { FilterContactInput } from "@/types/__generated__/graphql";

export function useContacts(filter?: FilterContactInput) {
  const { data, loading, error, refetch } = useQuery(GET_CONTACTS, {
    variables: { filter },
    fetchPolicy: "cache-and-network",
  });

  // ... existing mutations unchanged ...

  return {
    contacts: data?.contacts?.items ?? [],
    total: data?.contacts?.total ?? 0,
    page: data?.contacts?.page ?? 1,
    limit: data?.contacts?.limit ?? 25,
    loading,
    creating,
    updating,
    error,
    createContact,
    updateContact,
    deleteContact,
    refetch,
  };
}
```

- [ ] **Step 3: Update `useProjects` — `useProjects` function**

```typescript
import { FilterProjectInput } from "@/types/__generated__/graphql";

export function useProjects(filter?: FilterProjectInput) {
  const { data, loading, error, refetch } = useQuery(GET_MY_PROJECTS, {
    variables: { filter },
    fetchPolicy: "cache-and-network",
  });

  // ... existing createProject mutation unchanged ...

  return {
    projects: data?.myProjects?.items || [],
    total: data?.myProjects?.total ?? 0,
    page: data?.myProjects?.page ?? 1,
    limit: data?.myProjects?.limit ?? 25,
    loading,
    error,
    createProject,
    creating,
    refetch,
  };
}
```

Update `useProject` to pass `transactionFilter` to the query:

```typescript
export function useProject(
  id: string,
  transactionFilter?: FilterProjectTransactionInput,
) {
  const { data, loading, error, refetch } = useQuery(GET_PROJECT, {
    variables: { id, transactionFilter },
    skip: !id,
    fetchPolicy: "cache-and-network",
  });

  // ... existing mutations unchanged ...

  return {
    project: data?.project,
    transactions: data?.project?.transactions?.items ?? [],
    transactionsTotal: data?.project?.transactions?.total ?? 0,
    transactionsPage: data?.project?.transactions?.page ?? 1,
    transactionsLimit: data?.project?.transactions?.limit ?? 25,
    loading,
    error,
    updateProject,
    updating,
    logTransaction,
    logging,
    refetch,
  };
}
```

- [ ] **Step 4: Create `useMyContactTransactions`**

Create `apps/web/src/hooks/useMyContactTransactions.ts`:

```typescript
import { useQuery } from "@apollo/client/react";
import { GET_MY_CONTACT_TRANSACTIONS } from "@/lib/apollo/queries/transactions";
import type { FilterSharedHistoryInput } from "@/types/__generated__/graphql";

export function useMyContactTransactions(filter?: FilterSharedHistoryInput) {
  const { data, loading, error, refetch } = useQuery(
    GET_MY_CONTACT_TRANSACTIONS,
    {
      variables: { filter },
      fetchPolicy: "cache-and-network",
    },
  );

  return {
    transactions: data?.myContactTransactions?.items ?? [],
    total: data?.myContactTransactions?.total ?? 0,
    page: data?.myContactTransactions?.page ?? 1,
    limit: data?.myContactTransactions?.limit ?? 25,
    loading,
    error,
    refetch,
  };
}
```

- [ ] **Step 5: Update `useMyWitnessRequests` in `useWitnesses.ts`**

```typescript
import {
  FilterWitnessInput,
  WitnessStatus,
} from "@/types/__generated__/graphql";

export function useMyWitnessRequests(
  status?: WitnessStatus,
  filter?: FilterWitnessInput,
) {
  const { data, loading, error, refetch } = useQuery(MY_WITNESS_REQUESTS, {
    variables: { status, filter },
    fetchPolicy: "network-only",
  });

  return {
    requests: data?.myWitnessRequests?.items ?? [],
    total: data?.myWitnessRequests?.total ?? 0,
    page: data?.myWitnessRequests?.page ?? 1,
    limit: data?.myWitnessRequests?.limit ?? 25,
    loading,
    error,
    refetch,
  };
}
```

- [ ] **Step 6: Build to verify no type errors**

```bash
pnpm --filter web build
```

- [ ] **Step 7: Commit**

```bash
git add apps/web/src/hooks/
git commit -m "feat(web): update data hooks for server-side pagination"
```

---

## Task 13: Transactions Page

**Files:**

- Modify: `apps/web/src/routes/transactions/index.tsx`

- [ ] **Step 1: Replace inline filter state with `useTransactionFilters`**

In `apps/web/src/routes/transactions/index.tsx`:

1. Remove the existing `useState` for `search`, `typeFilter`, `statusFilter`, `currencyFilter`
2. Import and call `useTransactionFilters()`
3. Pass `variables.filter` to `useTransactions(filter)`
4. Replace client-side filter logic (`.filter()` calls on the transactions array) with the paginated `transactions` array directly from the hook

- [ ] **Step 2: Add `DateRangePicker` to the filter bar**

Import `DateRangePicker` from `@/components/ui/date-range-picker`. Add it to the existing filter row:

```tsx
<DateRangePicker value={dateRange} onChange={setDateRange} />
```

- [ ] **Step 3: Add `Pagination` below both tabs**

Import `Pagination` from `@/components/ui/pagination`. Below the Funds tab table and below the Items tab table:

```tsx
<Pagination
  total={total}
  page={page}
  limit={limit}
  onPageChange={setPage}
  onLimitChange={setLimit}
/>
```

- [ ] **Step 4: Lint and build**

```bash
pnpm --filter web lint:fix
pnpm --filter web build
```

- [ ] **Step 5: Manually test**

Start `pnpm dev` and verify:

- Transactions load with pagination controls
- Search, type, status, currency filters work
- Date range filter narrows results
- Page changes load the correct results
- Existing features (CSV export, Add Transaction, summary cards) still work

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/routes/transactions/index.tsx
git commit -m "feat(web): add server-side pagination and date range to transactions page"
```

---

## Task 14: Contacts Page

**Files:**

- Modify: `apps/web/src/routes/contacts/index.tsx`

- [ ] **Step 1: Replace inline search state with `useContactFilters`**

1. Remove existing `const [search, setSearch] = useState("")`
2. Import and call `useContactFilters()`
3. Pass `variables.filter` to `useContacts(filter)`
4. Remove client-side `.filter()` call on contacts array

- [ ] **Step 2: Add balance standing segmented control**

In the filter bar, below or alongside the search input:

```tsx
<div className="flex rounded-lg overflow-hidden border border-border">
  {(["ALL", "OWED_TO_ME", "I_OWE"] as const).map((standing) => (
    <button
      key={standing}
      type="button"
      onClick={() => setBalanceStanding(standing)}
      className={`px-3 py-1.5 text-xs font-medium transition-colors ${
        balanceStanding === standing
          ? "bg-primary text-primary-foreground"
          : "bg-background text-muted-foreground hover:text-foreground"
      }`}
    >
      {standing === "ALL"
        ? "All"
        : standing === "OWED_TO_ME"
          ? "They Owe Me"
          : "I Owe Them"}
    </button>
  ))}
</div>
```

- [ ] **Step 3: Add `Pagination` below the contact grid**

```tsx
<Pagination
  total={total}
  page={page}
  limit={limit}
  onPageChange={setPage}
  onLimitChange={setLimit}
/>
```

- [ ] **Step 4: Lint, build, manual test, commit**

```bash
pnpm --filter web lint:fix && pnpm --filter web build
```

Verify: search, balance standing filter, pagination all work. Existing CRUD (add/edit/delete/invite contact) still works.

```bash
git add apps/web/src/routes/contacts/index.tsx
git commit -m "feat(web): add pagination and balance standing filter to contacts page"
```

---

## Task 15: Contact Details Page

**Files:**

- Modify: `apps/web/src/routes/contacts/$contactId.tsx`

- [ ] **Step 1: Add `useTransactionFilters` for the contact's transaction list**

The contact details page already calls `useTransactions({ contactId })`. Replace the manual filter approach with `useTransactionFilters()` and merge `contactId` into the filter:

```typescript
const {
  variables,
  dateRange,
  setDateRange,
  types,
  setTypes,
  status,
  setStatus,
  page,
  setPage,
  limit,
  setLimit,
} = useTransactionFilters();
const { transactions, total, loading } = useTransactions({
  ...variables.filter,
  contactId,
});
```

- [ ] **Step 2: Add compact filter bar**

Above the transaction table, add a compact filter row:

```tsx
<div className="flex flex-wrap gap-2 items-center p-4 border-b border-border/30">
  <DateRangePicker value={dateRange} onChange={setDateRange} />
  <Select
    value={types[0] ?? "ALL"}
    onValueChange={(v) => setTypes(v === "ALL" ? [] : [v as TransactionType])}
  >
    <SelectTrigger className="h-8 w-36">
      <SelectValue placeholder="Type" />
    </SelectTrigger>
    <SelectContent>
      <SelectItem value="ALL">All Types</SelectItem>
      <SelectItem value="GIVEN">Given</SelectItem>
      <SelectItem value="RECEIVED">Received</SelectItem>
      <SelectItem value="RETURNED">Returned</SelectItem>
      <SelectItem value="GIFT">Gift</SelectItem>
    </SelectContent>
  </Select>
  <Select
    value={status}
    onValueChange={(v) => setStatus(v as TransactionStatus | "ALL")}
  >
    <SelectTrigger className="h-8 w-36">
      <SelectValue placeholder="Status" />
    </SelectTrigger>
    <SelectContent>
      <SelectItem value="ALL">All Status</SelectItem>
      <SelectItem value="COMPLETED">Completed</SelectItem>
      <SelectItem value="PENDING">Pending</SelectItem>
      <SelectItem value="CANCELLED">Cancelled</SelectItem>
    </SelectContent>
  </Select>
</div>
```

- [ ] **Step 3: Add `Pagination` below transaction table**

```tsx
<Pagination
  total={total}
  page={page}
  limit={limit}
  onPageChange={setPage}
  onLimitChange={setLimit}
/>
```

- [ ] **Step 4: Lint, build, manual test, commit**

Verify: contact summary cards unchanged, transaction table filters work, pagination works, CSV export still works.

```bash
git add apps/web/src/routes/contacts/'$contactId.tsx'
git commit -m "feat(web): add filter bar and pagination to contact details page"
```

---

## Task 16: Projects Page

**Files:**

- Modify: `apps/web/src/routes/projects/index.tsx`

- [ ] **Step 1: Replace with `useProjectFilters`**

Call `useProjectFilters()`, pass `variables.filter` to `useProjects(filter)`.

- [ ] **Step 2: Add search input, status control, balance standing control**

```tsx
{
  /* Search */
}
<Input
  placeholder="Search projects..."
  value={search}
  onChange={(e) => setSearch(e.target.value)}
  className="h-9 w-full sm:w-64"
/>;

{
  /* Status tabs */
}
<div className="flex rounded-lg overflow-hidden border border-border">
  {(["ALL", "ACTIVE", "COMPLETED", "ARCHIVED"] as const).map((s) => (
    <button
      key={s}
      type="button"
      onClick={() => setStatus(s)}
      className={`px-3 py-1.5 text-xs font-medium transition-colors ${status === s ? "bg-primary text-primary-foreground" : "bg-background text-muted-foreground hover:text-foreground"}`}
    >
      {s === "ALL" ? "All" : s.charAt(0) + s.slice(1).toLowerCase()}
    </button>
  ))}
</div>;

{
  /* Balance standing */
}
<Select
  value={balanceStanding}
  onValueChange={(v) => setBalanceStanding(v as ProjectBalanceStanding | "ALL")}
>
  <SelectTrigger className="h-9 w-40">
    <SelectValue />
  </SelectTrigger>
  <SelectContent>
    <SelectItem value="ALL">All Budgets</SelectItem>
    <SelectItem value="UNDER_BUDGET">Under Budget</SelectItem>
    <SelectItem value="OVER_BUDGET">Over Budget</SelectItem>
  </SelectContent>
</Select>;
```

- [ ] **Step 3: Add `Pagination` below project grid**

- [ ] **Step 4: Lint, build, manual test, commit**

Verify: project cards display `status` badge if status is not ACTIVE. Search, status, budget filters work. New project creation still works.

```bash
git add apps/web/src/routes/projects/index.tsx
git commit -m "feat(web): add search, status, budget filter and pagination to projects page"
```

---

## Task 17: Project Details Page

**Files:**

- Modify: `apps/web/src/routes/projects/$projectId.tsx`

- [ ] **Step 1: Add project transaction filter state**

The project details page calls `useProject(id)`. Change it to:

```typescript
const [txFilter, setTxFilter] = useState<FilterProjectTransactionInput>({
  page: 1,
  limit: 25,
});
const {
  project,
  transactions,
  transactionsTotal,
  transactionsPage,
  transactionsLimit,
  loading,
  logTransaction,
  logging,
  refetch,
} = useProject(projectId, txFilter);
```

- [ ] **Step 2: Add compact filter bar above transaction table**

```tsx
<div className="flex flex-wrap gap-2 items-center p-4 border-b border-border/30">
  <DateRangePicker
    value={{
      from: txFilter.startDate ? txFilter.startDate.toString() : null,
      to: txFilter.endDate ? txFilter.endDate.toString() : null,
    }}
    onChange={(range) =>
      setTxFilter((f) => ({
        ...f,
        startDate: range.from ? new Date(range.from) : undefined,
        endDate: range.to ? new Date(range.to) : undefined,
        page: 1,
      }))
    }
  />
  <Select
    value={txFilter.type ?? "ALL"}
    onValueChange={(v) =>
      setTxFilter((f) => ({
        ...f,
        type: v === "ALL" ? undefined : (v as ProjectTransactionType),
        page: 1,
      }))
    }
  >
    <SelectTrigger className="h-8 w-36">
      <SelectValue />
    </SelectTrigger>
    <SelectContent>
      <SelectItem value="ALL">All Types</SelectItem>
      <SelectItem value="INCOME">Income</SelectItem>
      <SelectItem value="EXPENSE">Expense</SelectItem>
    </SelectContent>
  </Select>
  {/* Category dropdown — populated from unique categories across all project transactions */}
  {availableCategories.length > 0 && (
    <Select
      value={txFilter.category ?? "ALL"}
      onValueChange={(v) =>
        setTxFilter((f) => ({
          ...f,
          category: v === "ALL" ? undefined : v,
          page: 1,
        }))
      }
    >
      <SelectTrigger className="h-8 w-40">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="ALL">All Categories</SelectItem>
        {availableCategories.map((cat) => (
          <SelectItem key={cat} value={cat}>
            {cat}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )}
</div>
```

Derive `availableCategories` by fetching the project with no filter on page load (`useProject(id, {})`) and storing the distinct categories in a `useRef` that is only populated once (before any filter is applied). This avoids the category list changing as the user filters — once cached, it stays stable for the session:

```typescript
const categoryCache = useRef<string[]>([]);
useEffect(() => {
  if (categoryCache.current.length === 0 && initialTransactions.length > 0) {
    categoryCache.current = [
      ...new Set(initialTransactions.map((t) => t.category).filter(Boolean)),
    ];
  }
}, [initialTransactions]);
const availableCategories = categoryCache.current;
```

- [ ] **Step 3: Add `Pagination`**

```tsx
<Pagination
  total={transactionsTotal}
  page={transactionsPage}
  limit={transactionsLimit}
  onPageChange={(p) => setTxFilter((f) => ({ ...f, page: p }))}
  onLimitChange={(l) => setTxFilter((f) => ({ ...f, limit: l, page: 1 }))}
/>
```

- [ ] **Step 4: Replace `transactions` source in table render**

The table previously rendered `project?.transactions` (a flat array). Replace it with `transactions` from the hook (already the paginated items array).

- [ ] **Step 5: Lint, build, manual test, commit**

```bash
git add apps/web/src/routes/projects/'$projectId.tsx'
git commit -m "feat(web): add filter bar and pagination to project details page"
```

---

## Task 18: Shared History Page

**Files:**

- Modify: `apps/web/src/routes/transactions/my-contact-transactions.tsx`

- [ ] **Step 1: Replace inline `useQuery` with `useMyContactTransactions`**

Remove the direct `useQuery(GET_MY_CONTACT_TRANSACTIONS)` call. Import and call:

```typescript
const {
  search,
  setSearch,
  types,
  setTypes,
  status,
  setStatus,
  dateRange,
  setDateRange,
  page,
  setPage,
  limit,
  setLimit,
  variables,
} = useSharedHistoryFilters();
const { transactions, total, loading, error } = useMyContactTransactions(
  variables.filter,
);
```

- [ ] **Step 2: Add filter bar**

Above the transaction table:

```tsx
<div className="flex flex-wrap gap-3 items-center">
  <Input
    placeholder="Search by description or person..."
    value={search}
    onChange={(e) => setSearch(e.target.value)}
    className="h-9 w-full sm:w-64"
  />
  <DateRangePicker value={dateRange} onChange={setDateRange} />
  <Select
    value={types[0] ?? "ALL"}
    onValueChange={(v) => setTypes(v === "ALL" ? [] : [v as TransactionType])}
  >
    {/* same type options as contact details */}
  </Select>
  <Select
    value={status}
    onValueChange={(v) => setStatus(v as TransactionStatus | "ALL")}
  >
    {/* same status options */}
  </Select>
</div>
```

- [ ] **Step 3: Replace `transactions` source in table render**

Previously `data?.myContactTransactions || []`. Now `transactions` directly from the hook.

- [ ] **Step 4: Add `Pagination`**

```tsx
<Pagination
  total={total}
  page={page}
  limit={limit}
  onPageChange={setPage}
  onLimitChange={setLimit}
/>
```

- [ ] **Step 5: Lint, build, manual test, commit**

```bash
git add apps/web/src/routes/transactions/my-contact-transactions.tsx
git commit -m "feat(web): add filter bar and pagination to shared history page"
```

---

## Task 19: Witness Requests Page

**Files:**

- Modify: `apps/web/src/routes/witnesses/index.tsx`

- [ ] **Step 1: Add `useWitnessFilters` and update `useMyWitnessRequests`**

```typescript
const {
  search,
  setSearch,
  dateRange,
  setDateRange,
  page,
  setPage,
  limit,
  setLimit,
  variables,
} = useWitnessFilters();

// Check the actual tab values in this file — the existing code uses "pending" | "history"
// For "pending" tab pass WitnessStatus.Pending; for "history" pass undefined (returns all non-pending)
// Adjust if the component uses different string values for activeTab
const { requests, total, loading, error, refetch } = useMyWitnessRequests(
  activeTab === "pending" ? WitnessStatus.Pending : undefined,
  variables.filter,
);
```

Reset `page` to 1 when `activeTab` changes:

```typescript
useEffect(() => {
  setPage(1);
}, [activeTab]);
```

- [ ] **Step 2: Add filter bar above tab content**

```tsx
<div className="flex flex-wrap gap-3 items-center mb-4">
  <Input
    placeholder="Search by description or person..."
    value={search}
    onChange={(e) => setSearch(e.target.value)}
    className="h-9 w-full sm:w-64"
  />
  <DateRangePicker value={dateRange} onChange={setDateRange} />
</div>
```

- [ ] **Step 3: Update `WitnessList` component call**

The `WitnessList` component receives `requests` which was previously the full array. Now pass `requests` directly (already paginated). Add `Pagination` below it:

```tsx
<WitnessList requests={requests} onAcknowledge={acknowledge} loading={mutationLoading} />
<Pagination total={total} page={page} limit={limit} onPageChange={setPage} onLimitChange={setLimit} />
```

- [ ] **Step 4: Lint, build, manual test, commit**

Verify: pending and history tabs both show paginated results, search and date range filters work, acknowledge/decline actions still work.

```bash
git add apps/web/src/routes/witnesses/index.tsx
git commit -m "feat(web): add filter bar and pagination to witness requests page"
```

---

## Task 20: Final Integration Verification

- [ ] **Step 1: Run full test suite**

```bash
pnpm test
```

Expected: All tests pass.

- [ ] **Step 2: Run full build**

```bash
pnpm build
```

Expected: No TypeScript or lint errors.

- [ ] **Step 3: Start dev servers and manual smoke test**

```bash
pnpm dev
```

Verify each page:

- [ ] Transactions: pagination works, date range filters, all existing filters still work, CSV export works
- [ ] Contacts: search, balance standing, pagination — add/edit/delete still works
- [ ] Contact details: compact filter bar, pagination, CSV export still works
- [ ] Projects: search, status filter, budget filter, pagination — create project still works, status shown on cards
- [ ] Project details: date/type/category filter, pagination — log transaction still works
- [ ] Shared History: search, date range, type, status, pagination — perspective flip display unchanged
- [ ] Witness Requests: search, date range, pagination, pending/history tabs — acknowledge/decline still works

- [ ] **Step 4: Final commit**

```bash
git add -A
git commit -m "feat: complete server-side pagination and filtering across all pages"
```
