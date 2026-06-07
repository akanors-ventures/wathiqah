# Personal Notes Design

**Date:** 2026-05-31
**Status:** Approved

## Overview

Add a personal notes feature to Wathiqah accounts — a general-purpose scratchpad for individual users, mirroring the existing `OrgNotes` module. Users can log anything: reminders, memorable personal milestones ("I made my first contract on 27-07-2026"), financial context, or general thoughts. Notes are standalone (not linked to transactions, contacts, or promises). FREE users are limited to 10 notes per month; PRO users are unlimited.

## Data Model

New `UserNote` Prisma model in `apps/api/prisma/schema.prisma`:

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

A `userNotes` relation must also be added to the `User` model.

**Fields:**
- `title` — short headline, required, makes scanning a note list fast
- `body` — full note content, required
- `category` — optional free-text tag for user-defined grouping (e.g. "finance", "reminders")

No foreign keys to other entities — notes are self-contained.

## Module Structure

```
apps/api/src/modules/user-notes/
├── dto/
│   ├── create-user-note.input.ts   # title, body, category?
│   └── update-user-note.input.ts   # PartialType(CreateUserNoteInput)
├── entities/
│   └── user-note.entity.ts         # mirrors OrgNote entity, adds title field
├── user-notes.module.ts
├── user-notes.resolver.ts
└── user-notes.service.ts
```

### Resolver (GraphQL operations)

| Operation | Type | Auth | Description |
|-----------|------|------|-------------|
| `createUserNote(input)` | Mutation | `GqlAuthGuard` | Create a note for the current user |
| `userNotes(category?)` | Query | `GqlAuthGuard` | List all notes for the current user, ordered by `createdAt desc`, optional category filter |
| `updateUserNote(id, input)` | Mutation | `GqlAuthGuard` | Update a note — asserts ownership before update |
| `removeUserNote(id)` | Mutation | `GqlAuthGuard` | Delete a note — asserts ownership before delete |

All operations are scoped to `@CurrentUser()` — no `ActiveOrg` or org-role guards needed.

### Service

- `create(input, userId)` — inserts a new `UserNote`
- `findAll(userId, category?)` — returns notes for the user, newest first
- `update(id, input, userId)` — calls `assertOwnership`, then updates
- `remove(id, userId)` — calls `assertOwnership`, then deletes
- `assertOwnership(id, userId)` — throws `NotFoundException` if not found, `ForbiddenException` if `note.userId !== userId`

## Subscription Limit

### `subscription.constants.ts`

Add `maxNotesPerMonth` to `TierLimits` interface and `SUBSCRIPTION_LIMITS`:

```ts
export interface TierLimits {
  // ...existing fields...
  maxNotesPerMonth: number;
}

export const SUBSCRIPTION_LIMITS: Record<SubscriptionTier, TierLimits> = {
  [SubscriptionTier.FREE]: {
    // ...existing...
    maxNotesPerMonth: 10,
  },
  [SubscriptionTier.PRO]: {
    // ...existing...
    maxNotesPerMonth: -1, // unlimited
  },
};
```

### Enforcement

The `createUserNote` mutation is decorated with `@CheckFeature('maxNotesPerMonth')` and `@UseInterceptors(FeatureLimitInterceptor)`. The existing interceptor:
1. Checks current monthly usage against the tier limit before execution
2. Increments `featureUsage` on the `User` record after successful creation

No new infrastructure is needed — the `featureUsage` JSON field and monthly key pattern (`maxNotesPerMonth_YYYY_MM`) already handle this.

## Database Migration

1. Edit `schema.prisma` to add `UserNote` model and `userNotes` relation on `User`
2. Run `pnpm --filter api db:generate` to regenerate Prisma client
3. Run `pnpm --filter api db:migrate` to generate Atlas migration
4. Run `pnpm --filter api db:apply` to apply locally and verify

## Out of Scope

- Entity linking (attaching notes to transactions, contacts, or promises) — can be added later if users request it
- A structural date field — users can mention dates in the note body
- Note search/full-text — not part of this iteration
