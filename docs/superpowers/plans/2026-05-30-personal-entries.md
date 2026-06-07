# PersonalEntry Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move personal income/expense tracking out of the `transactions` table into a dedicated `PersonalEntry` model, drop `EXPENSE`/`INCOME` from `TransactionType`, and surface a real cash-position figure on the dashboard.

**Architecture:** A new self-contained `PersonalEntriesModule` (entity/DTO/service/resolver, mirroring `ProjectsModule`) owns personal cashflow. A two-step Atlas migration adds the `personal_entries` table, then moves legacy rows and recreates the `TransactionType` enum without `EXPENSE`/`INCOME`. Because project transactions currently borrow `TransactionType.INCOME`/`EXPENSE` to appear in the unified transactions feed, that merge is removed first (project data stays visible via `/projects` views and the dashboard `ProjectsWidget`). The frontend gains a "Personal" tab on the transactions page and a dashboard cash-position card.

**Tech Stack:** NestJS + GraphQL (code-first) + Prisma 7 (PostgreSQL) + Atlas migrations; TanStack Start (React 19) + Apollo Client + Shadcn UI.

---

## Decisions baked into this plan

- **Project-transaction feed (resolved fork):** project transactions are **removed from the unified transactions feed** (Option A). This is corrective — `total` already counts only contact transactions while the merge appended all project transactions to `items`, so pagination was inconsistent. Project data remains in `/projects/$projectId` and the dashboard `ProjectsWidget`.
- **Frontend placement:** personal entries live as a **fourth tab ("Personal") on the existing `/transactions` page**, not a new route — keeps money in/out co-located and avoids nav sprawl. (If the 4-tab row feels crowded on mobile during review, a dedicated `/entries` route is a clean fallback; the hook/component/queries built here are route-agnostic and would move unchanged.)
- **Migration column naming:** Prisma uses **camelCase** column names (no `@map`), so migration SQL uses `"createdById"`, `"createdAt"` — NOT snake_case. The original spec's `created_by_id`/`created_at` SQL was wrong and is corrected here.
- **Migration ordering:** legacy `EXPENSE`/`INCOME` rows are moved to `personal_entries` and deleted from `transactions` **before** recreating the `TransactionType` enum, otherwise the `::text::"TransactionType_new"` cast fails on rows whose value no longer exists in the new enum.

---

## File Structure

**Backend — new files (`apps/api/src/modules/personal-entries/`):**

- `personal-entries.module.ts` — module wiring
- `personal-entries.service.ts` — CRUD + summary business logic
- `personal-entries.service.spec.ts` — unit tests
- `personal-entries.resolver.ts` — GraphQL queries/mutations
- `entities/personal-entry.entity.ts` — `PersonalEntry` ObjectType + `PersonalEntryType` enum registration
- `entities/personal-entry-summary.entity.ts` — `PersonalEntrySummary` ObjectType
- `entities/paginated-personal-entries-response.entity.ts` — paginated list response
- `dto/create-personal-entry.input.ts`
- `dto/update-personal-entry.input.ts`
- `dto/filter-personal-entry.input.ts`

**Backend — modified files:**

- `apps/api/prisma/schema.prisma` — add `PersonalEntry` model + `PersonalEntryType` enum + `User.personalEntries` backref (Task 1); remove `EXPENSE`/`INCOME` from `TransactionType` (Task 6)
- `apps/api/src/app.module.ts` — register `PersonalEntriesModule`
- `apps/api/src/modules/transactions/transactions.service.ts` — remove project-transaction merge from `findAll` feed
- `apps/api/src/modules/transactions/dto/create-transaction.input.ts` — drop `EXPENSE`/`INCOME` from the `@IsNotIn` guard
- `apps/api/atlas/migrations/` — Migration A (auto, additive table) + Migration B (manual, data move + enum recreation)

**Frontend — new files:**

- `apps/web/src/lib/apollo/queries/personal-entries.ts` — GraphQL operations
- `apps/web/src/hooks/usePersonalEntries.ts` — query/mutation hook
- `apps/web/src/components/personal-entries/PersonalEntryForm.tsx` — create/edit form
- `apps/web/src/components/personal-entries/PersonalEntriesTab.tsx` — list + summary tab content

**Frontend — modified files:**

- `apps/web/src/routes/transactions/index.tsx` — add "Personal" tab
- `apps/web/src/components/dashboard/Dashboard.tsx` — fix mislabeled balance card + add cash-position card

---

## Phase 1 — PersonalEntry model + module (additive, no enum drop)

### Task 1: Add PersonalEntry model + enum + migration

**Files:**

- Modify: `apps/api/prisma/schema.prisma`
- Create: `apps/api/atlas/migrations/<atlas-generated>.sql`

- [ ] **Step 1: Add the model, enum, and User backref to schema.prisma**

Add the enum next to the other enums (after `ProjectTransactionType`, around line 353):

```prisma
enum PersonalEntryType {
  INCOME
  EXPENSE
}
```

Add the model after the `Project`-related models (e.g. after `ProjectTransactionHistory`, around line 240):

```prisma
model PersonalEntry {
  id          String            @id @default(uuid())
  type        PersonalEntryType
  amount      Decimal           @db.Decimal(10, 2)
  currency    String            @default("NGN")
  category    String?
  date        DateTime
  description String?
  createdAt   DateTime          @default(now())
  createdById String
  createdBy   User              @relation(fields: [createdById], references: [id])

  @@index([createdById])
  @@map("personal_entries")
}
```

Add the backref to the `User` model (inside `model User`, alongside `projects` around line 35):

```prisma
  personalEntries            PersonalEntry[]
```

- [ ] **Step 2: Regenerate the Prisma client**

Run: `pnpm --filter api db:generate`
Expected: completes with no errors; `PersonalEntryType` now exists in `apps/api/src/generated/prisma/enums.ts`.

- [ ] **Step 3: Generate the Atlas migration (additive — auto-generates cleanly)**

Run (from repo root): `pnpm --filter api db:migrate`
Expected: a new file appears in `apps/api/atlas/migrations/` containing `CREATE TYPE "PersonalEntryType"` and `CREATE TABLE "personal_entries"` with a FK to `users`. No "reordering enum value" error (this migration only adds, never removes).

- [ ] **Step 4: Lint the migration**

Run (from `apps/api/`): `pnpm --filter api db:lint`
Expected: passes. If it flags the `personal_entries → users` FK for missing `NOT VALID`, edit the generated SQL to split it: `ALTER TABLE "personal_entries" ADD CONSTRAINT ... FOREIGN KEY (...) REFERENCES "users" (...) NOT VALID;` followed by `ALTER TABLE "personal_entries" VALIDATE CONSTRAINT ...;`, then run `atlas migrate hash --dir file://atlas/migrations`.

- [ ] **Step 5: Apply and verify**

Run: `pnpm --filter api db:apply`
Expected: applies with **zero errors**. Verify the table exists:
`psql "$DATABASE_URL" -c "\d personal_entries"` → shows columns `id, type, amount, currency, category, date, description, createdAt, createdById`.

- [ ] **Step 6: Commit**

```bash
git add apps/api/prisma/schema.prisma apps/api/src/generated apps/api/atlas/migrations
git commit -m "feat(api): add PersonalEntry model and personal_entries table"
```

---

### Task 2: Backend entities + DTOs

**Files:**

- Create: `apps/api/src/modules/personal-entries/entities/personal-entry.entity.ts`
- Create: `apps/api/src/modules/personal-entries/entities/personal-entry-summary.entity.ts`
- Create: `apps/api/src/modules/personal-entries/entities/paginated-personal-entries-response.entity.ts`
- Create: `apps/api/src/modules/personal-entries/dto/create-personal-entry.input.ts`
- Create: `apps/api/src/modules/personal-entries/dto/update-personal-entry.input.ts`
- Create: `apps/api/src/modules/personal-entries/dto/filter-personal-entry.input.ts`

- [ ] **Step 1: Create the PersonalEntry entity**

`apps/api/src/modules/personal-entries/entities/personal-entry.entity.ts`:

```typescript
import {
  ObjectType,
  Field,
  Float,
  ID,
  registerEnumType,
} from "@nestjs/graphql";
import { PersonalEntryType } from "../../../generated/prisma/enums";

registerEnumType(PersonalEntryType, { name: "PersonalEntryType" });

@ObjectType()
export class PersonalEntry {
  @Field(() => ID)
  id: string;

  @Field(() => PersonalEntryType)
  type: PersonalEntryType;

  @Field(() => Float)
  amount: number;

  @Field({ defaultValue: "NGN" })
  currency: string;

  @Field({ nullable: true })
  category?: string;

  @Field()
  date: Date;

  @Field({ nullable: true })
  description?: string;

  @Field()
  createdAt: Date;

  @Field()
  createdById: string;
}
```

- [ ] **Step 2: Create the summary entity**

`apps/api/src/modules/personal-entries/entities/personal-entry-summary.entity.ts`:

```typescript
import { ObjectType, Field, Float } from "@nestjs/graphql";

@ObjectType()
export class PersonalEntrySummary {
  @Field(() => Float, { defaultValue: 0 })
  totalIncome: number;

  @Field(() => Float, { defaultValue: 0 })
  totalExpenses: number;

  @Field(() => Float, { defaultValue: 0 })
  netCashPosition: number;

  @Field({ defaultValue: "NGN" })
  currency: string;
}
```

- [ ] **Step 3: Create the paginated response entity**

`apps/api/src/modules/personal-entries/entities/paginated-personal-entries-response.entity.ts`:

```typescript
import { ObjectType, Field, Int } from "@nestjs/graphql";
import { PersonalEntry } from "./personal-entry.entity";

@ObjectType()
export class PaginatedPersonalEntriesResponse {
  @Field(() => [PersonalEntry])
  items: PersonalEntry[];

  @Field(() => Int)
  total: number;

  @Field(() => Int)
  page: number;

  @Field(() => Int)
  limit: number;
}
```

- [ ] **Step 4: Create the create input**

`apps/api/src/modules/personal-entries/dto/create-personal-entry.input.ts`:

```typescript
import { InputType, Field, Float } from "@nestjs/graphql";
import { PersonalEntryType } from "../../../generated/prisma/enums";
import { IsEnum, IsNumber, IsOptional, IsString, Min } from "class-validator";

@InputType()
export class CreatePersonalEntryInput {
  @Field(() => PersonalEntryType)
  @IsEnum(PersonalEntryType)
  type: PersonalEntryType;

  @Field(() => Float)
  @IsNumber()
  @Min(0)
  amount: number;

  @Field({ defaultValue: "NGN" })
  @IsString()
  currency: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  category?: string;

  @Field()
  date: Date;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  description?: string;
}
```

- [ ] **Step 5: Create the update input**

`apps/api/src/modules/personal-entries/dto/update-personal-entry.input.ts`:

```typescript
import { InputType, Field, Float, ID } from "@nestjs/graphql";
import { PersonalEntryType } from "../../../generated/prisma/enums";
import {
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
} from "class-validator";

@InputType()
export class UpdatePersonalEntryInput {
  @Field(() => ID)
  @IsUUID()
  id: string;

  @Field(() => PersonalEntryType, { nullable: true })
  @IsOptional()
  @IsEnum(PersonalEntryType)
  type?: PersonalEntryType;

  @Field(() => Float, { nullable: true })
  @IsOptional()
  @IsNumber()
  @Min(0)
  amount?: number;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  currency?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  category?: string;

  @Field({ nullable: true })
  @IsOptional()
  date?: Date;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  description?: string;
}
```

- [ ] **Step 6: Create the filter input**

`apps/api/src/modules/personal-entries/dto/filter-personal-entry.input.ts`:

```typescript
import { InputType, Field, Int } from "@nestjs/graphql";
import { PersonalEntryType } from "../../../generated/prisma/enums";

@InputType()
export class FilterPersonalEntryInput {
  @Field(() => PersonalEntryType, { nullable: true })
  type?: PersonalEntryType;

  @Field({ nullable: true })
  search?: string;

  @Field({ nullable: true })
  currency?: string;

  @Field({ nullable: true })
  startDate?: Date;

  @Field({ nullable: true })
  endDate?: Date;

  @Field(() => Int, { nullable: true, defaultValue: 1 })
  page?: number;

  @Field(() => Int, { nullable: true, defaultValue: 25 })
  limit?: number;
}
```

- [ ] **Step 7: Commit**

```bash
git add apps/api/src/modules/personal-entries/entities apps/api/src/modules/personal-entries/dto
git commit -m "feat(api): add PersonalEntry GraphQL entities and DTOs"
```

---

### Task 3: PersonalEntriesService (TDD)

**Files:**

- Test: `apps/api/src/modules/personal-entries/personal-entries.service.spec.ts`
- Create: `apps/api/src/modules/personal-entries/personal-entries.service.ts`

- [ ] **Step 1: Write the failing test**

`apps/api/src/modules/personal-entries/personal-entries.service.spec.ts`:

```typescript
import { Test } from "@nestjs/testing";
import { NotFoundException } from "@nestjs/common";
import { PersonalEntriesService } from "./personal-entries.service";
import { PrismaService } from "../../prisma/prisma.service";
import { PersonalEntryType } from "../../generated/prisma/enums";

describe("PersonalEntriesService", () => {
  let service: PersonalEntriesService;
  let prisma: {
    personalEntry: {
      create: jest.Mock;
      findMany: jest.Mock;
      count: jest.Mock;
      findUnique: jest.Mock;
      update: jest.Mock;
      delete: jest.Mock;
      groupBy: jest.Mock;
    };
  };

  beforeEach(async () => {
    prisma = {
      personalEntry: {
        create: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        groupBy: jest.fn(),
      },
    };
    const module = await Test.createTestingModule({
      providers: [
        PersonalEntriesService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();
    service = module.get(PersonalEntriesService);
  });

  it("create attaches createdById", async () => {
    prisma.personalEntry.create.mockResolvedValue({ id: "e1" });
    await service.create("user-1", {
      type: PersonalEntryType.INCOME,
      amount: 500,
      currency: "NGN",
      date: new Date("2026-05-01"),
    });
    expect(prisma.personalEntry.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ createdById: "user-1", amount: 500 }),
    });
  });

  it("findAll returns paginated results scoped to the user", async () => {
    prisma.personalEntry.findMany.mockResolvedValue([{ id: "e1" }]);
    prisma.personalEntry.count.mockResolvedValue(1);
    const result = await service.findAll("user-1", { page: 1, limit: 10 });
    expect(prisma.personalEntry.count).toHaveBeenCalledWith({
      where: { createdById: "user-1" },
    });
    expect(result.total).toBe(1);
    expect(result.items).toHaveLength(1);
  });

  it("findOne throws when the entry belongs to another user", async () => {
    prisma.personalEntry.findUnique.mockResolvedValue({
      id: "e1",
      createdById: "someone-else",
    });
    await expect(service.findOne("e1", "user-1")).rejects.toThrow(
      NotFoundException,
    );
  });

  it("getSummary computes netCashPosition = income - expenses", async () => {
    prisma.personalEntry.groupBy.mockResolvedValue([
      {
        type: PersonalEntryType.INCOME,
        _sum: { amount: { toNumber: () => 1000 } },
      },
      {
        type: PersonalEntryType.EXPENSE,
        _sum: { amount: { toNumber: () => 300 } },
      },
    ]);
    const summary = await service.getSummary("user-1");
    expect(summary.totalIncome).toBe(1000);
    expect(summary.totalExpenses).toBe(300);
    expect(summary.netCashPosition).toBe(700);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm --filter api test personal-entries.service`
Expected: FAIL — `Cannot find module './personal-entries.service'`.

- [ ] **Step 3: Write the service**

`apps/api/src/modules/personal-entries/personal-entries.service.ts`:

```typescript
import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { Prisma, PersonalEntryType } from "../../generated/prisma/client";
import { CreatePersonalEntryInput } from "./dto/create-personal-entry.input";
import { UpdatePersonalEntryInput } from "./dto/update-personal-entry.input";
import { FilterPersonalEntryInput } from "./dto/filter-personal-entry.input";
import { PaginatedPersonalEntriesResponse } from "./entities/paginated-personal-entries-response.entity";
import { PersonalEntrySummary } from "./entities/personal-entry-summary.entity";

@Injectable()
export class PersonalEntriesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, input: CreatePersonalEntryInput) {
    return this.prisma.personalEntry.create({
      data: { ...input, createdById: userId },
    });
  }

  private buildWhere(
    userId: string,
    filter?: FilterPersonalEntryInput,
  ): Prisma.PersonalEntryWhereInput {
    return {
      createdById: userId,
      ...(filter?.type && { type: filter.type }),
      ...(filter?.currency && { currency: filter.currency }),
      ...(filter?.search && {
        OR: [
          { description: { contains: filter.search, mode: "insensitive" } },
          { category: { contains: filter.search, mode: "insensitive" } },
        ],
      }),
      ...((filter?.startDate || filter?.endDate) && {
        date: {
          ...(filter?.startDate && { gte: filter.startDate }),
          ...(filter?.endDate && { lte: filter.endDate }),
        },
      }),
    };
  }

  async findAll(
    userId: string,
    filter?: FilterPersonalEntryInput,
  ): Promise<PaginatedPersonalEntriesResponse> {
    const page = filter?.page ?? 1;
    const limit = filter?.limit ?? 25;
    const where = this.buildWhere(userId, filter);

    const [total, items] = await Promise.all([
      this.prisma.personalEntry.count({ where }),
      this.prisma.personalEntry.findMany({
        where,
        orderBy: { date: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    return {
      items: items as unknown as PaginatedPersonalEntriesResponse["items"],
      total,
      page,
      limit,
    };
  }

  async findOne(id: string, userId: string) {
    const entry = await this.prisma.personalEntry.findUnique({ where: { id } });
    if (!entry || entry.createdById !== userId) {
      throw new NotFoundException(`Personal entry with ID ${id} not found`);
    }
    return entry;
  }

  async update(userId: string, input: UpdatePersonalEntryInput) {
    await this.findOne(input.id, userId);
    return this.prisma.personalEntry.update({
      where: { id: input.id },
      data: {
        type: input.type,
        amount: input.amount,
        currency: input.currency,
        category: input.category,
        date: input.date,
        description: input.description,
      },
    });
  }

  async remove(userId: string, id: string) {
    await this.findOne(id, userId);
    await this.prisma.personalEntry.delete({ where: { id } });
    return true;
  }

  async getSummary(
    userId: string,
    filter?: FilterPersonalEntryInput,
  ): Promise<PersonalEntrySummary> {
    const where = this.buildWhere(userId, filter);
    const results = await this.prisma.personalEntry.groupBy({
      by: ["type"],
      where,
      _sum: { amount: true },
    });

    const totalIncome =
      results
        .find((r) => r.type === PersonalEntryType.INCOME)
        ?._sum.amount?.toNumber() ?? 0;
    const totalExpenses =
      results
        .find((r) => r.type === PersonalEntryType.EXPENSE)
        ?._sum.amount?.toNumber() ?? 0;

    return {
      totalIncome,
      totalExpenses,
      netCashPosition: totalIncome - totalExpenses,
      currency: filter?.currency ?? "NGN",
    };
  }
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `pnpm --filter api test personal-entries.service`
Expected: PASS — all 4 tests green.

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/modules/personal-entries/personal-entries.service.ts apps/api/src/modules/personal-entries/personal-entries.service.spec.ts
git commit -m "feat(api): add PersonalEntriesService with CRUD and summary"
```

---

### Task 4: Resolver + module + registration

**Files:**

- Create: `apps/api/src/modules/personal-entries/personal-entries.resolver.ts`
- Create: `apps/api/src/modules/personal-entries/personal-entries.module.ts`
- Modify: `apps/api/src/app.module.ts`

- [ ] **Step 1: Create the resolver**

`apps/api/src/modules/personal-entries/personal-entries.resolver.ts`:

```typescript
import { Resolver, Query, Mutation, Args, ID } from "@nestjs/graphql";
import { UseGuards } from "@nestjs/common";
import { GqlAuthGuard } from "../../common/guards/gql-auth.guard";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { User } from "../users/entities/user.entity";
import { PersonalEntriesService } from "./personal-entries.service";
import { PersonalEntry } from "./entities/personal-entry.entity";
import { PersonalEntrySummary } from "./entities/personal-entry-summary.entity";
import { PaginatedPersonalEntriesResponse } from "./entities/paginated-personal-entries-response.entity";
import { CreatePersonalEntryInput } from "./dto/create-personal-entry.input";
import { UpdatePersonalEntryInput } from "./dto/update-personal-entry.input";
import { FilterPersonalEntryInput } from "./dto/filter-personal-entry.input";

@Resolver(() => PersonalEntry)
@UseGuards(GqlAuthGuard)
export class PersonalEntriesResolver {
  constructor(private readonly service: PersonalEntriesService) {}

  @Query(() => PaginatedPersonalEntriesResponse, { name: "personalEntries" })
  async personalEntries(
    @CurrentUser() user: User,
    @Args("filter", { nullable: true }) filter?: FilterPersonalEntryInput,
  ) {
    return this.service.findAll(user.id, filter);
  }

  @Query(() => PersonalEntrySummary, { name: "personalEntrySummary" })
  async personalEntrySummary(
    @CurrentUser() user: User,
    @Args("filter", { nullable: true }) filter?: FilterPersonalEntryInput,
  ) {
    return this.service.getSummary(user.id, filter);
  }

  @Mutation(() => PersonalEntry)
  async createPersonalEntry(
    @CurrentUser() user: User,
    @Args("input") input: CreatePersonalEntryInput,
  ) {
    return this.service.create(user.id, input);
  }

  @Mutation(() => PersonalEntry)
  async updatePersonalEntry(
    @CurrentUser() user: User,
    @Args("input") input: UpdatePersonalEntryInput,
  ) {
    return this.service.update(user.id, input);
  }

  @Mutation(() => Boolean)
  async deletePersonalEntry(
    @CurrentUser() user: User,
    @Args("id", { type: () => ID }) id: string,
  ) {
    return this.service.remove(user.id, id);
  }
}
```

- [ ] **Step 2: Create the module**

`apps/api/src/modules/personal-entries/personal-entries.module.ts`:

```typescript
import { Module } from "@nestjs/common";
import { PersonalEntriesService } from "./personal-entries.service";
import { PersonalEntriesResolver } from "./personal-entries.resolver";
import { PrismaService } from "../../prisma/prisma.service";

@Module({
  providers: [PersonalEntriesResolver, PersonalEntriesService, PrismaService],
})
export class PersonalEntriesModule {}
```

- [ ] **Step 3: Register in app.module.ts**

Add the import near the other module imports (after the `ProjectsModule` import on line 23):

```typescript
import { PersonalEntriesModule } from "./modules/personal-entries/personal-entries.module";
```

Add `PersonalEntriesModule,` to the `imports` array (after `ProjectsModule,` in the module list around line 203).

- [ ] **Step 4: Boot the API to regenerate schema.gql**

Run: `pnpm --filter api dev` (let it start, confirm "Nest application successfully started", then stop it).
Expected: no startup errors; `apps/api/src/schema.gql` now contains `type PersonalEntry`, `type PersonalEntrySummary`, `personalEntries`, `personalEntrySummary`, `createPersonalEntry`, `updatePersonalEntry`, `deletePersonalEntry`.

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/modules/personal-entries apps/api/src/app.module.ts apps/api/src/schema.gql
git commit -m "feat(api): wire PersonalEntriesModule resolver and register module"
```

---

## Phase 2 — Decouple project feed + drop EXPENSE/INCOME

### Task 5: Remove project transactions from the unified feed

**Files:**

- Modify: `apps/api/src/modules/transactions/transactions.service.ts:933-1011`
- Modify: `apps/api/src/modules/transactions/transactions.service.ts` imports (line 12-20)

- [ ] **Step 1: Delete the project-transaction fetch and mapping**

In `findAll`, remove the entire block that fetches `projects`, builds `projectWhere`, queries `projectTransactions`, and builds `mappedProjectTransactions` (currently lines ~933-1004). Then change the `combinedItems` construction (lines ~1007-1011) from:

```typescript
const combinedItems = [...transformedItems, ...mappedProjectTransactions].sort(
  (a, b) => b.date.getTime() - a.date.getTime(),
);
```

to:

```typescript
const combinedItems = transformedItems;
```

- [ ] **Step 2: Drop the now-unused ProjectTransactionType import**

In the import block (lines ~12-20), remove the `ProjectTransactionType,` line. Leave `AssetCategory`, `TransactionType`, `TransactionStatus` etc. — they are still used elsewhere in the file (verified: `AssetCategory` at many lines, `ProjectTransactionType` only at the removed mapping).

- [ ] **Step 3: Typecheck the API**

Run: `pnpm --filter api build`
Expected: compiles with no errors (no remaining reference to `ProjectTransactionType` or `mappedProjectTransactions`).

- [ ] **Step 4: Run transactions tests**

Run: `pnpm --filter api test transactions`
Expected: PASS. If any existing test asserted project transactions appear in the `transactions` feed, update it to assert they no longer do (project transactions are now only returned by project queries).

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/modules/transactions/transactions.service.ts
git commit -m "refactor(api): remove project transactions from unified feed (fixes pagination, unblocks enum drop)"
```

---

### Task 6: Drop EXPENSE/INCOME from TransactionType + data migration

**Files:**

- Modify: `apps/api/prisma/schema.prisma:319-334`
- Modify: `apps/api/src/modules/transactions/dto/create-transaction.input.ts:44-47`
- Create: `apps/api/atlas/migrations/<timestamp>.sql` (manual)

- [ ] **Step 1: Remove EXPENSE/INCOME from the TransactionType enum in schema.prisma**

Edit the `TransactionType` enum (lines 319-334) to delete the first two lines so it begins:

```prisma
enum TransactionType {
  LOAN_GIVEN
  LOAN_RECEIVED
  REPAYMENT_MADE
  REPAYMENT_RECEIVED
  GIFT_GIVEN
  GIFT_RECEIVED
  ADVANCE_PAID
  ADVANCE_RECEIVED
  DEPOSIT_PAID
  DEPOSIT_RECEIVED
  ESCROWED
  REMITTED
}
```

- [ ] **Step 2: Regenerate the Prisma client**

Run: `pnpm --filter api db:generate`
Expected: completes; `TransactionType` in `apps/api/src/generated/prisma/enums.ts` no longer has `EXPENSE`/`INCOME`.

- [ ] **Step 3: Confirm Atlas refuses to auto-diff (expected)**

Run (from repo root): `pnpm --filter api db:migrate`
Expected: ERROR — "reordering enum value is not supported" (PostgreSQL cannot `DROP VALUE`). This is expected; write the migration manually in the next step. If Atlas wrote a partial/empty migration file, delete it before continuing.

- [ ] **Step 4: Write the manual migration SQL**

Create `apps/api/atlas/migrations/<timestamp>.sql` where `<timestamp>` is a 14-digit value greater than the latest existing migration (e.g. `20260530120000.sql`). Use **camelCase** column names (Prisma default):

```sql
-- Move legacy personal income/expense rows into personal_entries.
-- EXPENSE/INCOME are always FUNDS-category records with an amount; COALESCE is
-- defensive so the migration never fails on an unexpected NULL.
INSERT INTO "personal_entries"
  ("id", "type", "amount", "currency", "date", "description", "createdAt", "createdById")
SELECT
  "id",
  "type"::text::"PersonalEntryType",
  COALESCE("amount", 0),
  "currency",
  "date",
  "description",
  "createdAt",
  "createdById"
FROM "transactions"
WHERE "type" IN ('EXPENSE', 'INCOME');

-- Remove the migrated rows (their transaction_history cascades via FK ON DELETE CASCADE).
DELETE FROM "transactions" WHERE "type" IN ('EXPENSE', 'INCOME');

-- Recreate TransactionType without EXPENSE/INCOME.
-- PostgreSQL does not support ALTER TYPE ... DROP VALUE, so we recreate the type.
CREATE TYPE "TransactionType_new" AS ENUM (
  'LOAN_GIVEN',
  'LOAN_RECEIVED',
  'REPAYMENT_MADE',
  'REPAYMENT_RECEIVED',
  'GIFT_GIVEN',
  'GIFT_RECEIVED',
  'ADVANCE_PAID',
  'ADVANCE_RECEIVED',
  'DEPOSIT_PAID',
  'DEPOSIT_RECEIVED',
  'ESCROWED',
  'REMITTED'
);

ALTER TABLE "transactions"
  ALTER COLUMN "type" TYPE "TransactionType_new"
  USING "type"::text::"TransactionType_new";

DROP TYPE "public"."TransactionType";
ALTER TYPE "TransactionType_new" RENAME TO "TransactionType";
```

- [ ] **Step 5: Rehash the migration directory**

Run (from `apps/api/`): `atlas migrate hash --dir file://atlas/migrations`
Expected: `atlas.sum` updates with no error.

- [ ] **Step 6: Lint the migration**

Run (from `apps/api/`): `pnpm --filter api db:lint`
Expected: passes. (The enum recreation is the documented pattern; the `DELETE` is intentional data movement, not destructive schema change.)

- [ ] **Step 7: Apply and verify zero errors**

Run: `pnpm --filter api db:apply`
Expected: applies cleanly. Verify:

- `psql "$DATABASE_URL" -c "SELECT count(*) FROM transactions WHERE type::text IN ('EXPENSE','INCOME');"` → `0`
- `psql "$DATABASE_URL" -c "SELECT enum_range(NULL::\"TransactionType\");"` → list **without** `EXPENSE`/`INCOME`
- `psql "$DATABASE_URL" -c "SELECT count(*) FROM personal_entries;"` → equals the count of legacy EXPENSE/INCOME rows that existed before.

- [ ] **Step 8: Clean up the @IsNotIn guard**

In `apps/api/src/modules/transactions/dto/create-transaction.input.ts`, change the guard (lines 44-47) to drop the now-nonexistent `EXPENSE`/`INCOME` values (they can no longer be submitted — the enum rejects them — but keep the legacy aliases guard for clarity):

```typescript
  @Field(() => TransactionType)
  @IsEnum(TransactionType)
  @IsNotIn(['GIVEN', 'RECEIVED', 'RETURNED', 'GIFT'], {
    message:
      'This transaction type is no longer supported. Use the new formal types.',
  })
  type: TransactionType;
```

- [ ] **Step 9: Boot the API to regenerate schema.gql and typecheck**

Run: `pnpm --filter api dev` (confirm clean startup, then stop). Then `pnpm --filter api build`.
Expected: clean startup; `apps/api/src/schema.gql` `TransactionType` enum no longer lists `EXPENSE`/`INCOME`; build passes.

- [ ] **Step 10: Commit**

```bash
git add apps/api/prisma/schema.prisma apps/api/src/generated apps/api/atlas/migrations apps/api/src/modules/transactions/dto/create-transaction.input.ts apps/api/src/schema.gql
git commit -m "feat(api): migrate EXPENSE/INCOME to personal_entries and drop them from TransactionType"
```

---

## Phase 3 — Frontend

### Task 7: GraphQL operations + codegen

**Files:**

- Create: `apps/web/src/lib/apollo/queries/personal-entries.ts`

- [ ] **Step 1: Create the operations file**

`apps/web/src/lib/apollo/queries/personal-entries.ts`:

```typescript
import { gql } from "@apollo/client";

export const PERSONAL_ENTRY_FRAGMENT = gql`
  fragment PersonalEntryFields on PersonalEntry {
    id
    type
    amount
    currency
    category
    date
    description
    createdAt
    createdById
  }
`;

export const GET_PERSONAL_ENTRIES = gql`
  ${PERSONAL_ENTRY_FRAGMENT}
  query GetPersonalEntries($filter: FilterPersonalEntryInput) {
    personalEntries(filter: $filter) {
      items {
        ...PersonalEntryFields
      }
      total
      page
      limit
    }
  }
`;

export const GET_PERSONAL_ENTRY_SUMMARY = gql`
  query GetPersonalEntrySummary($filter: FilterPersonalEntryInput) {
    personalEntrySummary(filter: $filter) {
      totalIncome
      totalExpenses
      netCashPosition
      currency
    }
  }
`;

export const CREATE_PERSONAL_ENTRY = gql`
  ${PERSONAL_ENTRY_FRAGMENT}
  mutation CreatePersonalEntry($input: CreatePersonalEntryInput!) {
    createPersonalEntry(input: $input) {
      ...PersonalEntryFields
    }
  }
`;

export const UPDATE_PERSONAL_ENTRY = gql`
  ${PERSONAL_ENTRY_FRAGMENT}
  mutation UpdatePersonalEntry($input: UpdatePersonalEntryInput!) {
    updatePersonalEntry(input: $input) {
      ...PersonalEntryFields
    }
  }
`;

export const DELETE_PERSONAL_ENTRY = gql`
  mutation DeletePersonalEntry($id: ID!) {
    deletePersonalEntry(id: $id)
  }
`;
```

- [ ] **Step 2: Run codegen**

Run: `pnpm --filter web codegen` (codegen reads `../api/src/schema.gql`, regenerated in Task 6 Step 9).
Expected: `apps/web/src/types/__generated__/graphql.ts` now exports `PersonalEntryType`, `CreatePersonalEntryInput`, `GetPersonalEntriesQuery`, `GetPersonalEntrySummaryQuery`, etc., and `TransactionType` no longer has `Income`/`Expense`.

- [ ] **Step 3: Typecheck web (catch any code referencing the removed TransactionType members)**

Run: `pnpm --filter web build`
Expected: PASS. If `TransactionTypeHelp.tsx` (lines ~154, 160) renders the now-removed `EXPENSE`/`INCOME` help rows, delete those two rows — they reference legacy types and are now dead. (These are plain display strings; they do not break the build but should be removed for correctness.)

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/lib/apollo/queries/personal-entries.ts apps/web/src/types/__generated__/graphql.ts
git commit -m "feat(web): add personal-entries GraphQL operations and regenerate types"
```

---

### Task 8: usePersonalEntries hook

**Files:**

- Create: `apps/web/src/hooks/usePersonalEntries.ts`

- [ ] **Step 1: Create the hook (mirrors useProjects pattern)**

`apps/web/src/hooks/usePersonalEntries.ts`:

```typescript
import { useMutation, useQuery } from "@apollo/client/react";
import {
  CREATE_PERSONAL_ENTRY,
  DELETE_PERSONAL_ENTRY,
  GET_PERSONAL_ENTRIES,
  GET_PERSONAL_ENTRY_SUMMARY,
  UPDATE_PERSONAL_ENTRY,
} from "@/lib/apollo/queries/personal-entries";
import type {
  CreatePersonalEntryInput,
  CreatePersonalEntryMutation,
  FilterPersonalEntryInput,
  GetPersonalEntriesQuery,
  GetPersonalEntrySummaryQuery,
  UpdatePersonalEntryInput,
  UpdatePersonalEntryMutation,
} from "@/types/__generated__/graphql";

const REFETCH = [GET_PERSONAL_ENTRIES, GET_PERSONAL_ENTRY_SUMMARY];

export function usePersonalEntries(filter?: FilterPersonalEntryInput) {
  const { data, loading, error, refetch } = useQuery<GetPersonalEntriesQuery>(
    GET_PERSONAL_ENTRIES,
    { variables: { filter }, fetchPolicy: "cache-and-network" },
  );

  const [createMutation, { loading: creating }] =
    useMutation<CreatePersonalEntryMutation>(CREATE_PERSONAL_ENTRY, {
      refetchQueries: REFETCH,
    });

  const [updateMutation, { loading: updating }] =
    useMutation<UpdatePersonalEntryMutation>(UPDATE_PERSONAL_ENTRY, {
      refetchQueries: REFETCH,
    });

  const [deleteMutation, { loading: deleting }] = useMutation(
    DELETE_PERSONAL_ENTRY,
    { refetchQueries: REFETCH },
  );

  const createEntry = (input: CreatePersonalEntryInput) =>
    createMutation({ variables: { input } });
  const updateEntry = (input: UpdatePersonalEntryInput) =>
    updateMutation({ variables: { input } });
  const deleteEntry = (id: string) => deleteMutation({ variables: { id } });

  return {
    entries: data?.personalEntries.items ?? [],
    total: data?.personalEntries.total ?? 0,
    loading,
    error,
    refetch,
    createEntry,
    updateEntry,
    deleteEntry,
    mutating: creating || updating || deleting,
  };
}

export function usePersonalEntrySummary(filter?: FilterPersonalEntryInput) {
  const { data, loading, error, refetch } =
    useQuery<GetPersonalEntrySummaryQuery>(GET_PERSONAL_ENTRY_SUMMARY, {
      variables: { filter },
      fetchPolicy: "cache-and-network",
    });
  return { summary: data?.personalEntrySummary, loading, error, refetch };
}
```

- [ ] **Step 2: Typecheck**

Run: `pnpm --filter web build`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/hooks/usePersonalEntries.ts
git commit -m "feat(web): add usePersonalEntries and usePersonalEntrySummary hooks"
```

---

### Task 9: PersonalEntryForm component

**Files:**

- Create: `apps/web/src/components/personal-entries/PersonalEntryForm.tsx`

- [ ] **Step 1: Build the form (uses useAmountInput per CLAUDE.md monetary rule)**

`apps/web/src/components/personal-entries/PersonalEntryForm.tsx`:

```tsx
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useAmountInput } from "@/hooks/useAmountInput";
import { usePersonalEntries } from "@/hooks/usePersonalEntries";
import { PersonalEntryType } from "@/types/__generated__/graphql";

interface PersonalEntryFormProps {
  defaultCurrency?: string;
  onSuccess?: () => void;
}

export function PersonalEntryForm({
  defaultCurrency = "NGN",
  onSuccess,
}: PersonalEntryFormProps) {
  const { createEntry, mutating } = usePersonalEntries();
  const [type, setType] = useState<PersonalEntryType>(
    PersonalEntryType.Expense,
  );
  const {
    value: amount,
    displayValue,
    onChange: onAmountChange,
  } = useAmountInput();
  const [category, setCategory] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [description, setDescription] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || amount <= 0) return;
    await createEntry({
      type,
      amount,
      currency: defaultCurrency,
      category: category || undefined,
      date: new Date(date),
      description: description || undefined,
    });
    onAmountChange("");
    setCategory("");
    setDescription("");
    onSuccess?.();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label>Type</Label>
        <Select
          value={type}
          onValueChange={(v) => setType(v as PersonalEntryType)}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={PersonalEntryType.Income}>Income</SelectItem>
            <SelectItem value={PersonalEntryType.Expense}>Expense</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>Amount ({defaultCurrency})</Label>
        <Input
          inputMode="decimal"
          value={displayValue}
          onChange={(e) => onAmountChange(e.target.value)}
          placeholder="0.00"
        />
      </div>

      <div className="space-y-2">
        <Label>Category (optional)</Label>
        <Input
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          placeholder="e.g. food, salary, rent"
        />
      </div>

      <div className="space-y-2">
        <Label>Date</Label>
        <Input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
        />
      </div>

      <div className="space-y-2">
        <Label>Description (optional)</Label>
        <Textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Add a note"
        />
      </div>

      <Button type="submit" disabled={mutating || !amount} className="w-full">
        {mutating ? "Saving..." : "Add Entry"}
      </Button>
    </form>
  );
}
```

> Note: verify `useAmountInput`'s exact return shape (`value`/`displayValue`/`onChange`) by opening `apps/web/src/hooks/useAmountInput.ts` and an existing caller (e.g. `ProjectTransactionForm.tsx`) before wiring; adjust prop names to match.

- [ ] **Step 2: Typecheck**

Run: `pnpm --filter web build`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/components/personal-entries/PersonalEntryForm.tsx
git commit -m "feat(web): add PersonalEntryForm component"
```

---

### Task 10: Personal tab on the transactions page

**Files:**

- Create: `apps/web/src/components/personal-entries/PersonalEntriesTab.tsx`
- Modify: `apps/web/src/routes/transactions/index.tsx:157-169` (TabsList) and add a `TabsContent`

- [ ] **Step 1: Build the tab content (summary header + list + inline form)**

`apps/web/src/components/personal-entries/PersonalEntriesTab.tsx`:

```tsx
import { format } from "date-fns";
import { useState } from "react";
import { PersonalEntryForm } from "@/components/personal-entries/PersonalEntryForm";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils/currency";
import {
  usePersonalEntries,
  usePersonalEntrySummary,
} from "@/hooks/usePersonalEntries";
import { PersonalEntryType } from "@/types/__generated__/graphql";

export function PersonalEntriesTab({
  currency = "NGN",
}: {
  currency?: string;
}) {
  const [showForm, setShowForm] = useState(false);
  const { entries, loading, deleteEntry } = usePersonalEntries();
  const { summary } = usePersonalEntrySummary();

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">
              Income
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xl font-bold text-emerald-600">
            {formatCurrency(summary?.totalIncome ?? 0, currency)}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">
              Expenses
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xl font-bold text-rose-600">
            {formatCurrency(summary?.totalExpenses ?? 0, currency)}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">
              Cash Position
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xl font-bold">
            {formatCurrency(summary?.netCashPosition ?? 0, currency)}
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-end">
        <Button onClick={() => setShowForm((s) => !s)}>
          {showForm ? "Close" : "Add Entry"}
        </Button>
      </div>

      {showForm && (
        <Card>
          <CardContent className="pt-6">
            <PersonalEntryForm
              defaultCurrency={currency}
              onSuccess={() => setShowForm(false)}
            />
          </CardContent>
        </Card>
      )}

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading...</p>
      ) : entries.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No personal entries yet. Track your income and expenses here.
        </p>
      ) : (
        <div className="space-y-2">
          {entries.map((entry) => (
            <div
              key={entry.id}
              className="flex items-center justify-between rounded-md border p-3"
            >
              <div>
                <p className="font-medium">
                  {entry.description || entry.category || "Entry"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {format(new Date(entry.date), "PP")}
                  {entry.category ? ` · ${entry.category}` : ""}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span
                  className={
                    entry.type === PersonalEntryType.Income
                      ? "font-semibold text-emerald-600"
                      : "font-semibold text-rose-600"
                  }
                >
                  {entry.type === PersonalEntryType.Income ? "+" : "-"}
                  {formatCurrency(entry.amount, entry.currency)}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => deleteEntry(entry.id)}
                >
                  Delete
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

> Note: confirm the `formatCurrency` import path/signature against an existing caller (e.g. `Dashboard.tsx` imports it) before finalizing.

- [ ] **Step 2: Add the "Personal" tab to transactions/index.tsx**

In `apps/web/src/routes/transactions/index.tsx`, import the tab at the top:

```tsx
import { PersonalEntriesTab } from "@/components/personal-entries/PersonalEntriesTab";
```

Change the `TabsList` grid from `grid-cols-3` to `grid-cols-4` (line ~157) and add a fourth trigger after the `analytics` trigger (after line ~168):

```tsx
<TabsTrigger value="personal" className="flex items-center gap-2 py-2">
  Personal
</TabsTrigger>
```

Add a `TabsContent` after the `analytics` content (after line ~565):

```tsx
<TabsContent value="personal">
  <PersonalEntriesTab />
</TabsContent>
```

- [ ] **Step 3: Typecheck**

Run: `pnpm --filter web build`
Expected: PASS.

- [ ] **Step 4: Verify in the browser**

Start the dev server (`preview_start` / `pnpm dev`), log in, navigate to `/transactions`, click the **Personal** tab. Confirm:

- The three summary cards render (Income / Expenses / Cash Position).
- "Add Entry" opens the form; submitting an INCOME and an EXPENSE adds them to the list and updates the summary.
- The 4-tab row is usable on a mobile viewport (`preview_resize` to ~375px). If cramped, note it for review (dedicated `/entries` route is the fallback).

Capture a screenshot for the user.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/components/personal-entries/PersonalEntriesTab.tsx apps/web/src/routes/transactions/index.tsx
git commit -m "feat(web): add Personal entries tab to transactions page"
```

---

### Task 11: Dashboard cash-position card + label fix

**Files:**

- Modify: `apps/web/src/components/dashboard/Dashboard.tsx`

- [ ] **Step 1: Source the summary**

Near the other hooks (around line 62), add:

```tsx
const { summary: cashSummary } = usePersonalEntrySummary();
```

and import at the top:

```tsx
import { usePersonalEntrySummary } from "@/hooks/usePersonalEntries";
```

- [ ] **Step 2: Fix the mislabeled card and add a Cash Position figure**

Change the existing "Total Balance" `StatsCard` description (line 196) from:

```tsx
description = "Your current cash position (All Time)";
```

to (this card shows the contact-obligation net balance, not cash):

```tsx
description = "Net amount owed to / by your contacts (All Time)";
```

Then add a Cash Position `StatsCard` in the financial-stats grid (sibling of the existing cards, around line 165-198), sourced from the personal-entry summary:

```tsx
<StatsCard
  title="Cash Position"
  value={
    <BalanceIndicator
      amount={cashSummary?.netCashPosition ?? 0}
      currency={balanceCurrency}
      overrideColor={(cashSummary?.netCashPosition ?? 0) < 0 ? "red" : "green"}
      className="text-base sm:text-xl h-auto px-2 py-0 border-0 bg-transparent"
    />
  }
  icon={<CreditCard className="h-4 w-4 text-muted-foreground" />}
  description="Personal income minus expenses (All Time)"
/>
```

> Note: the financial-stats grid is `grid-cols-2 sm:grid-cols-3` (line 165). Adding a card makes 4 cells; confirm the layout still reads well, adjusting the grid to `sm:grid-cols-4` if needed during browser verification.

- [ ] **Step 3: Typecheck**

Run: `pnpm --filter web build`
Expected: PASS.

- [ ] **Step 4: Verify in the browser**

Reload the dashboard. Confirm:

- The primary card now reads "Net amount owed to / by your contacts" (no longer mislabeled "cash position").
- A "Cash Position" card shows `income − expenses` from the personal entries added in Task 10, with the correct sign/color.

Capture a screenshot for the user.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/components/dashboard/Dashboard.tsx
git commit -m "feat(web): add dashboard cash-position card and fix mislabeled balance card"
```

---

## Self-Review Checklist (run before execution)

- **Spec coverage:**
  - PersonalEntry model + enum → Task 1 ✓
  - Data migration (move rows) → Task 6 ✓
  - Drop EXPENSE/INCOME from TransactionType → Task 6 ✓
  - Backend module (resolver + service) → Tasks 2-4 ✓
  - `personalEntries(filter)` + `personalEntrySummary` queries → Task 4 ✓
  - Summary fields `totalIncome`/`totalExpenses`/`netCashPosition` → Task 2/3 ✓
  - Dashboard cash position replaces placeholder → Task 11 ✓
  - Frontend form + tab → Tasks 9-10 ✓
  - Two-migration Atlas split + manual enum recreation + rehash → Tasks 1 & 6 ✓
- **Newly surfaced (not in original spec) and now covered:** project-transaction feed decoupling (Task 5) — prerequisite for the enum drop.
- **Type consistency:** service methods `create/findAll/findOne/update/remove/getSummary` match resolver calls; `PersonalEntrySummary` fields match entity, query, and frontend usage; GraphQL frontend enum is `PersonalEntryType.Income/Expense` (codegen PascalCase) vs backend `PersonalEntryType.INCOME/EXPENSE`.

---

## Risks & rollback

- **Data migration is destructive to `transactions`** (deletes EXPENSE/INCOME rows after copying). Mitigation: rows are copied first; verification queries in Task 6 Step 7 confirm counts match before proceeding. The migration is a single Atlas file — if Step 7 verification fails, do **not** commit; restore from the dev DB snapshot and fix the SQL.
- **CI applies migrations on merge to `main`** (`.github/workflows/ci-atlas.yaml`). Both migration files + the rehashed `atlas.sum` must be committed together (Tasks 1 & 6) or CI fails on checksum mismatch.
- **PRs target `dev`** per CLAUDE.md — open with `gh pr create --base dev`.
