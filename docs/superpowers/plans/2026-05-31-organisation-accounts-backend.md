# Organisation Accounts — Backend Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the full backend for org accounts — DB schema, auth context switching, org membership, scoped queries on all existing modules, and the Events & Notes feature.

**Architecture:** JWT payload is extended with an optional `activeOrgId`. A new `@ActiveOrg()` decorator reads it; a new `@OrgRoles()` guard enforces membership. All existing service methods receive an `orgId` parameter and scope queries accordingly (`orgId IS NOT NULL` for org context, `orgId IS NULL` for personal).

**Tech Stack:** NestJS, Prisma 7, PostgreSQL, Atlas migrations, Jest (unit tests with mocked PrismaService), GraphQL Code-First

---

## File Map

**New files (create):**

- `apps/api/atlas/migrations/<timestamp>_org_accounts.sql` — DDL for all new tables + columns
- `apps/api/src/modules/organisations/organisations.module.ts`
- `apps/api/src/modules/organisations/organisations.resolver.ts`
- `apps/api/src/modules/organisations/organisations.service.ts`
- `apps/api/src/modules/organisations/organisations.service.spec.ts`
- `apps/api/src/modules/organisations/decorators/active-org.decorator.ts`
- `apps/api/src/modules/organisations/guards/org-roles.guard.ts`
- `apps/api/src/modules/organisations/guards/org-roles.guard.spec.ts`
- `apps/api/src/modules/organisations/dto/create-organisation.input.ts`
- `apps/api/src/modules/organisations/dto/update-organisation.input.ts`
- `apps/api/src/modules/organisations/dto/invite-member.input.ts`
- `apps/api/src/modules/organisations/entities/organisation.entity.ts`
- `apps/api/src/modules/organisations/entities/organisation-member.entity.ts`
- `apps/api/src/modules/org-events/org-events.module.ts`
- `apps/api/src/modules/org-events/org-events.resolver.ts`
- `apps/api/src/modules/org-events/org-events.service.ts`
- `apps/api/src/modules/org-events/org-events.service.spec.ts`
- `apps/api/src/modules/org-events/dto/create-org-event.input.ts`
- `apps/api/src/modules/org-events/dto/update-org-event.input.ts`
- `apps/api/src/modules/org-events/entities/org-event.entity.ts`
- `apps/api/src/modules/org-notes/org-notes.module.ts`
- `apps/api/src/modules/org-notes/org-notes.resolver.ts`
- `apps/api/src/modules/org-notes/org-notes.service.ts`
- `apps/api/src/modules/org-notes/org-notes.service.spec.ts`
- `apps/api/src/modules/org-notes/dto/create-org-note.input.ts`
- `apps/api/src/modules/org-notes/dto/update-org-note.input.ts`
- `apps/api/src/modules/org-notes/entities/org-note.entity.ts`

**Modified files:**

- `apps/api/prisma/schema.prisma` — add 5 new models, 2 enums, orgId to 4 existing models
- `apps/api/atlas/migrations/atlas.sum` — rehashed after manual SQL
- `apps/api/src/modules/auth/strategies/jwt.strategy.ts` — pass `activeOrgId` through validate()
- `apps/api/src/modules/auth/auth.service.ts` — extend `generateTokens`, add `switchOrgContext`
- `apps/api/src/modules/auth/auth.resolver.ts` — add `switchOrgContext` mutation
- `apps/api/src/modules/auth/dto/auth-payload.entity.ts` — expose `activeOrgId` if set
- `apps/api/src/modules/transactions/transactions.service.ts` — add orgId param to findAll/create
- `apps/api/src/modules/transactions/transactions.resolver.ts` — inject `@ActiveOrg()`
- `apps/api/src/modules/contacts/contacts.service.ts` — add orgId scoping + promoteToOrg
- `apps/api/src/modules/contacts/contacts.resolver.ts` — inject `@ActiveOrg()`
- `apps/api/src/modules/projects/projects.service.ts` — add orgId scoping
- `apps/api/src/modules/projects/projects.resolver.ts` — inject `@ActiveOrg()`
- `apps/api/src/modules/promises/promises.service.ts` — add orgId scoping
- `apps/api/src/modules/promises/promises.resolver.ts` — inject `@ActiveOrg()`
- `apps/api/src/modules/notifications/notification.service.ts` — apply AttributionMode
- `apps/api/src/app.module.ts` — import OrganisationsModule, OrgEventsModule, OrgNotesModule

---

## Task 1: Database migration

**Files:**

- Create: `apps/api/atlas/migrations/<timestamp>_org_accounts.sql`
- Modify: `apps/api/atlas/migrations/atlas.sum`
- Modify: `apps/api/prisma/schema.prisma`

- [ ] **Step 1: Write the migration SQL**

Create file `apps/api/atlas/migrations/20260531100000_org_accounts.sql`:

```sql
-- Create OrgRole enum
CREATE TYPE "OrgRole" AS ENUM ('ADMIN', 'OPERATOR', 'VIEWER');

-- Create AttributionMode enum
CREATE TYPE "AttributionMode" AS ENUM ('ORG_ONLY', 'ORG_AND_OPERATOR');

-- Create organisations table
CREATE TABLE "organisations" (
  "id"              TEXT NOT NULL,
  "name"            TEXT NOT NULL,
  "slug"            TEXT NOT NULL,
  "description"     TEXT,
  "logoUrl"         TEXT,
  "industry"        TEXT,
  "attributionMode" "AttributionMode" NOT NULL DEFAULT 'ORG_ONLY',
  "createdAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"       TIMESTAMP(3) NOT NULL,
  CONSTRAINT "organisations_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "organisations_slug_key" ON "organisations"("slug");

-- Create organisation_members table
CREATE TABLE "organisation_members" (
  "id"       TEXT NOT NULL,
  "orgId"    TEXT NOT NULL,
  "userId"   TEXT NOT NULL,
  "role"     "OrgRole" NOT NULL DEFAULT 'OPERATOR',
  "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "organisation_members_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "organisation_members_orgId_userId_key" ON "organisation_members"("orgId", "userId");
ALTER TABLE "organisation_members"
  ADD CONSTRAINT "organisation_members_orgId_fkey"
  FOREIGN KEY ("orgId") REFERENCES "organisations"("id") NOT VALID;
ALTER TABLE "organisation_members"
  VALIDATE CONSTRAINT "organisation_members_orgId_fkey";
ALTER TABLE "organisation_members"
  ADD CONSTRAINT "organisation_members_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "users"("id") NOT VALID;
ALTER TABLE "organisation_members"
  VALIDATE CONSTRAINT "organisation_members_userId_fkey";

-- Create org_subscriptions table
CREATE TABLE "org_subscriptions" (
  "id"                TEXT NOT NULL,
  "orgId"             TEXT NOT NULL,
  "tier"              "SubscriptionTier" NOT NULL DEFAULT 'FREE',
  "status"            TEXT NOT NULL,
  "provider"          TEXT NOT NULL,
  "externalId"        TEXT,
  "currentPeriodEnd"  TIMESTAMP(3),
  "cancelAtPeriodEnd" BOOLEAN NOT NULL DEFAULT false,
  "createdAt"         TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"         TIMESTAMP(3) NOT NULL,
  CONSTRAINT "org_subscriptions_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "org_subscriptions_orgId_key" ON "org_subscriptions"("orgId");
CREATE UNIQUE INDEX "org_subscriptions_externalId_key" ON "org_subscriptions"("externalId");
ALTER TABLE "org_subscriptions"
  ADD CONSTRAINT "org_subscriptions_orgId_fkey"
  FOREIGN KEY ("orgId") REFERENCES "organisations"("id") NOT VALID;
ALTER TABLE "org_subscriptions"
  VALIDATE CONSTRAINT "org_subscriptions_orgId_fkey";

-- Create org_events table
CREATE TABLE "org_events" (
  "id"          TEXT NOT NULL,
  "orgId"       TEXT NOT NULL,
  "title"       TEXT NOT NULL,
  "date"        TIMESTAMP(3) NOT NULL,
  "endDate"     TIMESTAMP(3),
  "category"    TEXT NOT NULL,
  "notes"       TEXT,
  "isRecurring" BOOLEAN NOT NULL DEFAULT false,
  "recurrence"  TEXT,
  "createdById" TEXT NOT NULL,
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"   TIMESTAMP(3) NOT NULL,
  CONSTRAINT "org_events_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "org_events_orgId_date_idx" ON "org_events"("orgId", "date");
ALTER TABLE "org_events"
  ADD CONSTRAINT "org_events_orgId_fkey"
  FOREIGN KEY ("orgId") REFERENCES "organisations"("id") NOT VALID;
ALTER TABLE "org_events"
  VALIDATE CONSTRAINT "org_events_orgId_fkey";
ALTER TABLE "org_events"
  ADD CONSTRAINT "org_events_createdById_fkey"
  FOREIGN KEY ("createdById") REFERENCES "users"("id") NOT VALID;
ALTER TABLE "org_events"
  VALIDATE CONSTRAINT "org_events_createdById_fkey";

-- Create org_notes table
CREATE TABLE "org_notes" (
  "id"          TEXT NOT NULL,
  "orgId"       TEXT NOT NULL,
  "body"        TEXT NOT NULL,
  "category"    TEXT,
  "createdById" TEXT NOT NULL,
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"   TIMESTAMP(3) NOT NULL,
  CONSTRAINT "org_notes_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "org_notes_orgId_createdAt_idx" ON "org_notes"("orgId", "createdAt");
ALTER TABLE "org_notes"
  ADD CONSTRAINT "org_notes_orgId_fkey"
  FOREIGN KEY ("orgId") REFERENCES "organisations"("id") NOT VALID;
ALTER TABLE "org_notes"
  VALIDATE CONSTRAINT "org_notes_orgId_fkey";
ALTER TABLE "org_notes"
  ADD CONSTRAINT "org_notes_createdById_fkey"
  FOREIGN KEY ("createdById") REFERENCES "users"("id") NOT VALID;
ALTER TABLE "org_notes"
  VALIDATE CONSTRAINT "org_notes_createdById_fkey";

-- Add orgId to existing tables
ALTER TABLE "transactions" ADD COLUMN "orgId" TEXT;
ALTER TABLE "transactions"
  ADD CONSTRAINT "transactions_orgId_fkey"
  FOREIGN KEY ("orgId") REFERENCES "organisations"("id") NOT VALID;
ALTER TABLE "transactions"
  VALIDATE CONSTRAINT "transactions_orgId_fkey";

ALTER TABLE "contacts" ADD COLUMN "orgId" TEXT;
ALTER TABLE "contacts"
  ADD CONSTRAINT "contacts_orgId_fkey"
  FOREIGN KEY ("orgId") REFERENCES "organisations"("id") NOT VALID;
ALTER TABLE "contacts"
  VALIDATE CONSTRAINT "contacts_orgId_fkey";

ALTER TABLE "projects" ADD COLUMN "orgId" TEXT;
ALTER TABLE "projects"
  ADD CONSTRAINT "projects_orgId_fkey"
  FOREIGN KEY ("orgId") REFERENCES "organisations"("id") NOT VALID;
ALTER TABLE "projects"
  VALIDATE CONSTRAINT "projects_orgId_fkey";

ALTER TABLE "promises" ADD COLUMN "orgId" TEXT;
ALTER TABLE "promises"
  ADD CONSTRAINT "promises_orgId_fkey"
  FOREIGN KEY ("orgId") REFERENCES "organisations"("id") NOT VALID;
ALTER TABLE "promises"
  VALIDATE CONSTRAINT "promises_orgId_fkey";
```

- [ ] **Step 2: Rehash atlas.sum**

```bash
cd apps/api && atlas migrate hash --dir file://atlas/migrations
```

Expected: `atlas.sum` is updated with no error output.

- [ ] **Step 3: Apply the migration locally**

```bash
pnpm --filter api db:apply
```

Expected output ends with: `Migrating to version 20260531100000 (1 migration in total)` and `-- ok`.

- [ ] **Step 4: Update prisma/schema.prisma — new models**

Add to the end of `apps/api/prisma/schema.prisma` (before the last closing brace), after all existing models:

```prisma
model Organisation {
  id              String               @id @default(uuid())
  name            String
  slug            String               @unique
  description     String?
  logoUrl         String?
  industry        String?
  attributionMode AttributionMode      @default(ORG_ONLY)
  createdAt       DateTime             @default(now())
  updatedAt       DateTime             @updatedAt
  members         OrganisationMember[]
  contacts        Contact[]            @relation("OrgContacts")
  transactions    Transaction[]        @relation("OrgTransactions")
  projects        Project[]            @relation("OrgProjects")
  promises        Promise[]            @relation("OrgPromises")
  events          OrgEvent[]
  notes           OrgNote[]
  subscription    OrgSubscription?

  @@map("organisations")
}

model OrganisationMember {
  id           String       @id @default(uuid())
  orgId        String
  userId       String
  role         OrgRole      @default(OPERATOR)
  joinedAt     DateTime     @default(now())
  organisation Organisation @relation(fields: [orgId], references: [id])
  user         User         @relation(fields: [userId], references: [id])

  @@unique([orgId, userId])
  @@map("organisation_members")
}

model OrgSubscription {
  id                 String           @id @default(uuid())
  orgId              String           @unique
  tier               SubscriptionTier @default(FREE)
  status             String
  provider           String
  externalId         String?          @unique
  currentPeriodEnd   DateTime?
  cancelAtPeriodEnd  Boolean          @default(false)
  createdAt          DateTime         @default(now())
  updatedAt          DateTime         @updatedAt
  organisation       Organisation     @relation(fields: [orgId], references: [id])

  @@map("org_subscriptions")
}

model OrgEvent {
  id           String       @id @default(uuid())
  orgId        String
  title        String
  date         DateTime
  endDate      DateTime?
  category     String
  notes        String?
  isRecurring  Boolean      @default(false)
  recurrence   String?
  createdById  String
  createdAt    DateTime     @default(now())
  updatedAt    DateTime     @updatedAt
  organisation Organisation @relation(fields: [orgId], references: [id])
  createdBy    User         @relation(fields: [createdById], references: [id])

  @@index([orgId, date])
  @@map("org_events")
}

model OrgNote {
  id           String       @id @default(uuid())
  orgId        String
  body         String
  category     String?
  createdById  String
  createdAt    DateTime     @default(now())
  updatedAt    DateTime     @updatedAt
  organisation Organisation @relation(fields: [orgId], references: [id])
  createdBy    User         @relation(fields: [createdById], references: [id])

  @@index([orgId, createdAt])
  @@map("org_notes")
}
```

- [ ] **Step 5: Add orgId relations to existing models in schema.prisma**

In the `Contact` model, add:

```prisma
orgId        String?
organisation Organisation? @relation("OrgContacts", fields: [orgId], references: [id])
```

In the `Transaction` model, add:

```prisma
orgId        String?
organisation Organisation? @relation("OrgTransactions", fields: [orgId], references: [id])
```

In the `Project` model, add:

```prisma
orgId        String?
organisation Organisation? @relation("OrgProjects", fields: [orgId], references: [id])
```

In the `Promise` model, add:

```prisma
orgId        String?
organisation Organisation? @relation("OrgPromises", fields: [orgId], references: [id])
```

In the `User` model, add:

```prisma
organisationMembers OrganisationMember[]
orgEventsCreated    OrgEvent[]
orgNotesCreated     OrgNote[]
```

- [ ] **Step 6: Add new enums to schema.prisma**

```prisma
enum OrgRole {
  ADMIN
  OPERATOR
  VIEWER
}

enum AttributionMode {
  ORG_ONLY
  ORG_AND_OPERATOR
}
```

- [ ] **Step 7: Regenerate Prisma client**

```bash
pnpm --filter api db:generate
```

Expected: `Generated Prisma Client` with no errors.

- [ ] **Step 8: Commit**

```bash
git add apps/api/prisma/schema.prisma apps/api/atlas/migrations/
git commit -m "feat: add org accounts DB schema and Atlas migration"
```

---

## Task 2: `@ActiveOrg()` decorator + `@OrgRoles()` guard

**Files:**

- Create: `apps/api/src/modules/organisations/decorators/active-org.decorator.ts`
- Create: `apps/api/src/modules/organisations/guards/org-roles.guard.ts`
- Create: `apps/api/src/modules/organisations/guards/org-roles.guard.spec.ts`
- Modify: `apps/api/src/modules/auth/strategies/jwt.strategy.ts`

- [ ] **Step 1: Update JwtStrategy to pass activeOrgId through**

Replace `apps/api/src/modules/auth/strategies/jwt.strategy.ts`:

```typescript
import { Injectable, UnauthorizedException } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, Strategy } from "passport-jwt";
import { ConfigService } from "@nestjs/config";
import { AuthService } from "../auth.service";
import { Request } from "express";

export interface JwtPayload {
  sub: string;
  email: string;
  activeOrgId?: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    configService: ConfigService,
    private authService: AuthService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        (request: Request) => request?.cookies?.accessToken,
        ExtractJwt.fromAuthHeaderAsBearerToken(),
      ]),
      ignoreExpiration: false,
      secretOrKey: configService.getOrThrow<string>("auth.jwt.secret"),
    });
  }

  async validate(payload: JwtPayload) {
    const user = await this.authService.validateUser(payload.sub);
    if (!user) throw new UnauthorizedException();
    // Attach activeOrgId from JWT payload to the user object on req.user
    return { ...user, activeOrgId: payload.activeOrgId ?? null };
  }
}
```

- [ ] **Step 2: Create `@ActiveOrg()` decorator**

Create `apps/api/src/modules/organisations/decorators/active-org.decorator.ts`:

```typescript
import { createParamDecorator, ExecutionContext } from "@nestjs/common";
import { GqlExecutionContext } from "@nestjs/graphql";

/**
 * Extracts the active org ID from the JWT-decorated request user.
 * Returns null when the user is in personal (non-org) mode.
 */
export const ActiveOrg = createParamDecorator(
  (_data: unknown, context: ExecutionContext): string | null => {
    const ctx = GqlExecutionContext.create(context);
    const user = ctx.getContext().req.user as { activeOrgId?: string | null };
    return user?.activeOrgId ?? null;
  },
);
```

- [ ] **Step 3: Write the failing guard test**

Create `apps/api/src/modules/organisations/guards/org-roles.guard.spec.ts`:

```typescript
import { Test } from "@nestjs/testing";
import { Reflector } from "@nestjs/core";
import { OrgRolesGuard, ORG_ROLES_KEY } from "./org-roles.guard";
import { PrismaService } from "../../../prisma/prisma.service";
import { ExecutionContext } from "@nestjs/common";
import { GqlExecutionContext } from "@nestjs/graphql";

jest.mock("@nestjs/graphql", () => ({
  GqlExecutionContext: {
    create: jest.fn(),
  },
}));

describe("OrgRolesGuard", () => {
  let guard: OrgRolesGuard;
  let reflector: { getAllAndOverride: jest.Mock };
  let prisma: { organisationMember: { findUnique: jest.Mock } };

  beforeEach(async () => {
    reflector = { getAllAndOverride: jest.fn() };
    prisma = { organisationMember: { findUnique: jest.fn() } };

    const module = await Test.createTestingModule({
      providers: [
        OrgRolesGuard,
        { provide: Reflector, useValue: reflector },
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    guard = module.get(OrgRolesGuard);
  });

  function makeContext(user: object) {
    const mockCtx = { getContext: () => ({ req: { user } }) };
    (GqlExecutionContext.create as jest.Mock).mockReturnValue(mockCtx);
    return {} as ExecutionContext;
  }

  it("allows through when no roles required", async () => {
    reflector.getAllAndOverride.mockReturnValue(undefined);
    const ctx = makeContext({ id: "u1", activeOrgId: "org1" });
    expect(await guard.canActivate(ctx)).toBe(true);
  });

  it("denies when user has no activeOrgId", async () => {
    reflector.getAllAndOverride.mockReturnValue(["ADMIN"]);
    const ctx = makeContext({ id: "u1", activeOrgId: null });
    expect(await guard.canActivate(ctx)).toBe(false);
  });

  it("denies when user is not a member of the active org", async () => {
    reflector.getAllAndOverride.mockReturnValue(["ADMIN"]);
    prisma.organisationMember.findUnique.mockResolvedValue(null);
    const ctx = makeContext({ id: "u1", activeOrgId: "org1" });
    expect(await guard.canActivate(ctx)).toBe(false);
  });

  it("denies when member role does not satisfy required roles", async () => {
    reflector.getAllAndOverride.mockReturnValue(["ADMIN"]);
    prisma.organisationMember.findUnique.mockResolvedValue({
      role: "OPERATOR",
    });
    const ctx = makeContext({ id: "u1", activeOrgId: "org1" });
    expect(await guard.canActivate(ctx)).toBe(false);
  });

  it("allows when member role satisfies required roles", async () => {
    reflector.getAllAndOverride.mockReturnValue(["ADMIN", "OPERATOR"]);
    prisma.organisationMember.findUnique.mockResolvedValue({
      role: "OPERATOR",
    });
    const ctx = makeContext({ id: "u1", activeOrgId: "org1" });
    expect(await guard.canActivate(ctx)).toBe(true);
  });
});
```

- [ ] **Step 4: Run test — expect failure**

```bash
pnpm --filter api test -- --testPathPattern="org-roles.guard" --no-coverage
```

Expected: FAIL — `Cannot find module './org-roles.guard'`

- [ ] **Step 5: Implement the guard**

Create `apps/api/src/modules/organisations/guards/org-roles.guard.ts`:

```typescript
import {
  CanActivate,
  ExecutionContext,
  Injectable,
  SetMetadata,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { GqlExecutionContext } from "@nestjs/graphql";
import { OrgRole } from "../../../generated/prisma/client";
import { PrismaService } from "../../../prisma/prisma.service";

export const ORG_ROLES_KEY = "orgRoles";
export const OrgRoles = (...roles: OrgRole[]) =>
  SetMetadata(ORG_ROLES_KEY, roles);

@Injectable()
export class OrgRolesGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredRoles = this.reflector.getAllAndOverride<OrgRole[]>(
      ORG_ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!requiredRoles) return true;

    const ctx = GqlExecutionContext.create(context);
    const user = ctx.getContext().req.user as {
      id: string;
      activeOrgId?: string | null;
    };

    if (!user?.activeOrgId) return false;

    const member = await this.prisma.organisationMember.findUnique({
      where: { orgId_userId: { orgId: user.activeOrgId, userId: user.id } },
      select: { role: true },
    });

    if (!member) return false;
    return requiredRoles.includes(member.role);
  }
}
```

- [ ] **Step 6: Run test — expect pass**

```bash
pnpm --filter api test -- --testPathPattern="org-roles.guard" --no-coverage
```

Expected: PASS (5 tests)

- [ ] **Step 7: Commit**

```bash
git add apps/api/src/modules/organisations/ apps/api/src/modules/auth/strategies/jwt.strategy.ts
git commit -m "feat: add @ActiveOrg decorator and @OrgRoles guard"
```

---

## Task 3: Organisation entities + DTOs

**Files:**

- Create: `apps/api/src/modules/organisations/entities/organisation.entity.ts`
- Create: `apps/api/src/modules/organisations/entities/organisation-member.entity.ts`
- Create: `apps/api/src/modules/organisations/dto/create-organisation.input.ts`
- Create: `apps/api/src/modules/organisations/dto/update-organisation.input.ts`
- Create: `apps/api/src/modules/organisations/dto/invite-member.input.ts`

- [ ] **Step 1: Create Organisation entity**

Create `apps/api/src/modules/organisations/entities/organisation.entity.ts`:

```typescript
import { ObjectType, Field, ID, registerEnumType } from "@nestjs/graphql";
import { AttributionMode } from "../../../generated/prisma/client";

registerEnumType(AttributionMode, { name: "AttributionMode" });

@ObjectType()
export class Organisation {
  @Field(() => ID)
  id: string;

  @Field()
  name: string;

  @Field()
  slug: string;

  @Field({ nullable: true })
  description?: string;

  @Field({ nullable: true })
  logoUrl?: string;

  @Field({ nullable: true })
  industry?: string;

  @Field(() => AttributionMode)
  attributionMode: AttributionMode;

  @Field()
  createdAt: Date;

  @Field()
  updatedAt: Date;
}
```

- [ ] **Step 2: Create OrganisationMember entity**

Create `apps/api/src/modules/organisations/entities/organisation-member.entity.ts`:

```typescript
import { ObjectType, Field, ID, registerEnumType } from "@nestjs/graphql";
import { OrgRole } from "../../../generated/prisma/client";
import { Organisation } from "./organisation.entity";

registerEnumType(OrgRole, { name: "OrgRole" });

@ObjectType()
export class OrganisationMember {
  @Field(() => ID)
  id: string;

  @Field()
  orgId: string;

  @Field()
  userId: string;

  @Field(() => OrgRole)
  role: OrgRole;

  @Field()
  joinedAt: Date;

  @Field(() => Organisation)
  organisation: Organisation;
}
```

- [ ] **Step 3: Create DTOs**

Create `apps/api/src/modules/organisations/dto/create-organisation.input.ts`:

```typescript
import { InputType, Field } from "@nestjs/graphql";
import { IsNotEmpty, IsOptional, IsString, Matches } from "class-validator";

@InputType()
export class CreateOrganisationInput {
  @Field()
  @IsNotEmpty()
  @IsString()
  name: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  description?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  industry?: string;
}
```

Create `apps/api/src/modules/organisations/dto/update-organisation.input.ts`:

```typescript
import { InputType, Field } from "@nestjs/graphql";
import { IsEnum, IsOptional, IsString } from "class-validator";
import { AttributionMode } from "../../../generated/prisma/client";

@InputType()
export class UpdateOrganisationInput {
  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  name?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  description?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  industry?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  logoUrl?: string;

  @Field(() => AttributionMode, { nullable: true })
  @IsOptional()
  @IsEnum(AttributionMode)
  attributionMode?: AttributionMode;
}
```

Create `apps/api/src/modules/organisations/dto/invite-member.input.ts`:

```typescript
import { InputType, Field } from "@nestjs/graphql";
import { IsEmail, IsEnum } from "class-validator";
import { OrgRole } from "../../../generated/prisma/client";

@InputType()
export class InviteMemberInput {
  @Field()
  @IsEmail()
  email: string;

  @Field(() => OrgRole)
  @IsEnum(OrgRole)
  role: OrgRole;
}
```

- [ ] **Step 4: Commit**

```bash
git add apps/api/src/modules/organisations/
git commit -m "feat: add organisation entities and DTOs"
```

---

## Task 4: OrganisationsService

**Files:**

- Create: `apps/api/src/modules/organisations/organisations.service.ts`
- Create: `apps/api/src/modules/organisations/organisations.service.spec.ts`

- [ ] **Step 1: Write the failing tests**

Create `apps/api/src/modules/organisations/organisations.service.spec.ts`:

```typescript
import { Test } from "@nestjs/testing";
import { OrganisationsService } from "./organisations.service";
import { PrismaService } from "../../prisma/prisma.service";
import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from "@nestjs/common";

describe("OrganisationsService", () => {
  let service: OrganisationsService;
  let prisma: {
    organisation: {
      create: jest.Mock;
      findUnique: jest.Mock;
      update: jest.Mock;
    };
    organisationMember: {
      create: jest.Mock;
      findUnique: jest.Mock;
      findMany: jest.Mock;
      update: jest.Mock;
      delete: jest.Mock;
    };
    contact: { create: jest.Mock; findUnique: jest.Mock };
    user: { findUnique: jest.Mock };
  };

  beforeEach(async () => {
    prisma = {
      organisation: {
        create: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      organisationMember: {
        create: jest.fn(),
        findUnique: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      contact: { create: jest.fn(), findUnique: jest.fn() },
      user: { findUnique: jest.fn() },
    };

    const module = await Test.createTestingModule({
      providers: [
        OrganisationsService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get(OrganisationsService);
  });

  describe("create", () => {
    it("creates an org and sets creator as ADMIN", async () => {
      const org = { id: "org1", name: "Akanors", slug: "akanors" };
      prisma.organisation.findUnique.mockResolvedValue(null); // slug not taken
      prisma.organisation.create.mockResolvedValue(org);
      prisma.organisationMember.create.mockResolvedValue({});

      const result = await service.create({ name: "Akanors" }, "user1");

      expect(prisma.organisation.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ slug: "akanors" }),
        }),
      );
      expect(prisma.organisationMember.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ role: "ADMIN", userId: "user1" }),
        }),
      );
      expect(result).toEqual(org);
    });

    it("appends a suffix when slug is already taken", async () => {
      prisma.organisation.findUnique
        .mockResolvedValueOnce({ id: "existing" }) // 'akanors' taken
        .mockResolvedValueOnce(null); // 'akanors-2' free
      prisma.organisation.create.mockResolvedValue({
        id: "org1",
        slug: "akanors-2",
      });
      prisma.organisationMember.create.mockResolvedValue({});

      const result = await service.create({ name: "Akanors" }, "user1");
      expect(result.slug).toBe("akanors-2");
    });
  });

  describe("inviteMember", () => {
    it("throws NotFoundException when user email is not found", async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      await expect(
        service.inviteMember(
          "org1",
          { email: "nobody@test.com", role: "OPERATOR" as any },
          "admin1",
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it("throws ConflictException when user is already a member", async () => {
      prisma.user.findUnique.mockResolvedValue({ id: "u2" });
      prisma.organisationMember.findUnique.mockResolvedValue({
        id: "existing",
      });
      await expect(
        service.inviteMember(
          "org1",
          { email: "existing@test.com", role: "OPERATOR" as any },
          "admin1",
        ),
      ).rejects.toThrow(ConflictException);
    });

    it("creates the member when everything is valid", async () => {
      prisma.user.findUnique.mockResolvedValue({ id: "u2" });
      prisma.organisationMember.findUnique.mockResolvedValue(null);
      prisma.organisationMember.create.mockResolvedValue({
        id: "mem1",
        role: "OPERATOR",
      });

      const result = await service.inviteMember(
        "org1",
        { email: "new@test.com", role: "OPERATOR" as any },
        "admin1",
      );
      expect(result.role).toBe("OPERATOR");
    });
  });

  describe("promoteContactToOrg", () => {
    it("creates a new org-scoped contact from a personal contact", async () => {
      prisma.contact.findUnique.mockResolvedValue({
        id: "c1",
        firstName: "Ali",
        lastName: "B",
        email: "ali@b.com",
        phoneNumber: null,
        userId: "user1",
        orgId: null,
      });
      prisma.contact.create.mockResolvedValue({ id: "c2", orgId: "org1" });

      const result = await service.promoteContactToOrg("c1", "org1", "user1");
      expect(prisma.contact.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ orgId: "org1", firstName: "Ali" }),
        }),
      );
      expect(result.orgId).toBe("org1");
    });

    it("throws ForbiddenException when contact does not belong to user", async () => {
      prisma.contact.findUnique.mockResolvedValue({
        id: "c1",
        userId: "other",
      });
      await expect(
        service.promoteContactToOrg("c1", "org1", "user1"),
      ).rejects.toThrow(ForbiddenException);
    });
  });
});
```

- [ ] **Step 2: Run test — expect failure**

```bash
pnpm --filter api test -- --testPathPattern="organisations.service" --no-coverage
```

Expected: FAIL — `Cannot find module './organisations.service'`

- [ ] **Step 3: Implement OrganisationsService**

Create `apps/api/src/modules/organisations/organisations.service.ts`:

```typescript
import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
} from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { CreateOrganisationInput } from "./dto/create-organisation.input";
import { UpdateOrganisationInput } from "./dto/update-organisation.input";
import { InviteMemberInput } from "./dto/invite-member.input";
import { OrgRole } from "../../generated/prisma/client";

function toSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

@Injectable()
export class OrganisationsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(input: CreateOrganisationInput, userId: string) {
    const baseSlug = toSlug(input.name);
    const slug = await this.uniqueSlug(baseSlug);

    const org = await this.prisma.organisation.create({
      data: {
        name: input.name,
        slug,
        description: input.description,
        industry: input.industry,
      },
    });

    await this.prisma.organisationMember.create({
      data: { orgId: org.id, userId, role: OrgRole.ADMIN },
    });

    return org;
  }

  private async uniqueSlug(base: string): Promise<string> {
    let slug = base;
    let i = 2;
    while (await this.prisma.organisation.findUnique({ where: { slug } })) {
      slug = `${base}-${i++}`;
    }
    return slug;
  }

  async findById(id: string) {
    const org = await this.prisma.organisation.findUnique({
      where: { id },
      include: { members: { include: { user: true } }, subscription: true },
    });
    if (!org) throw new NotFoundException("Organisation not found");
    return org;
  }

  async findBySlug(slug: string) {
    const org = await this.prisma.organisation.findUnique({
      where: { slug },
      include: { members: { include: { user: true } }, subscription: true },
    });
    if (!org) throw new NotFoundException("Organisation not found");
    return org;
  }

  async findUserOrgs(userId: string) {
    return this.prisma.organisation.findMany({
      where: { members: { some: { userId } } },
      include: { subscription: true },
    });
  }

  async update(id: string, input: UpdateOrganisationInput, userId: string) {
    await this.assertAdmin(id, userId);
    return this.prisma.organisation.update({ where: { id }, data: input });
  }

  async inviteMember(
    orgId: string,
    input: InviteMemberInput,
    requesterId: string,
  ) {
    await this.assertAdmin(orgId, requesterId);

    const user = await this.prisma.user.findUnique({
      where: { email: input.email },
    });
    if (!user)
      throw new NotFoundException("No Wathīqah account found for that email");

    const existing = await this.prisma.organisationMember.findUnique({
      where: { orgId_userId: { orgId, userId: user.id } },
    });
    if (existing) throw new ConflictException("User is already a member");

    return this.prisma.organisationMember.create({
      data: { orgId, userId: user.id, role: input.role },
    });
  }

  async updateMemberRole(memberId: string, role: OrgRole, requesterId: string) {
    const member = await this.prisma.organisationMember.findUnique({
      where: { id: memberId },
    });
    if (!member) throw new NotFoundException("Member not found");
    await this.assertAdmin(member.orgId, requesterId);
    return this.prisma.organisationMember.update({
      where: { id: memberId },
      data: { role },
    });
  }

  async removeMember(memberId: string, requesterId: string) {
    const member = await this.prisma.organisationMember.findUnique({
      where: { id: memberId },
    });
    if (!member) throw new NotFoundException("Member not found");
    await this.assertAdmin(member.orgId, requesterId);
    await this.prisma.organisationMember.delete({ where: { id: memberId } });
    return true;
  }

  async promoteContactToOrg(contactId: string, orgId: string, userId: string) {
    const contact = await this.prisma.contact.findUnique({
      where: { id: contactId },
    });
    if (!contact) throw new NotFoundException("Contact not found");
    if (contact.userId !== userId)
      throw new ForbiddenException("Contact does not belong to you");

    return this.prisma.contact.create({
      data: {
        firstName: contact.firstName,
        lastName: contact.lastName,
        email: contact.email ?? undefined,
        phoneNumber: contact.phoneNumber ?? undefined,
        userId,
        orgId,
      },
    });
  }

  private async assertAdmin(orgId: string, userId: string) {
    const member = await this.prisma.organisationMember.findUnique({
      where: { orgId_userId: { orgId, userId } },
    });
    if (!member || member.role !== OrgRole.ADMIN) {
      throw new ForbiddenException("Only org admins can perform this action");
    }
  }
}
```

- [ ] **Step 4: Run tests — expect pass**

```bash
pnpm --filter api test -- --testPathPattern="organisations.service" --no-coverage
```

Expected: PASS (5 tests)

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/modules/organisations/
git commit -m "feat: implement OrganisationsService with membership and contact promotion"
```

---

## Task 5: Auth extension — `switchOrgContext`

**Files:**

- Modify: `apps/api/src/modules/auth/auth.service.ts`
- Modify: `apps/api/src/modules/auth/auth.resolver.ts`

- [ ] **Step 1: Extend `generateTokens` to accept `activeOrgId`**

In `apps/api/src/modules/auth/auth.service.ts`, replace the `generateTokens` method:

```typescript
private async generateTokens(
  userId: string,
  email: string,
  activeOrgId?: string | null,
) {
  const accessExpiry = ms(
    this.configService.getOrThrow<string>('auth.jwt.expiration') as ms.StringValue,
  );
  const refreshExpiry = ms(
    this.configService.getOrThrow<string>('auth.jwt.refreshExpiration') as ms.StringValue,
  );

  const payload: Record<string, unknown> = { sub: userId, email };
  if (activeOrgId) payload.activeOrgId = activeOrgId;

  const accessToken = await this.jwtService.signAsync(payload, {
    expiresIn: accessExpiry,
  });
  const refreshToken = await this.jwtService.signAsync(
    { sub: userId, email },
    { expiresIn: refreshExpiry },
  );

  const refreshTokenHash = await bcrypt.hash(refreshToken, 10);
  await this.usersService.updateRefreshToken(userId, refreshTokenHash);

  return { accessToken, refreshToken };
}
```

- [ ] **Step 2: Add `switchOrgContext` to AuthService**

Add this method to `AuthService`, after `logout`:

```typescript
async switchOrgContext(
  userId: string,
  email: string,
  orgId: string | null,
): Promise<{ accessToken: string; refreshToken: string }> {
  if (orgId) {
    const member = await this.prisma.organisationMember.findUnique({
      where: { orgId_userId: { orgId, userId } },
    });
    if (!member) {
      throw new UnauthorizedException('You are not a member of this organisation');
    }
  }
  return this.generateTokens(userId, email, orgId ?? undefined);
}
```

- [ ] **Step 3: Add `switchOrgContext` mutation to AuthResolver**

In `apps/api/src/modules/auth/auth.resolver.ts`, add this mutation after the `logout` mutation:

```typescript
@Mutation(() => AuthPayload)
@UseGuards(GqlAuthGuard)
async switchOrgContext(
  @Args('orgId', { nullable: true, type: () => String }) orgId: string | null,
  @CurrentUser() user: User,
) {
  const { accessToken, refreshToken } = await this.authService.switchOrgContext(
    user.id,
    user.email,
    orgId,
  );
  return { accessToken, refreshToken, user };
}
```

- [ ] **Step 4: Verify the API starts without errors**

```bash
pnpm --filter api dev &
sleep 8
curl -s http://localhost:3001/api/health | grep -q "ok" && echo "API OK" || echo "API FAILED"
pkill -f "nest start"
```

Expected: `API OK`

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/modules/auth/
git commit -m "feat: extend JWT and add switchOrgContext mutation"
```

---

## Task 6: OrganisationsResolver + Module + AppModule wiring

**Files:**

- Create: `apps/api/src/modules/organisations/organisations.resolver.ts`
- Create: `apps/api/src/modules/organisations/organisations.module.ts`
- Modify: `apps/api/src/app.module.ts`

- [ ] **Step 1: Create the resolver**

Create `apps/api/src/modules/organisations/organisations.resolver.ts`:

```typescript
import { Resolver, Query, Mutation, Args, ID } from "@nestjs/graphql";
import { UseGuards } from "@nestjs/common";
import { GqlAuthGuard } from "../../common/guards/gql-auth.guard";
import { OrgRolesGuard, OrgRoles } from "./guards/org-roles.guard";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { ActiveOrg } from "./decorators/active-org.decorator";
import { OrganisationsService } from "./organisations.service";
import { Organisation } from "./entities/organisation.entity";
import { OrganisationMember } from "./entities/organisation-member.entity";
import { CreateOrganisationInput } from "./dto/create-organisation.input";
import { UpdateOrganisationInput } from "./dto/update-organisation.input";
import { InviteMemberInput } from "./dto/invite-member.input";
import { OrgRole } from "../../generated/prisma/client";
import { User } from "../users/entities/user.entity";

@Resolver(() => Organisation)
@UseGuards(GqlAuthGuard)
export class OrganisationsResolver {
  constructor(private readonly orgsService: OrganisationsService) {}

  @Mutation(() => Organisation)
  createOrganisation(
    @Args("input") input: CreateOrganisationInput,
    @CurrentUser() user: User,
  ) {
    return this.orgsService.create(input, user.id);
  }

  @Query(() => Organisation, { name: "organisation" })
  findOrganisation(@Args("slug") slug: string) {
    return this.orgsService.findBySlug(slug);
  }

  @Query(() => [Organisation], { name: "myOrganisations" })
  myOrganisations(@CurrentUser() user: User) {
    return this.orgsService.findUserOrgs(user.id);
  }

  @Mutation(() => Organisation)
  @UseGuards(OrgRolesGuard)
  @OrgRoles(OrgRole.ADMIN)
  updateOrganisation(
    @ActiveOrg() orgId: string,
    @Args("input") input: UpdateOrganisationInput,
    @CurrentUser() user: User,
  ) {
    return this.orgsService.update(orgId, input, user.id);
  }

  @Mutation(() => OrganisationMember)
  @UseGuards(OrgRolesGuard)
  @OrgRoles(OrgRole.ADMIN)
  inviteMember(
    @ActiveOrg() orgId: string,
    @Args("input") input: InviteMemberInput,
    @CurrentUser() user: User,
  ) {
    return this.orgsService.inviteMember(orgId, input, user.id);
  }

  @Mutation(() => OrganisationMember)
  @UseGuards(OrgRolesGuard)
  @OrgRoles(OrgRole.ADMIN)
  updateMemberRole(
    @Args("memberId", { type: () => ID }) memberId: string,
    @Args("role", { type: () => OrgRole }) role: OrgRole,
    @CurrentUser() user: User,
  ) {
    return this.orgsService.updateMemberRole(memberId, role, user.id);
  }

  @Mutation(() => Boolean)
  @UseGuards(OrgRolesGuard)
  @OrgRoles(OrgRole.ADMIN)
  removeMember(
    @Args("memberId", { type: () => ID }) memberId: string,
    @CurrentUser() user: User,
  ) {
    return this.orgsService.removeMember(memberId, user.id);
  }

  @Mutation(() => Object)
  promoteContactToOrg(
    @Args("contactId", { type: () => ID }) contactId: string,
    @ActiveOrg() orgId: string,
    @CurrentUser() user: User,
  ) {
    return this.orgsService.promoteContactToOrg(contactId, orgId, user.id);
  }
}
```

- [ ] **Step 2: Create the module**

Create `apps/api/src/modules/organisations/organisations.module.ts`:

```typescript
import { Module } from "@nestjs/common";
import { OrganisationsService } from "./organisations.service";
import { OrganisationsResolver } from "./organisations.resolver";
import { PrismaModule } from "../../prisma/prisma.module";

@Module({
  imports: [PrismaModule],
  providers: [OrganisationsResolver, OrganisationsService, OrgRolesGuard],
  exports: [OrganisationsService],
})
export class OrganisationsModule {}
```

Fix the import — add `OrgRolesGuard` to the import at the top:

```typescript
import { OrgRolesGuard } from "./guards/org-roles.guard";
```

- [ ] **Step 3: Register in AppModule**

In `apps/api/src/app.module.ts`, add to the imports array after the last existing module import:

```typescript
import { OrganisationsModule } from "./modules/organisations/organisations.module";
```

And in the `imports` array, add `OrganisationsModule`.

- [ ] **Step 4: Verify schema generation**

```bash
pnpm --filter api dev &
sleep 8
grep -q "switchOrgContext\|createOrganisation\|myOrganisations" apps/api/src/schema.gql && echo "SCHEMA OK"
pkill -f "nest start"
```

Expected: `SCHEMA OK`

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/modules/organisations/ apps/api/src/app.module.ts apps/api/src/schema.gql
git commit -m "feat: wire OrganisationsModule and expose GraphQL mutations"
```

---

## Task 7: Scope Transactions to org context

**Files:**

- Modify: `apps/api/src/modules/transactions/transactions.service.ts`
- Modify: `apps/api/src/modules/transactions/transactions.resolver.ts`

- [ ] **Step 1: Write the failing test**

Add to `apps/api/src/modules/transactions/transactions.service.spec.ts` (or create if missing):

```typescript
describe("TransactionsService — org scoping", () => {
  let service: TransactionsService;
  let prisma: {
    transaction: { findMany: jest.Mock; count: jest.Mock; create: jest.Mock };
  };

  beforeEach(async () => {
    prisma = {
      transaction: { findMany: jest.fn(), count: jest.fn(), create: jest.fn() },
    };
    const module = await Test.createTestingModule({
      providers: [
        TransactionsService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();
    service = module.get(TransactionsService);
  });

  it("scopes findAll to orgId when org context is active", async () => {
    prisma.transaction.findMany.mockResolvedValue([]);
    prisma.transaction.count.mockResolvedValue(0);

    await service.findAll("user1", "org1", {});

    expect(prisma.transaction.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ orgId: "org1" }),
      }),
    );
  });

  it("scopes findAll to personal records when orgId is null", async () => {
    prisma.transaction.findMany.mockResolvedValue([]);
    prisma.transaction.count.mockResolvedValue(0);

    await service.findAll("user1", null, {});

    expect(prisma.transaction.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ createdById: "user1", orgId: null }),
      }),
    );
  });
});
```

- [ ] **Step 2: Run test — expect failure**

```bash
pnpm --filter api test -- --testPathPattern="transactions.service" --no-coverage 2>&1 | tail -10
```

Expected: FAIL — argument count mismatch on `findAll`

- [ ] **Step 3: Update TransactionsService**

In `apps/api/src/modules/transactions/transactions.service.ts`, update the `findAll` method signature and its `where` clause:

```typescript
// Change signature from:
async findAll(userId: string, filter?: FilterTransactionInput)
// To:
async findAll(userId: string, orgId: string | null, filter?: FilterTransactionInput)

// And update the base where clause from:
const baseWhere = { createdById: userId };
// To:
const baseWhere = orgId
  ? { orgId }
  : { createdById: userId, orgId: null };
```

Update the `create` method signature and data:

```typescript
// Change signature from:
async create(createTransactionInput: CreateTransactionInput, userId: string)
// To:
async create(createTransactionInput: CreateTransactionInput, userId: string, orgId: string | null)

// And add to the data object:
orgId: orgId ?? undefined,
```

- [ ] **Step 4: Update TransactionsResolver**

In `apps/api/src/modules/transactions/transactions.resolver.ts`, inject `@ActiveOrg()` in all affected queries/mutations:

```typescript
// Add import at top:
import { ActiveOrg } from '../organisations/decorators/active-org.decorator';

// Update findAll query:
@Query(() => PaginatedTransactionsResponse, { name: 'transactions' })
findAll(
  @CurrentUser() user: User,
  @ActiveOrg() orgId: string | null,
  @Args('filter', { nullable: true }) filter?: FilterTransactionInput,
) {
  return this.transactionsService.findAll(user.id, orgId, filter);
}

// Update createTransaction mutation:
@Mutation(() => Transaction)
createTransaction(
  @Args('createTransactionInput') input: CreateTransactionInput,
  @CurrentUser() user: User,
  @ActiveOrg() orgId: string | null,
) {
  return this.transactionsService.create(input, user.id, orgId);
}
```

- [ ] **Step 5: Run test — expect pass**

```bash
pnpm --filter api test -- --testPathPattern="transactions.service" --no-coverage
```

Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add apps/api/src/modules/transactions/
git commit -m "feat: scope transactions to org context"
```

---

## Task 8: Scope Contacts + promoteToOrg

**Files:**

- Modify: `apps/api/src/modules/contacts/contacts.service.ts`
- Modify: `apps/api/src/modules/contacts/contacts.resolver.ts`

- [ ] **Step 1: Write the failing tests**

Add to `apps/api/src/modules/contacts/contacts.service.spec.ts`:

```typescript
describe("ContactsService — org scoping", () => {
  it("scopes findAll to orgId when org context active", async () => {
    prisma.contact.findMany.mockResolvedValue([]);
    prisma.contact.count.mockResolvedValue(0);

    await service.findAll("user1", "org1", {});

    expect(prisma.contact.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ orgId: "org1" }),
      }),
    );
  });

  it("scopes findAll to personal when orgId is null", async () => {
    prisma.contact.findMany.mockResolvedValue([]);
    prisma.contact.count.mockResolvedValue(0);

    await service.findAll("user1", null, {});

    expect(prisma.contact.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ userId: "user1", orgId: null }),
      }),
    );
  });
});
```

- [ ] **Step 2: Run test — expect failure**

```bash
pnpm --filter api test -- --testPathPattern="contacts.service" --no-coverage 2>&1 | tail -10
```

Expected: FAIL

- [ ] **Step 3: Update ContactsService**

In `apps/api/src/modules/contacts/contacts.service.ts`:

Update `findAll` signature to `findAll(userId: string, orgId: string | null, filter?: FilterContactInput)` and update the where clause:

```typescript
const baseWhere = orgId ? { orgId } : { userId, orgId: null };
```

Update `create` signature to `create(input: CreateContactInput, userId: string, orgId: string | null)` and add `orgId: orgId ?? undefined` to the data object.

- [ ] **Step 4: Update ContactsResolver**

In `apps/api/src/modules/contacts/contacts.resolver.ts`:

```typescript
// Add import:
import { ActiveOrg } from '../organisations/decorators/active-org.decorator';

// Update createContact:
createContact(
  @Args('createContactInput') createContactInput: CreateContactInput,
  @CurrentUser() user: User,
  @ActiveOrg() orgId: string | null,
) {
  return this.contactsService.create(createContactInput, user.id, orgId);
}

// Update findAll:
findAll(
  @CurrentUser() user: User,
  @ActiveOrg() orgId: string | null,
  @Args('filter', { nullable: true }) filter?: FilterContactInput,
) {
  return this.contactsService.findAll(user.id, orgId, filter);
}
```

- [ ] **Step 5: Run tests — expect pass**

```bash
pnpm --filter api test -- --testPathPattern="contacts.service" --no-coverage
```

Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add apps/api/src/modules/contacts/
git commit -m "feat: scope contacts to org context"
```

---

## Task 9: Scope Projects and Promises

**Files:**

- Modify: `apps/api/src/modules/projects/projects.service.ts`
- Modify: `apps/api/src/modules/projects/projects.resolver.ts`
- Modify: `apps/api/src/modules/promises/promises.service.ts`
- Modify: `apps/api/src/modules/promises/promises.resolver.ts`

- [ ] **Step 1: Update ProjectsService**

In `apps/api/src/modules/projects/projects.service.ts`:

Update `findAll(userId, filter?)` → `findAll(userId, orgId, filter?)` with where clause:

```typescript
const where = orgId ? { orgId } : { userId, orgId: null };
```

Update `create(input, userId)` → `create(input, userId, orgId)` adding `orgId: orgId ?? undefined`.

- [ ] **Step 2: Update ProjectsResolver**

In `apps/api/src/modules/projects/projects.resolver.ts`:

```typescript
import { ActiveOrg } from "../organisations/decorators/active-org.decorator";

// Update findAll and createProject to inject @ActiveOrg() orgId and pass it to the service.
```

- [ ] **Step 3: Update PromisesService**

In `apps/api/src/modules/promises/promises.service.ts`:

Apply the same pattern — update `findAll` and `create` to accept and use `orgId: string | null`.

- [ ] **Step 4: Update PromisesResolver**

In `apps/api/src/modules/promises/promises.resolver.ts`:

Inject `@ActiveOrg() orgId` in `findAll` and `createPromise` and pass through to the service.

- [ ] **Step 5: Run all backend tests**

```bash
pnpm --filter api test --no-coverage
```

Expected: All existing tests pass.

- [ ] **Step 6: Commit**

```bash
git add apps/api/src/modules/projects/ apps/api/src/modules/promises/
git commit -m "feat: scope projects and promises to org context"
```

---

## Task 10: Notification attribution mode

**Files:**

- Modify: `apps/api/src/modules/notifications/notification.service.ts`

- [ ] **Step 1: Update the transaction notification sender name**

In `apps/api/src/modules/notifications/notification.service.ts`, find the method that builds the SMS message for a new transaction (e.g. `sendTransactionNotification` or similar). Update it to accept an optional `attributionMode` and `orgName`:

```typescript
// Add parameter to the notification method:
async sendTransactionNotification(
  // ... existing params ...
  orgName?: string,
  attributionMode?: string,
  operatorName?: string,
) {
  const senderLabel =
    orgName && attributionMode === 'ORG_AND_OPERATOR' && operatorName
      ? `${orgName} (${operatorName})`
      : orgName ?? creatorName;  // fall back to personal name for personal mode

  // Use senderLabel instead of creatorName in the SMS body
}
```

- [ ] **Step 2: Update TransactionsService to pass org info to notification**

In `apps/api/src/modules/transactions/transactions.service.ts`, after creating a transaction, fetch the org's `name` and `attributionMode` when `orgId` is set and pass them to the notification service:

```typescript
if (orgId) {
  const org = await this.prisma.organisation.findUnique({
    where: { id: orgId },
    select: { name: true, attributionMode: true },
  });
  // pass org.name, org.attributionMode, and user's name to notification
}
```

- [ ] **Step 3: Run backend tests**

```bash
pnpm --filter api test --no-coverage
```

Expected: All tests pass.

- [ ] **Step 4: Commit**

```bash
git add apps/api/src/modules/notifications/ apps/api/src/modules/transactions/
git commit -m "feat: apply org attribution mode to transaction notifications"
```

---

## Task 11: OrgEvents module

**Files:**

- Create: `apps/api/src/modules/org-events/entities/org-event.entity.ts`
- Create: `apps/api/src/modules/org-events/dto/create-org-event.input.ts`
- Create: `apps/api/src/modules/org-events/dto/update-org-event.input.ts`
- Create: `apps/api/src/modules/org-events/org-events.service.ts`
- Create: `apps/api/src/modules/org-events/org-events.service.spec.ts`
- Create: `apps/api/src/modules/org-events/org-events.resolver.ts`
- Create: `apps/api/src/modules/org-events/org-events.module.ts`
- Modify: `apps/api/src/app.module.ts`

- [ ] **Step 1: Create OrgEvent entity and DTOs**

Create `apps/api/src/modules/org-events/entities/org-event.entity.ts`:

```typescript
import { ObjectType, Field, ID } from "@nestjs/graphql";

@ObjectType()
export class OrgEvent {
  @Field(() => ID)
  id: string;

  @Field()
  orgId: string;

  @Field()
  title: string;

  @Field()
  date: Date;

  @Field({ nullable: true })
  endDate?: Date;

  @Field()
  category: string;

  @Field({ nullable: true })
  notes?: string;

  @Field()
  isRecurring: boolean;

  @Field({ nullable: true })
  recurrence?: string;

  @Field()
  createdById: string;

  @Field()
  createdAt: Date;

  @Field()
  updatedAt: Date;
}
```

Create `apps/api/src/modules/org-events/dto/create-org-event.input.ts`:

```typescript
import { InputType, Field } from "@nestjs/graphql";
import {
  IsBoolean,
  IsDateString,
  IsNotEmpty,
  IsOptional,
  IsString,
} from "class-validator";

@InputType()
export class CreateOrgEventInput {
  @Field()
  @IsNotEmpty()
  @IsString()
  title: string;

  @Field()
  @IsDateString()
  date: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @Field()
  @IsNotEmpty()
  @IsString()
  category: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  notes?: string;

  @Field({ nullable: true, defaultValue: false })
  @IsOptional()
  @IsBoolean()
  isRecurring?: boolean;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  recurrence?: string;
}
```

Create `apps/api/src/modules/org-events/dto/update-org-event.input.ts`:

```typescript
import { InputType, Field } from "@nestjs/graphql";
import { IsBoolean, IsDateString, IsOptional, IsString } from "class-validator";

@InputType()
export class UpdateOrgEventInput {
  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  title?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsDateString()
  date?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  category?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  notes?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsBoolean()
  isRecurring?: boolean;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  recurrence?: string;
}
```

- [ ] **Step 2: Write failing service tests**

Create `apps/api/src/modules/org-events/org-events.service.spec.ts`:

```typescript
import { Test } from "@nestjs/testing";
import { OrgEventsService } from "./org-events.service";
import { PrismaService } from "../../prisma/prisma.service";
import { ForbiddenException } from "@nestjs/common";

describe("OrgEventsService", () => {
  let service: OrgEventsService;
  let prisma: {
    orgEvent: {
      create: jest.Mock;
      findMany: jest.Mock;
      findUnique: jest.Mock;
      update: jest.Mock;
      delete: jest.Mock;
    };
  };

  beforeEach(async () => {
    prisma = {
      orgEvent: {
        create: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
    };
    const module = await Test.createTestingModule({
      providers: [
        OrgEventsService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();
    service = module.get(OrgEventsService);
  });

  it("creates an event scoped to the org", async () => {
    prisma.orgEvent.create.mockResolvedValue({ id: "e1", orgId: "org1" });
    const result = await service.create(
      {
        title: "Eid al-Adha",
        date: "2026-06-06",
        category: "Islamic Calendar",
      },
      "org1",
      "user1",
    );
    expect(prisma.orgEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ orgId: "org1", createdById: "user1" }),
      }),
    );
    expect(result.orgId).toBe("org1");
  });

  it("returns upcoming events sorted by date ascending", async () => {
    prisma.orgEvent.findMany.mockResolvedValue([]);
    await service.findUpcoming("org1");
    expect(prisma.orgEvent.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ orderBy: { date: "asc" } }),
    );
  });

  it("throws ForbiddenException when deleting another orgs event", async () => {
    prisma.orgEvent.findUnique.mockResolvedValue({
      id: "e1",
      orgId: "other-org",
    });
    await expect(service.remove("e1", "org1")).rejects.toThrow(
      ForbiddenException,
    );
  });
});
```

- [ ] **Step 3: Run test — expect failure**

```bash
pnpm --filter api test -- --testPathPattern="org-events.service" --no-coverage
```

Expected: FAIL

- [ ] **Step 4: Implement OrgEventsService**

Create `apps/api/src/modules/org-events/org-events.service.ts`:

```typescript
import {
  Injectable,
  ForbiddenException,
  NotFoundException,
} from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { CreateOrgEventInput } from "./dto/create-org-event.input";
import { UpdateOrgEventInput } from "./dto/update-org-event.input";

export const PREDEFINED_EVENT_CATEGORIES = [
  "Vaccination",
  "Breeding",
  "Islamic Calendar",
  "Regulatory",
  "Commercial",
];

@Injectable()
export class OrgEventsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(input: CreateOrgEventInput, orgId: string, userId: string) {
    return this.prisma.orgEvent.create({
      data: {
        orgId,
        createdById: userId,
        title: input.title,
        date: new Date(input.date),
        endDate: input.endDate ? new Date(input.endDate) : undefined,
        category: input.category,
        notes: input.notes,
        isRecurring: input.isRecurring ?? false,
        recurrence: input.recurrence,
      },
    });
  }

  async findUpcoming(orgId: string, category?: string) {
    return this.prisma.orgEvent.findMany({
      where: {
        orgId,
        date: { gte: new Date() },
        ...(category ? { category } : {}),
      },
      orderBy: { date: "asc" },
    });
  }

  async findAll(orgId: string, category?: string) {
    return this.prisma.orgEvent.findMany({
      where: { orgId, ...(category ? { category } : {}) },
      orderBy: { date: "asc" },
    });
  }

  categorySuggestions() {
    return PREDEFINED_EVENT_CATEGORIES;
  }

  async update(id: string, input: UpdateOrgEventInput, orgId: string) {
    await this.assertOwnership(id, orgId);
    return this.prisma.orgEvent.update({
      where: { id },
      data: {
        ...input,
        date: input.date ? new Date(input.date) : undefined,
        endDate: input.endDate ? new Date(input.endDate) : undefined,
      },
    });
  }

  async remove(id: string, orgId: string) {
    await this.assertOwnership(id, orgId);
    await this.prisma.orgEvent.delete({ where: { id } });
    return true;
  }

  private async assertOwnership(id: string, orgId: string) {
    const event = await this.prisma.orgEvent.findUnique({ where: { id } });
    if (!event) throw new NotFoundException("Event not found");
    if (event.orgId !== orgId)
      throw new ForbiddenException("Event does not belong to this org");
  }
}
```

- [ ] **Step 5: Run tests — expect pass**

```bash
pnpm --filter api test -- --testPathPattern="org-events.service" --no-coverage
```

Expected: PASS (3 tests)

- [ ] **Step 6: Create resolver and module**

Create `apps/api/src/modules/org-events/org-events.resolver.ts`:

```typescript
import { Resolver, Query, Mutation, Args, ID } from "@nestjs/graphql";
import { UseGuards } from "@nestjs/common";
import { GqlAuthGuard } from "../../common/guards/gql-auth.guard";
import {
  OrgRolesGuard,
  OrgRoles,
} from "../organisations/guards/org-roles.guard";
import { ActiveOrg } from "../organisations/decorators/active-org.decorator";
import { OrgEventsService } from "./org-events.service";
import { OrgEvent } from "./entities/org-event.entity";
import { CreateOrgEventInput } from "./dto/create-org-event.input";
import { UpdateOrgEventInput } from "./dto/update-org-event.input";
import { OrgRole } from "../../generated/prisma/client";

@Resolver(() => OrgEvent)
@UseGuards(GqlAuthGuard, OrgRolesGuard)
export class OrgEventsResolver {
  constructor(private readonly orgEventsService: OrgEventsService) {}

  @Mutation(() => OrgEvent)
  @OrgRoles(OrgRole.ADMIN, OrgRole.OPERATOR)
  createOrgEvent(
    @Args("input") input: CreateOrgEventInput,
    @ActiveOrg() orgId: string,
  ) {
    return this.orgEventsService.create(input, orgId, undefined!);
  }

  @Query(() => [OrgEvent], { name: "orgUpcomingEvents" })
  @OrgRoles(OrgRole.ADMIN, OrgRole.OPERATOR, OrgRole.VIEWER)
  findUpcoming(
    @ActiveOrg() orgId: string,
    @Args("category", { nullable: true }) category?: string,
  ) {
    return this.orgEventsService.findUpcoming(orgId, category);
  }

  @Query(() => [OrgEvent], { name: "orgEvents" })
  @OrgRoles(OrgRole.ADMIN, OrgRole.OPERATOR, OrgRole.VIEWER)
  findAll(
    @ActiveOrg() orgId: string,
    @Args("category", { nullable: true }) category?: string,
  ) {
    return this.orgEventsService.findAll(orgId, category);
  }

  @Query(() => [String], { name: "orgEventCategorySuggestions" })
  categorySuggestions() {
    return this.orgEventsService.categorySuggestions();
  }

  @Mutation(() => OrgEvent)
  @OrgRoles(OrgRole.ADMIN, OrgRole.OPERATOR)
  updateOrgEvent(
    @Args("id", { type: () => ID }) id: string,
    @Args("input") input: UpdateOrgEventInput,
    @ActiveOrg() orgId: string,
  ) {
    return this.orgEventsService.update(id, input, orgId);
  }

  @Mutation(() => Boolean)
  @OrgRoles(OrgRole.ADMIN, OrgRole.OPERATOR)
  removeOrgEvent(
    @Args("id", { type: () => ID }) id: string,
    @ActiveOrg() orgId: string,
  ) {
    return this.orgEventsService.remove(id, orgId);
  }
}
```

Fix the `createOrgEvent` resolver — inject `@CurrentUser()` to pass `userId`:

```typescript
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';

// Replace createOrgEvent:
@Mutation(() => OrgEvent)
@OrgRoles(OrgRole.ADMIN, OrgRole.OPERATOR)
createOrgEvent(
  @Args('input') input: CreateOrgEventInput,
  @ActiveOrg() orgId: string,
  @CurrentUser() user: User,
) {
  return this.orgEventsService.create(input, orgId, user.id);
}
```

Create `apps/api/src/modules/org-events/org-events.module.ts`:

```typescript
import { Module } from "@nestjs/common";
import { OrgEventsService } from "./org-events.service";
import { OrgEventsResolver } from "./org-events.resolver";
import { PrismaModule } from "../../prisma/prisma.module";
import { OrgRolesGuard } from "../organisations/guards/org-roles.guard";

@Module({
  imports: [PrismaModule],
  providers: [OrgEventsResolver, OrgEventsService, OrgRolesGuard],
})
export class OrgEventsModule {}
```

Add `OrgEventsModule` to `app.module.ts` imports.

- [ ] **Step 7: Commit**

```bash
git add apps/api/src/modules/org-events/ apps/api/src/app.module.ts
git commit -m "feat: add OrgEvents module (create, list, update, delete, category suggestions)"
```

---

## Task 12: OrgNotes module

**Files:**

- Create: `apps/api/src/modules/org-notes/entities/org-note.entity.ts`
- Create: `apps/api/src/modules/org-notes/dto/create-org-note.input.ts`
- Create: `apps/api/src/modules/org-notes/dto/update-org-note.input.ts`
- Create: `apps/api/src/modules/org-notes/org-notes.service.ts`
- Create: `apps/api/src/modules/org-notes/org-notes.service.spec.ts`
- Create: `apps/api/src/modules/org-notes/org-notes.resolver.ts`
- Create: `apps/api/src/modules/org-notes/org-notes.module.ts`
- Modify: `apps/api/src/app.module.ts`

- [ ] **Step 1: Create entity and DTOs**

Create `apps/api/src/modules/org-notes/entities/org-note.entity.ts`:

```typescript
import { ObjectType, Field, ID } from "@nestjs/graphql";

@ObjectType()
export class OrgNote {
  @Field(() => ID)
  id: string;

  @Field()
  orgId: string;

  @Field()
  body: string;

  @Field({ nullable: true })
  category?: string;

  @Field()
  createdById: string;

  @Field()
  createdAt: Date;

  @Field()
  updatedAt: Date;
}
```

Create `apps/api/src/modules/org-notes/dto/create-org-note.input.ts`:

```typescript
import { InputType, Field } from "@nestjs/graphql";
import { IsNotEmpty, IsOptional, IsString } from "class-validator";

@InputType()
export class CreateOrgNoteInput {
  @Field()
  @IsNotEmpty()
  @IsString()
  body: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  category?: string;
}
```

Create `apps/api/src/modules/org-notes/dto/update-org-note.input.ts`:

```typescript
import { InputType, Field } from "@nestjs/graphql";
import { IsOptional, IsString } from "class-validator";

@InputType()
export class UpdateOrgNoteInput {
  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  body?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  category?: string;
}
```

- [ ] **Step 2: Write failing service tests**

Create `apps/api/src/modules/org-notes/org-notes.service.spec.ts`:

```typescript
import { Test } from "@nestjs/testing";
import { OrgNotesService } from "./org-notes.service";
import { PrismaService } from "../../prisma/prisma.service";
import { ForbiddenException } from "@nestjs/common";

describe("OrgNotesService", () => {
  let service: OrgNotesService;
  let prisma: {
    orgNote: {
      create: jest.Mock;
      findMany: jest.Mock;
      findUnique: jest.Mock;
      update: jest.Mock;
      delete: jest.Mock;
    };
  };

  beforeEach(async () => {
    prisma = {
      orgNote: {
        create: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
    };
    const module = await Test.createTestingModule({
      providers: [
        OrgNotesService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();
    service = module.get(OrgNotesService);
  });

  it("creates a note scoped to the org", async () => {
    prisma.orgNote.create.mockResolvedValue({ id: "n1", orgId: "org1" });
    const result = await service.create(
      { body: "Morning round complete" },
      "org1",
      "user1",
    );
    expect(prisma.orgNote.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ orgId: "org1", createdById: "user1" }),
      }),
    );
    expect(result.orgId).toBe("org1");
  });

  it("returns notes in reverse-chronological order", async () => {
    prisma.orgNote.findMany.mockResolvedValue([]);
    await service.findAll("org1");
    expect(prisma.orgNote.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ orderBy: { createdAt: "desc" } }),
    );
  });

  it("throws ForbiddenException when deleting another orgs note", async () => {
    prisma.orgNote.findUnique.mockResolvedValue({
      id: "n1",
      orgId: "other-org",
    });
    await expect(service.remove("n1", "org1")).rejects.toThrow(
      ForbiddenException,
    );
  });
});
```

- [ ] **Step 3: Run test — expect failure**

```bash
pnpm --filter api test -- --testPathPattern="org-notes.service" --no-coverage
```

Expected: FAIL

- [ ] **Step 4: Implement OrgNotesService**

Create `apps/api/src/modules/org-notes/org-notes.service.ts`:

```typescript
import {
  Injectable,
  ForbiddenException,
  NotFoundException,
} from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { CreateOrgNoteInput } from "./dto/create-org-note.input";
import { UpdateOrgNoteInput } from "./dto/update-org-note.input";

@Injectable()
export class OrgNotesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(input: CreateOrgNoteInput, orgId: string, userId: string) {
    return this.prisma.orgNote.create({
      data: {
        orgId,
        createdById: userId,
        body: input.body,
        category: input.category,
      },
    });
  }

  async findAll(orgId: string, category?: string) {
    return this.prisma.orgNote.findMany({
      where: { orgId, ...(category ? { category } : {}) },
      orderBy: { createdAt: "desc" },
      include: {
        createdBy: { select: { id: true, firstName: true, lastName: true } },
      },
    });
  }

  async update(id: string, input: UpdateOrgNoteInput, orgId: string) {
    await this.assertOwnership(id, orgId);
    return this.prisma.orgNote.update({ where: { id }, data: input });
  }

  async remove(id: string, orgId: string) {
    await this.assertOwnership(id, orgId);
    await this.prisma.orgNote.delete({ where: { id } });
    return true;
  }

  private async assertOwnership(id: string, orgId: string) {
    const note = await this.prisma.orgNote.findUnique({ where: { id } });
    if (!note) throw new NotFoundException("Note not found");
    if (note.orgId !== orgId)
      throw new ForbiddenException("Note does not belong to this org");
  }
}
```

- [ ] **Step 5: Run tests — expect pass**

```bash
pnpm --filter api test -- --testPathPattern="org-notes.service" --no-coverage
```

Expected: PASS (3 tests)

- [ ] **Step 6: Create resolver and module, wire into AppModule**

Create `apps/api/src/modules/org-notes/org-notes.resolver.ts`:

```typescript
import { Resolver, Query, Mutation, Args, ID } from "@nestjs/graphql";
import { UseGuards } from "@nestjs/common";
import { GqlAuthGuard } from "../../common/guards/gql-auth.guard";
import {
  OrgRolesGuard,
  OrgRoles,
} from "../organisations/guards/org-roles.guard";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { ActiveOrg } from "../organisations/decorators/active-org.decorator";
import { OrgNotesService } from "./org-notes.service";
import { OrgNote } from "./entities/org-note.entity";
import { CreateOrgNoteInput } from "./dto/create-org-note.input";
import { UpdateOrgNoteInput } from "./dto/update-org-note.input";
import { OrgRole } from "../../generated/prisma/client";
import { User } from "../users/entities/user.entity";

@Resolver(() => OrgNote)
@UseGuards(GqlAuthGuard, OrgRolesGuard)
export class OrgNotesResolver {
  constructor(private readonly orgNotesService: OrgNotesService) {}

  @Mutation(() => OrgNote)
  @OrgRoles(OrgRole.ADMIN, OrgRole.OPERATOR)
  createOrgNote(
    @Args("input") input: CreateOrgNoteInput,
    @ActiveOrg() orgId: string,
    @CurrentUser() user: User,
  ) {
    return this.orgNotesService.create(input, orgId, user.id);
  }

  @Query(() => [OrgNote], { name: "orgNotes" })
  @OrgRoles(OrgRole.ADMIN, OrgRole.OPERATOR, OrgRole.VIEWER)
  findAll(
    @ActiveOrg() orgId: string,
    @Args("category", { nullable: true }) category?: string,
  ) {
    return this.orgNotesService.findAll(orgId, category);
  }

  @Mutation(() => OrgNote)
  @OrgRoles(OrgRole.ADMIN, OrgRole.OPERATOR)
  updateOrgNote(
    @Args("id", { type: () => ID }) id: string,
    @Args("input") input: UpdateOrgNoteInput,
    @ActiveOrg() orgId: string,
  ) {
    return this.orgNotesService.update(id, input, orgId);
  }

  @Mutation(() => Boolean)
  @OrgRoles(OrgRole.ADMIN, OrgRole.OPERATOR)
  removeOrgNote(
    @Args("id", { type: () => ID }) id: string,
    @ActiveOrg() orgId: string,
  ) {
    return this.orgNotesService.remove(id, orgId);
  }
}
```

Create `apps/api/src/modules/org-notes/org-notes.module.ts`:

```typescript
import { Module } from "@nestjs/common";
import { OrgNotesService } from "./org-notes.service";
import { OrgNotesResolver } from "./org-notes.resolver";
import { PrismaModule } from "../../prisma/prisma.module";
import { OrgRolesGuard } from "../organisations/guards/org-roles.guard";

@Module({
  imports: [PrismaModule],
  providers: [OrgNotesResolver, OrgNotesService, OrgRolesGuard],
})
export class OrgNotesModule {}
```

Add `OrgNotesModule` to `app.module.ts` imports.

- [ ] **Step 7: Run all backend tests**

```bash
pnpm --filter api test --no-coverage
```

Expected: All tests pass.

- [ ] **Step 8: Start the API and verify schema**

```bash
pnpm --filter api dev &
sleep 8
grep -q "createOrgNote\|orgUpcomingEvents\|createOrganisation\|switchOrgContext" apps/api/src/schema.gql && echo "SCHEMA COMPLETE"
pkill -f "nest start"
```

Expected: `SCHEMA COMPLETE`

- [ ] **Step 9: Commit**

```bash
git add apps/api/src/modules/org-notes/ apps/api/src/app.module.ts apps/api/src/schema.gql
git commit -m "feat: add OrgNotes module — complete backend for organisation accounts"
```
