# Personal Notes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a personal notes feature where authenticated users can CRUD their own notes (title + body + optional category), limited to 10 notes/month on the FREE tier and unlimited on PRO.

**Architecture:** Mirror the existing `org-notes` module exactly — a `UserNote` Prisma model owned by `userId`, a `user-notes` NestJS module with service/resolver/entity/DTOs, and the `maxNotesPerMonth` limit wired into `TierLimits` and enforced via the existing `@CheckFeature` + `FeatureLimitInterceptor` pattern. `SubscriptionModule` is `@Global()` so no extra module import is needed.

**Tech Stack:** NestJS, GraphQL (code-first), Prisma 7, PostgreSQL, Atlas migrations, Jest

---

## File Map

| Action | Path |
|--------|------|
| Modify | `apps/api/prisma/schema.prisma` |
| Modify | `apps/api/src/modules/subscription/subscription.constants.ts` |
| Modify | `apps/api/src/modules/subscription/subscription.constants.spec.ts` |
| Create | `apps/api/src/modules/user-notes/entities/user-note.entity.ts` |
| Create | `apps/api/src/modules/user-notes/dto/create-user-note.input.ts` |
| Create | `apps/api/src/modules/user-notes/dto/update-user-note.input.ts` |
| Create | `apps/api/src/modules/user-notes/user-notes.service.ts` |
| Create | `apps/api/src/modules/user-notes/user-notes.service.spec.ts` |
| Create | `apps/api/src/modules/user-notes/user-notes.resolver.ts` |
| Create | `apps/api/src/modules/user-notes/user-notes.module.ts` |
| Modify | `apps/api/src/app.module.ts` |

---

## Task 1: Database Schema

**Files:**
- Modify: `apps/api/prisma/schema.prisma`

- [ ] **Step 1: Add `userNotes` relation to the `User` model**

In `schema.prisma`, find the `User` model. After the `orgNotesCreated` line, add:

```prisma
  userNotes                  UserNote[]
```

The block should now end with:

```prisma
  orgNotesCreated            OrgNote[]            @relation("OrgNoteCreator")
  userNotes                  UserNote[]

  @@index([phoneNumber])
  @@map("users")
}
```

- [ ] **Step 2: Add the `UserNote` model at the end of the schema**

Append after the last model in `schema.prisma`:

```prisma
model UserNote {
  id        String   @id @default(uuid())
  userId    String
  title     String
  body      String
  category  String?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  user      User     @relation(fields: [userId], references: [id])

  @@index([userId, createdAt])
  @@map("user_notes")
}
```

- [ ] **Step 3: Regenerate the Prisma client**

Run from the repo root:

```bash
pnpm --filter api db:generate
```

Expected: exits 0, regenerates `apps/api/src/generated/prisma/`.

- [ ] **Step 4: Generate the Atlas migration**

Run from the repo root:

```bash
pnpm --filter api db:migrate
```

Expected: a new migration file created under `apps/api/atlas/migrations/`.

- [ ] **Step 5: Apply the migration locally**

```bash
pnpm --filter api db:apply
```

Expected: exits 0 with zero errors. If it errors, stop and investigate before continuing.

- [ ] **Step 6: Commit**

```bash
git add apps/api/prisma/schema.prisma apps/api/src/generated apps/api/atlas
git commit -m "feat: add UserNote model and migration"
```

---

## Task 2: Subscription Limit

**Files:**
- Modify: `apps/api/src/modules/subscription/subscription.constants.ts`
- Modify: `apps/api/src/modules/subscription/subscription.constants.spec.ts`

- [ ] **Step 1: Write the failing tests first**

Add to the bottom of `subscription.constants.spec.ts`:

```ts
  it('defines maxNotesPerMonth on TierLimits interface', () => {
    const freeLimits: TierLimits = SUBSCRIPTION_LIMITS[SubscriptionTier.FREE];
    expect(typeof freeLimits.maxNotesPerMonth).toBe('number');
  });

  it('sets FREE tier maxNotesPerMonth to 10', () => {
    expect(SUBSCRIPTION_LIMITS[SubscriptionTier.FREE].maxNotesPerMonth).toBe(10);
  });

  it('sets PRO tier maxNotesPerMonth to -1 (unlimited)', () => {
    expect(SUBSCRIPTION_LIMITS[SubscriptionTier.PRO].maxNotesPerMonth).toBe(-1);
  });
```

- [ ] **Step 2: Run the tests to confirm they fail**

```bash
pnpm --filter api test subscription.constants
```

Expected: 3 new tests FAIL with "Property 'maxNotesPerMonth' does not exist".

- [ ] **Step 3: Add `maxNotesPerMonth` to `TierLimits` and `SUBSCRIPTION_LIMITS`**

Replace the contents of `subscription.constants.ts` with:

```ts
import { SubscriptionTier } from '../../generated/prisma/enums';

export { SubscriptionTier };

export interface TierLimits {
  maxContacts: number;
  maxWitnessesPerMonth: number;
  contactNotificationSms: number;
  allowSMS: boolean;
  allowAdvancedAnalytics: boolean;
  allowProfessionalReports: boolean;
  maxNotesPerMonth: number;
}

export const SUBSCRIPTION_LIMITS: Record<SubscriptionTier, TierLimits> = {
  [SubscriptionTier.FREE]: {
    maxContacts: 50,
    maxWitnessesPerMonth: 10,
    contactNotificationSms: 10,
    allowSMS: false,
    allowAdvancedAnalytics: false,
    allowProfessionalReports: false,
    maxNotesPerMonth: 10,
  },
  [SubscriptionTier.PRO]: {
    maxContacts: -1,
    maxWitnessesPerMonth: -1,
    contactNotificationSms: -1,
    allowSMS: true,
    allowAdvancedAnalytics: true,
    allowProfessionalReports: true,
    maxNotesPerMonth: -1,
  },
};
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
pnpm --filter api test subscription.constants
```

Expected: all tests PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/modules/subscription/subscription.constants.ts \
        apps/api/src/modules/subscription/subscription.constants.spec.ts
git commit -m "feat: add maxNotesPerMonth to subscription limits"
```

---

## Task 3: Entity and DTOs

**Files:**
- Create: `apps/api/src/modules/user-notes/entities/user-note.entity.ts`
- Create: `apps/api/src/modules/user-notes/dto/create-user-note.input.ts`
- Create: `apps/api/src/modules/user-notes/dto/update-user-note.input.ts`

- [ ] **Step 1: Create the entity**

Create `apps/api/src/modules/user-notes/entities/user-note.entity.ts`:

```ts
import { ObjectType, Field, ID } from '@nestjs/graphql';

@ObjectType()
export class UserNote {
  @Field(() => ID)
  id: string;

  @Field()
  userId: string;

  @Field()
  title: string;

  @Field()
  body: string;

  @Field({ nullable: true })
  category?: string;

  @Field()
  createdAt: Date;

  @Field()
  updatedAt: Date;
}
```

- [ ] **Step 2: Create the create input DTO**

Create `apps/api/src/modules/user-notes/dto/create-user-note.input.ts`:

```ts
import { InputType, Field } from '@nestjs/graphql';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

@InputType()
export class CreateUserNoteInput {
  @Field()
  @IsNotEmpty()
  @IsString()
  title: string;

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

- [ ] **Step 3: Create the update input DTO**

Create `apps/api/src/modules/user-notes/dto/update-user-note.input.ts`:

```ts
import { InputType, Field } from '@nestjs/graphql';
import { IsOptional, IsString } from 'class-validator';

@InputType()
export class UpdateUserNoteInput {
  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  title?: string;

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

- [ ] **Step 4: Commit**

```bash
git add apps/api/src/modules/user-notes
git commit -m "feat: add UserNote entity and DTOs"
```

---

## Task 4: Service and Tests

**Files:**
- Create: `apps/api/src/modules/user-notes/user-notes.service.ts`
- Create: `apps/api/src/modules/user-notes/user-notes.service.spec.ts`

- [ ] **Step 1: Write the failing tests**

Create `apps/api/src/modules/user-notes/user-notes.service.spec.ts`:

```ts
import { Test } from '@nestjs/testing';
import { UserNotesService } from './user-notes.service';
import { PrismaService } from '../../prisma/prisma.service';
import { ForbiddenException, NotFoundException } from '@nestjs/common';

describe('UserNotesService', () => {
  let service: UserNotesService;
  let prisma: {
    userNote: {
      create: jest.Mock;
      findMany: jest.Mock;
      findUnique: jest.Mock;
      update: jest.Mock;
      delete: jest.Mock;
    };
  };

  beforeEach(async () => {
    prisma = {
      userNote: {
        create: jest.fn(),
        findMany: jest.fn().mockResolvedValue([]),
        findUnique: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
    };
    const module = await Test.createTestingModule({
      providers: [
        UserNotesService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();
    service = module.get(UserNotesService);
  });

  it('creates a note scoped to the user', async () => {
    prisma.userNote.create.mockResolvedValue({ id: 'n1', userId: 'user1' });

    const result = await service.create(
      { title: 'First contract', body: 'I signed my first contract today', category: 'milestones' },
      'user1',
    );

    expect(prisma.userNote.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ userId: 'user1', title: 'First contract' }),
      }),
    );
    expect(result.userId).toBe('user1');
  });

  it('returns notes sorted by createdAt descending', async () => {
    await service.findAll('user1');
    expect(prisma.userNote.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ orderBy: { createdAt: 'desc' } }),
    );
  });

  it('filters by category when provided', async () => {
    await service.findAll('user1', 'milestones');
    expect(prisma.userNote.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: 'user1', category: 'milestones' },
      }),
    );
  });

  it('throws ForbiddenException when deleting another users note', async () => {
    prisma.userNote.findUnique.mockResolvedValue({ id: 'n1', userId: 'other-user' });
    await expect(service.remove('n1', 'user1')).rejects.toThrow(ForbiddenException);
  });

  it('throws NotFoundException when note does not exist', async () => {
    prisma.userNote.findUnique.mockResolvedValue(null);
    await expect(service.remove('n1', 'user1')).rejects.toThrow(NotFoundException);
  });
});
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
pnpm --filter api test user-notes.service
```

Expected: FAIL with "Cannot find module './user-notes.service'".

- [ ] **Step 3: Implement the service**

Create `apps/api/src/modules/user-notes/user-notes.service.ts`:

```ts
import {
  Injectable,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateUserNoteInput } from './dto/create-user-note.input';
import { UpdateUserNoteInput } from './dto/update-user-note.input';

@Injectable()
export class UserNotesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(input: CreateUserNoteInput, userId: string) {
    return this.prisma.userNote.create({
      data: {
        userId,
        title: input.title,
        body: input.body,
        category: input.category,
      },
    });
  }

  async findAll(userId: string, category?: string) {
    return this.prisma.userNote.findMany({
      where: { userId, ...(category ? { category } : {}) },
      orderBy: { createdAt: 'desc' },
    });
  }

  async update(id: string, input: UpdateUserNoteInput, userId: string) {
    await this.assertOwnership(id, userId);
    return this.prisma.userNote.update({ where: { id }, data: input });
  }

  async remove(id: string, userId: string) {
    await this.assertOwnership(id, userId);
    await this.prisma.userNote.delete({ where: { id } });
    return true;
  }

  private async assertOwnership(id: string, userId: string) {
    const note = await this.prisma.userNote.findUnique({ where: { id } });
    if (!note) throw new NotFoundException('Note not found');
    if (note.userId !== userId)
      throw new ForbiddenException('Note does not belong to this user');
  }
}
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
pnpm --filter api test user-notes.service
```

Expected: all 5 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/modules/user-notes/user-notes.service.ts \
        apps/api/src/modules/user-notes/user-notes.service.spec.ts
git commit -m "feat: add UserNotesService"
```

---

## Task 5: Resolver

**Files:**
- Create: `apps/api/src/modules/user-notes/user-notes.resolver.ts`

- [ ] **Step 1: Create the resolver**

Create `apps/api/src/modules/user-notes/user-notes.resolver.ts`:

```ts
import { Resolver, Query, Mutation, Args, ID } from '@nestjs/graphql';
import { UseGuards, UseInterceptors } from '@nestjs/common';
import { GqlAuthGuard } from '../../common/guards/gql-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserNotesService } from './user-notes.service';
import { UserNote } from './entities/user-note.entity';
import { CreateUserNoteInput } from './dto/create-user-note.input';
import { UpdateUserNoteInput } from './dto/update-user-note.input';
import { CheckFeature } from '../subscription/decorators/check-feature.decorator';
import { FeatureLimitInterceptor } from '../subscription/interceptors/feature-limit.interceptor';
import { User } from '../users/entities/user.entity';

@Resolver(() => UserNote)
@UseGuards(GqlAuthGuard)
export class UserNotesResolver {
  constructor(private readonly userNotesService: UserNotesService) {}

  @Mutation(() => UserNote)
  @CheckFeature('maxNotesPerMonth')
  @UseInterceptors(FeatureLimitInterceptor)
  createUserNote(
    @Args('input') input: CreateUserNoteInput,
    @CurrentUser() user: User,
  ) {
    return this.userNotesService.create(input, user.id);
  }

  @Query(() => [UserNote], { name: 'userNotes' })
  findAll(
    @CurrentUser() user: User,
    @Args('category', { nullable: true }) category?: string,
  ) {
    return this.userNotesService.findAll(user.id, category);
  }

  @Mutation(() => UserNote)
  updateUserNote(
    @Args('id', { type: () => ID }) id: string,
    @Args('input') input: UpdateUserNoteInput,
    @CurrentUser() user: User,
  ) {
    return this.userNotesService.update(id, input, user.id);
  }

  @Mutation(() => Boolean)
  removeUserNote(
    @Args('id', { type: () => ID }) id: string,
    @CurrentUser() user: User,
  ) {
    return this.userNotesService.remove(id, user.id);
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/api/src/modules/user-notes/user-notes.resolver.ts
git commit -m "feat: add UserNotesResolver with subscription limit guard"
```

---

## Task 6: Module Registration and Final Verification

**Files:**
- Create: `apps/api/src/modules/user-notes/user-notes.module.ts`
- Modify: `apps/api/src/app.module.ts`

- [ ] **Step 1: Create the module**

Create `apps/api/src/modules/user-notes/user-notes.module.ts`:

```ts
import { Module } from '@nestjs/common';
import { UserNotesService } from './user-notes.service';
import { UserNotesResolver } from './user-notes.resolver';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [UserNotesResolver, UserNotesService],
})
export class UserNotesModule {}
```

Note: `SubscriptionModule` is `@Global()` so `FeatureLimitInterceptor` resolves from the global DI context — no explicit import needed here.

- [ ] **Step 2: Register in AppModule**

In `apps/api/src/app.module.ts`, add the import statement alongside the other module imports (near the `OrgNotesModule` import):

```ts
import { UserNotesModule } from './modules/user-notes/user-notes.module';
```

And add `UserNotesModule` to the `imports` array (near `OrgNotesModule`):

```ts
OrgNotesModule,
UserNotesModule,
```

- [ ] **Step 3: Run the full test suite**

```bash
pnpm --filter api test
```

Expected: all existing tests still pass, new tests pass. Zero failures.

- [ ] **Step 4: Start the backend to regenerate schema.gql**

```bash
pnpm --filter api dev
```

Wait for "NestJS application started" log, then stop (`Ctrl+C`). This regenerates `apps/api/src/schema.gql` with the new `UserNote` types.

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/modules/user-notes/user-notes.module.ts \
        apps/api/src/app.module.ts \
        apps/api/src/schema.gql
git commit -m "feat: register UserNotesModule and regenerate GraphQL schema"
```
