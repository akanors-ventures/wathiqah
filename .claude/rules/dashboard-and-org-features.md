# Dashboard, Org-Scoping & Notes/Shared-Access Features

Loads when touching the dashboard stat cards, org-vs-personal scoping on any resolver, Personal/Org Notes, or Shared (legacy/estate) Access.

## Dashboard Stat Cards

`components/dashboard/Dashboard.tsx` is the single unified dashboard for both personal and org mode (`isOrgMode` from `useOrgContext()`). The financial stats row differs by mode:

**Personal mode** — exactly 4 cards: Total Balance (net contact-obligation, always all-time), Cash Position (personal income minus expenses, no org equivalent), Inflow (period-filtered), Outflow (period-filtered).

**Org mode** — exactly 3 cards (no Cash Position — it's explicitly personal-only data, hiding it avoids showing the admin's own personal finances on what's meant to be the org's view): Total Balance, Inflow, Outflow.

Do not add a fifth card or duplicate Cash Position in personal mode, and do not show Cash Position in org mode. Layout: Total Balance (and Cash Position, in personal mode) span full width below `lg`; Inflow and Outflow are always side-by-side. The grid is `lg:grid-cols-4` in personal mode, `lg:grid-cols-3` in org mode.

## Org-Scoped vs Personal-Only Features

Backend resolvers that accept `@ActiveOrg() orgId: string | null` (Transactions, Contacts, Promises, Projects) automatically scope to the active org's data when an org JWT is present, and to the user's personal data otherwise — **same route, same query, no frontend branching needed**.

Features with **no org-scoping at all** (always the individual user's own data, regardless of active org): Witness requests, Personal Entries (Cash Position), Personal Notes.

`Header.tsx`'s nav dropdowns (desktop) and `mobile-bottom-nav.tsx` (mobile) must stay aligned on this: Transactions/Ledger, Contacts, Promises, Projects, and Witnesses are reachable in both modes; personal Notes is hidden in org mode; Events & Notes/Members/Org Settings are org-mode-only.

**Checklist when adding org-membership access control to a resource**: it's not enough to scope the _list_ query by `orgId` — grep every other method on that service (`findOne`, `update`, `remove`, and sub-actions like `addWitness`) for a stale creator-only check, and check every _indirect_ caller too (e.g. `ProjectContactLinkService` wrapping `TransactionsService`). A resource that lists correctly for all org members but 403s on open/edit/delete for non-creators is the signature of this gap — caught by ultrareview after the fact in the shared-contacts PR, not by initial implementation or tests.

## Personal Notes (`/notes` route)

Route: `apps/web/src/routes/notes.tsx`. Backend module: `apps/api/src/modules/notes/`.

A personal journal — users document anything they want (events, milestones, activities), not limited to financial activity.

- Fields: optional `title`, required `body`, optional `category`
- Free tier: 5 notes lifetime max (checked against DB count via `@CheckFeature('maxNotes')` on `createNote` resolver). UI shows usage indicator and disables the form with an upgrade prompt at the limit.
- Pro tier: unlimited (`maxNotes: -1` in `subscription.constants.ts`)
- Nav placement: Header "Network" dropdown (desktop) and mobile More sheet
- The limit field is `maxNotes` in both `TierLimits` interface and `SUBSCRIPTION_LIMITS` — not `maxNotesPerMonth` (that name is stale and does not exist)

## Org Notes (`/org/:orgId/notes` route)

Same journal concept as personal notes but scoped to a specific organisation. The `title` field (`string?`) is wired end-to-end: backend `CreateNoteInput`/`UpdateNoteInput` both declare `title?: string`; `Note` entity exposes `title` as an optional `@Field`; `createNote`/`updateNote` both pass `title: input.title`; frontend `NoteFormValues` includes `title?: string`, edit pre-populates it, `note-entry.tsx` renders it conditionally.

## Shared Access — Purpose and Gating

**Intent**: Legacy/estate access — users pre-grant trusted contacts (family, executors) read-only access to their records so those records can be reviewed if the user is deceased or incapacitated.

**Gate rules**: Granting access (`grantAccess`) → free. Accepting a grant (`acceptAccess`) → free. Viewing records (`getSharedData` → `sharedData` query) → **viewer must be Pro**.

**Implementation** (`shared-access.service.ts`, `getSharedData`): after verifying the grant is `ACCEPTED` and the caller is the correct recipient, look up the viewer's user record by email and check `viewer.tier !== SubscriptionTier.PRO`. Throw `ForbiddenException('You need a Pro subscription to view shared records.')` if not Pro. The granter's tier is irrelevant.

**Frontend locked state** (`routes/shared-access/view.$grantId.tsx`): detects `error.message.includes('Pro subscription')`, shows heading "Pro subscription required" with viewer-centric body copy and an "Upgrade to Pro" CTA linking to `/pricing` (with `search={{ reason: undefined }}`).
