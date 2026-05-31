# Organisation Accounts — Design Spec

**Date:** 2026-05-31  
**Status:** Approved — ready for implementation planning  
**Origin:** [`docs/superpowers/ideas/organisation-accounts.md`](../ideas/organisation-accounts.md)  
**Primary use case:** Akanors Integrated Farm (Saki, Oyo State) and similar organisations — cooperatives, NGOs, microfinance agents, agri-businesses

---

## 1. Overview

Wathīqah currently supports only personal accounts. This feature adds **Organisation Accounts** — a multi-member workspace where all transactions, contacts, projects, promises, events, and notes are scoped to the organisation entity rather than any individual user.

The feature also introduces **Events & Notes** — a lightweight planning and record-keeping layer for organisations, with upcoming event tracking and timestamped freeform notes.

---

## 2. Decisions Made

| Question                         | Decision                                                                                                            | Rationale                                                                                            |
| -------------------------------- | ------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| Account model                    | **Profile switcher** (personal ↔ org in same session)                                                               | Mirrors Instagram/Slack UX; no separate login needed                                                 |
| Data separation                  | **Full isolation** — org contacts, transactions, projects, and notes are completely separate from personal records  | Prevents multi-staff privacy bleed; keeps audit trails clean for Musharakah and regulatory reporting |
| Personal → org contact promotion | **"Add to Org" action** on any personal contact card — creates a new org-scoped copy; personal contact is untouched | Avoids duplication without auto-sharing; personal and org records remain independent                 |
| Subscriptions                    | **Org-level PRO plan**, independent of any member's personal tier                                                   | Operators can be FREE personally but work inside a PRO org                                           |
| Transaction attribution          | **Admin-configurable** — default: org name only; optional: org name + operator name                                 | Works for farms (org-only) and cooperatives (with attribution)                                       |
| Events categories                | **Free-form string** with predefined suggestions                                                                    | Org vocabulary is self-defined; suggestions speed up common cases                                    |
| Notes                            | **Timestamped freeform entries** with optional category tags                                                        | Covers operational records, daily rounds, decisions — generalises beyond farms                       |

---

## 3. Data Model

### 3.1 New models

```prisma
model Organisation {
  id              String             @id @default(uuid())
  name            String
  slug            String             @unique   // URL-safe, e.g. "akanors-integrated-farm"
  description     String?
  logoUrl         String?
  industry        String?            // "Agriculture", "Cooperative", "NGO", etc.
  attributionMode AttributionMode    @default(ORG_ONLY)
  createdAt       DateTime           @default(now())
  updatedAt       DateTime           @updatedAt

  members         OrganisationMember[]
  contacts        Contact[]          @relation("OrgContacts")
  transactions    Transaction[]      @relation("OrgTransactions")
  projects        Project[]          @relation("OrgProjects")
  promises        Promise[]          @relation("OrgPromises")
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
  status             String           // active, trialing, past_due, canceled
  provider           String           // stripe, flutterwave
  externalId         String?          @unique
  currentPeriodEnd   DateTime?
  cancelAtPeriodEnd  Boolean          @default(false)
  createdAt          DateTime         @default(now())
  updatedAt          DateTime         @updatedAt

  organisation Organisation @relation(fields: [orgId], references: [id])

  @@map("org_subscriptions")
}

model OrgEvent {
  id             String       @id @default(uuid())
  orgId          String
  title          String
  date           DateTime
  endDate        DateTime?
  category       String       // free-form; predefined suggestions shown in UI
  notes          String?
  isRecurring    Boolean      @default(false)
  recurrence     String?      // "YEARLY" | "MONTHLY" — simple string
  createdById    String
  createdAt      DateTime     @default(now())
  updatedAt      DateTime     @updatedAt

  organisation   Organisation @relation(fields: [orgId], references: [id])
  createdBy      User         @relation(fields: [createdById], references: [id])

  @@index([orgId, date])
  @@map("org_events")
}

model OrgNote {
  id           String       @id @default(uuid())
  orgId        String
  body         String       // freeform text; no length cap at DB level
  category     String?      // optional free-form tag
  createdById  String
  createdAt    DateTime     @default(now())
  updatedAt    DateTime     @updatedAt

  organisation Organisation @relation(fields: [orgId], references: [id])
  createdBy    User         @relation(fields: [createdById], references: [id])

  @@index([orgId, createdAt])
  @@map("org_notes")
}
```

### 3.2 Additions to existing models

Each of `Transaction`, `Contact`, `Project`, and `Promise` gets an optional `orgId` column:

```prisma
// Added to Transaction, Contact, Project, Promise:
orgId  String?
org    Organisation? @relation(fields: [orgId], references: [id])
```

**Scoping rule (enforced in service layer):**

- `orgId IS NOT NULL` → record belongs to the org; visible only in org context
- `orgId IS NULL` → record is personal; visible only in personal context

### 3.3 New enums

```prisma
enum OrgRole {
  ADMIN     // manages members, billing, settings
  OPERATOR  // creates/edits transactions, events, notes
  VIEWER    // read-only access
}

enum AttributionMode {
  ORG_ONLY          // notifications show org name only
  ORG_AND_OPERATOR  // notifications show "org name (staff name)"
}
```

---

## 4. Authentication & Context

### 4.1 JWT extension

```typescript
interface JwtPayload {
  sub: string; // userId — always present
  activeOrgId?: string; // set when in org mode; absent in personal mode
}
```

### 4.2 New GraphQL mutations

```graphql
# Switch into an org context — issues new JWT pair with activeOrgId
switchOrgContext(orgId: String): AuthResponse   # orgId: null → return to personal

# Org management
createOrganisation(input: CreateOrganisationInput!): Organisation
updateOrganisation(id: ID!, input: UpdateOrganisationInput!): Organisation
inviteMember(orgId: ID!, email: String!, role: OrgRole!): OrganisationMember
updateMemberRole(memberId: ID!, role: OrgRole!): OrganisationMember
removeMember(memberId: ID!): Boolean
```

### 4.3 New decorator

```typescript
@ActiveOrg()  // reads activeOrgId from JWT context; returns null in personal mode
```

### 4.4 New guard

```typescript
@OrgRoles(OrgRole.ADMIN)  // restricts mutations to org members with given role(s)
```

### 4.5 Service scoping pattern

All existing service methods that list or create records are extended with an `orgId` parameter:

```typescript
findAll(userId: string, orgId: string | null) {
  return this.prisma.transaction.findMany({
    where: orgId
      ? { orgId }
      : { createdById: userId, orgId: null },
  });
}
```

Creation methods set `orgId` when present:

```typescript
create(userId: string, orgId: string | null, dto: CreateTransactionDto) {
  return this.prisma.transaction.create({
    data: { ...dto, createdById: userId, orgId: orgId ?? null },
  });
}
```

---

## 5. Backend Modules

### 5.1 New module: `OrganisationsModule`

**Files:**

- `organisations.module.ts`
- `organisations.resolver.ts` — GraphQL queries/mutations
- `organisations.service.ts` — business logic
- `dto/create-organisation.input.ts`
- `dto/update-organisation.input.ts`
- `dto/invite-member.input.ts`
- `entities/organisation.entity.ts`
- `entities/organisation-member.entity.ts`
- `guards/org-roles.guard.ts`
- `decorators/active-org.decorator.ts`

### 5.2 New module: `OrgEventsModule`

**Files:**

- `org-events.module.ts`
- `org-events.resolver.ts`
- `org-events.service.ts`
- `dto/create-org-event.input.ts`
- `dto/update-org-event.input.ts`
- `entities/org-event.entity.ts`

**Predefined category suggestions** (returned by a `orgEventCategorySuggestions` query — not enforced):
`Vaccination`, `Breeding`, `Islamic Calendar`, `Regulatory`, `Commercial`

### 5.3 New module: `OrgNotesModule`

**Files:**

- `org-notes.module.ts`
- `org-notes.resolver.ts`
- `org-notes.service.ts`
- `dto/create-org-note.input.ts`
- `dto/update-org-note.input.ts`
- `entities/org-note.entity.ts`

### 5.4 Modules to update (add orgId scoping)

| Module                | Changes                                                                                   |
| --------------------- | ----------------------------------------------------------------------------------------- |
| `TransactionsModule`  | `findAll`, `create`, `update`, `delete` — add `orgId` param; resolver uses `@ActiveOrg()` |
| `ContactsModule`      | Same scoping pattern; add `promoteToOrg(contactId, orgId)` mutation                       |
| `ProjectsModule`      | Same scoping pattern                                                                      |
| `PromisesModule`      | Same scoping pattern                                                                      |
| `WitnessesModule`     | Witnesses reference transactions — no direct org scoping needed; inherits via transaction |
| `NotificationsModule` | Apply `AttributionMode` when building notification messages                               |
| `AuthModule`          | `switchOrgContext` mutation; validate membership before issuing org JWT                   |
| `SubscriptionModule`  | Add `OrgSubscription` queries/mutations; org tier check in feature gates                  |

---

## 6. Frontend

### 6.1 Account Switcher (Header)

**Personal mode:** Header shows a context trigger pill — `[FA] Fawaz A. · Personal ▾`. Clicking opens a dropdown with the personal account (checked), a list of orgs the user belongs to, and a "Create organisation" action.

**Org mode:** Header tints to a subtle blue. An org name badge appears next to the logo. The context trigger pill turns blue — `[AI] Akanors Farm · Organisation ▾`. Two new nav links appear: **Events** and **Members** (visible to Admin and Operator only).

### 6.2 New routes

| Route                     | Description                          | Access                              |
| ------------------------- | ------------------------------------ | ----------------------------------- |
| `/org/create`             | Create a new organisation            | Any authenticated user              |
| `/org/:slug`              | Org dashboard (home)                 | Org members                         |
| `/org/:slug/settings`     | Org profile, attribution mode        | Admin only                          |
| `/org/:slug/members`      | Member list, invite, role management | Admin only                          |
| `/org/:slug/events`       | Events (Upcoming tab) + Notes tab    | Admin, Operator (Viewer: read-only) |
| `/org/:slug/subscription` | Org billing and plan                 | Admin only                          |

### 6.3 Org Dashboard (`/org/:slug`)

**Hero bar:** Dark gradient with org name, description, industry tag, PRO badge, member count. Admin actions: **Settings** and **+ New Transaction**.

**Stats row (4 tiles):** Total transactions · Contacts · Upcoming events (with count for this week) · Active projects.

**Main column:** Quick action buttons (Record transaction, Add event, Add contact, Invite member) + recent transactions feed.

**Side column:** Upcoming events widget (next 3–5, colour-coded by category) + org member list.

### 6.4 Events & Notes page (`/org/:slug/events`)

**Two tabs:** Upcoming | Notes

**Upcoming tab:**

- Events grouped by time horizon: This week / This month / Upcoming
- Each event row: date box, title, notes excerpt, category chip (colour-coded), optional recurrence marker (↻), countdown badge
- Right sidebar: category filter (all + per-category counts)
- Always-visible header buttons: **✎ Add Note** | **+ Add Event**

**Notes tab:**

- Reverse-chronological feed of timestamped entries
- Each entry: date, author name + time, freeform body (supports line breaks, bold via markdown-lite), optional category tags
- "Write a note…" prompt pinned at top
- Right sidebar: filter by category + filter by member

**Category input (both events and notes):**  
Free-form text input with autocomplete suggestions: `Vaccination`, `Breeding`, `Islamic Calendar`, `Regulatory`, `Commercial`, plus any previously used custom categories from the same org.

### 6.5 Member management (`/org/:slug/members`)

List of current members with avatar, name, role badge, and role-change dropdown (Admin only). Invite form: email + role selector. Pending invitations shown separately.

### 6.6 Context-aware data

All Apollo queries inside an org context include `orgId` as a variable. The `switchOrgContext` mutation stores the new JWT in the same auth storage; Apollo Client refetches active queries automatically on token change.

---

## 7. Notifications

When a transaction is created under an org:

- `AttributionMode.ORG_ONLY` → SMS/notification reads: _"Akanors Integrated Farm recorded a transaction of ₦120,000…"_
- `AttributionMode.ORG_AND_OPERATOR` → reads: _"Akanors Integrated Farm (Akeem Salawu) recorded a transaction of ₦120,000…"_

Default is `ORG_ONLY`. Configurable by Admin in org settings.

---

## 8. Onboarding Flow

1. Any authenticated user can click **"Create organisation"** from the account switcher dropdown.
2. A short form collects: org name (auto-generates slug), industry (optional), description (optional).
3. The creating user becomes the sole **Admin** of the new org.
4. On creation, the user is immediately switched into the org context (new JWT issued).
5. A welcome prompt on the org dashboard guides them to: invite members → add first contact → record first transaction.

Existing personal accounts are never converted. An org is always a separate entity created alongside.

---

## 9. Access Control Summary

| Action                                | Admin | Operator | Viewer |
| ------------------------------------- | ----- | -------- | ------ |
| View transactions, contacts, projects | ✓     | ✓        | ✓      |
| Create / edit transactions, contacts  | ✓     | ✓        | —      |
| Create / edit events and notes        | ✓     | ✓        | —      |
| Invite / remove members               | ✓     | —        | —      |
| Change member roles                   | ✓     | —        | —      |
| Update org settings                   | ✓     | —        | —      |
| Manage org subscription               | ✓     | —        | —      |

---

## 10. Out of Scope (this iteration)

- Org-level witness rules (witnesses are still personal Wathīqah users)
- Cross-org transactions (shared ledger between two orgs)
- Org public profile / discovery
- Org-level SMS quota pool (deferred — org subscription tier gates features; SMS quota remains per-user for now)
- Event reminders / push notifications for upcoming events (deferred to follow-up)
- Rich text / markdown in notes body (plain text with line breaks only for v1)

---

## 11. Migration

1. Add `orgId String?` column to `transactions`, `contacts`, `projects`, `promises` tables via Atlas migration (`NOT VALID` FK pattern as per project conventions).
2. Create new tables: `organisations`, `organisation_members`, `org_subscriptions`, `org_events`, `org_notes`.
3. No data migration required — all existing rows remain personal (`orgId = null`).
4. Regenerate Prisma client after schema changes.

---

## 12. Related

- [`docs/superpowers/ideas/organisation-accounts.md`](../ideas/organisation-accounts.md) — original idea capture
- `RAPI integration` — primary driver for multi-member org context
- `COLLECTED` / `DISBURSED` transaction types — natural fit for org/agent use cases
- `apps/api/prisma/schema.prisma` — base schema to extend
- `apps/api/src/modules/auth/` — JWT and guard patterns to follow
