# Organisation Accounts Implementation — Checkpoint 1

**Date:** 2026-05-31  
**Status:** Backend complete, frontend 50% complete  
**Branch:** `fawaz/nice-ptolemy-dd0f9a`  
**Working Directory:** `/Users/fawazabdganiyu/akanors-ventures/apps/wathiqah/.claude/worktrees/nice-ptolemy-dd0f9a`

---

## Progress Summary

### ✅ Backend: 100% Complete (BE-1 through BE-12)

**Test Status:** 140/140 passing across 24 test suites

**Key Commits:**

- `f652eb9` + `1280f73` — DB migration + Prisma schema + userId index
- `f958d25` + `efd8bb1` — @ActiveOrg decorator + @OrgRoles guard (with enum fixes)
- `c97f3f5` — Organisation entities + DTOs
- `a99c3cb` + `0827ca9` — OrganisationsService (with security fixes: admin-before-email-lookup, org membership check)
- `1070de5` + `3bb53c8` — switchOrgContext mutation (with setCookies + tests)
- `3ae9c98` + `89756cb` — OrganisationsResolver + Module wiring (with access control fixes)
- `36bcbcf` + `4279c90` — Transactions scoped to org context (with test fixes)
- `84a83c6` — Contacts scoped to org context
- `7c0ee91` + `3d8a7f2` — Projects + Promises scoped (with promises org-access fixes)
- `b4e5c21` — Notification attribution mode
- `8f2d9a3` — OrgEvents module (TDD)
- `4dfd722` — OrgNotes module (TDD)

**What Works:**

- ✅ Database schema with 5 new tables + orgId on existing models
- ✅ JWT extension with `activeOrgId` field
- ✅ `@ActiveOrg()` decorator + `@OrgRoles()` guard
- ✅ Organisation CRUD, member management (invite/role/remove)
- ✅ `switchOrgContext` mutation (issues new JWT, sets cookies, validates membership)
- ✅ All modules scoped: Transactions, Contacts, Projects, Promises (org vs personal)
- ✅ Notification attribution mode (ORG_ONLY / ORG_AND_OPERATOR)
- ✅ Events module: create, list (upcoming/all), update, delete, category suggestions
- ✅ Notes module: create, list (reverse-chron), update, delete, category filter

**Security Fixes Applied:**

1. `inviteMember` — assertAdmin before user lookup (prevents email enumeration)
2. `promoteContactToOrg` — org membership check (was missing)
3. `findOrganisation` — member-only access (was public)
4. `promoteContactToOrg` resolver — added @OrgRoles(ADMIN, OPERATOR) guard
5. Promises `updateOverduePromises` — scoped to org context
6. Promises `findOne/update/remove` — allow org member access (was user-only)

### ✅ Frontend: 50% Complete (FE-1 through FE-4)

**Test Status:** Frontend has no test suite (integration/E2E deferred)

**Key Commits:**

- `ed90de0` — GQL queries + mutations + codegen (also fixed backend missing @ResolveField for members)
- `ca0699c` — OrgContext provider + useActiveOrg hook
- `d08ec6e` — AccountSwitcher + Header update (org mode tint, Events/Members nav)
- `f5b8240` + `6e8ec9c` — Create Organisation page

**What Works:**

- ✅ All GraphQL queries/mutations typed and ready (`apps/web/src/lib/apollo/queries/organisations.ts`)
- ✅ OrgContext manages active org state, localStorage persistence, JWT switching, Apollo refetch
- ✅ AccountSwitcher dropdown in Header (personal ↔ org switching)
- ✅ Header shows org mode: blue tint, org badge, Events/Members nav links
- ✅ `/org/create` route: form → createOrganisation → switchToOrg → navigate

---

## Remaining Work (4 tasks)

### FE-5: Org Dashboard + OrgHero + OrgStatsRow

**Files to create:**

- `apps/web/src/components/org/org-hero.tsx`
- `apps/web/src/components/org/org-stats-row.tsx`
- `apps/web/src/routes/org/$slug/index.tsx`

**What to build:**

- Hero bar: dark gradient, org name/description, PRO badge, Settings + New Transaction buttons (admin only)
- Stats row: 4 tiles (transactions count, contacts count, upcoming events count, active projects count)
- Main area: quick action buttons (4 tiles) + upcoming events preview widget
- Note: Transaction/contact/project counts need their own queries (not in current plan — add `orgTransactionsCount`, `orgContactsCount`, `orgProjectsCount` queries or leave as 0 placeholder)

**Dependencies:** OrgContext (done), Header (done)

### FE-6: Events & Notes Page

**Files to create:**

- `apps/web/src/components/org/event-card.tsx`
- `apps/web/src/components/org/note-entry.tsx`
- `apps/web/src/routes/org/$slug/events.tsx`

**What to build:**

- Two tabs: Upcoming | Notes
- **Upcoming tab:** Events grouped by "This week", "This month", "Upcoming" using `isThisWeek`/`isThisMonth` from `date-fns`
- Each event card: date box, title, category chip (colour-coded per category), countdown badge, optional recurrence marker
- Right sidebar: category filter (All + counts per category from `orgEventCategorySuggestions`)
- **Notes tab:** Reverse-chron feed, "Write a note…" prompt at top, category filter sidebar
- Dialogs/modals for create/edit (not in plan — use inline forms or skip for v1)

**Dependencies:** OrgContext (done)

### FE-7: Member Management Page

**Files to create:**

- `apps/web/src/components/org/member-row.tsx`
- `apps/web/src/routes/org/$slug/members.tsx`

**What to build:**

- Member list with avatar, name, email, role badge
- Role dropdown (admin-only, changes role via `updateMemberRole`)
- Remove button (admin-only, calls `removeMember`)
- Invite dialog: email + role selector → `inviteMember` mutation
- Show "You" badge for current user
- Only admins see the Invite button and role/remove controls

**Dependencies:** OrgContext (done), `myOrganisations` query includes members array

### FE-8: Org Settings Page

**Files to create:**

- `apps/web/src/routes/org/$slug/settings.tsx`

**What to build:**

- Form with org profile fields: name, industry, description
- Attribution mode selector: ORG_ONLY / ORG_AND_OPERATOR (Select component)
- Save button → `updateOrganisation` mutation
- Admin-only route (check role in beforeLoad or via guard)

**Dependencies:** OrgContext (done), `updateOrganisation` mutation (ready)

---

## Known Issues / Decisions

### Deferred to Follow-Up

1. **Org deletion** — No cascade-on-delete in DB schema. Org records cannot be deleted without manual SQL cleanup. Tracked but not blocking v1.
2. **`refreshToken` drops `activeOrgId`** — Token refresh silently returns user to personal mode. Architectural limitation noted in BE-5 review; requires either persisting `activeOrgId` in refresh token or DB-stored session. Not blocking — user can re-switch after refresh.
3. **Transaction `findAll` with linked contact in org mode** — The shared-ledger OR branch does not include `orgId` filter. May inadvertently surface counterpart's transactions from other orgs. Pre-existing logic; flagged in BE-7 review; low-priority fix.
4. **Org stats counts (dashboard tiles)** — The plan leaves `transactionCount`, `contactCount`, `activeProjectCount` as hardcoded `0`. To make them dynamic, add resolver queries: `orgTransactionsCount`, `orgContactsCount`, `orgProjectsCount` (with same `orgId` scoping pattern). Can be done in follow-up.

### Plan Deviations (Intentional)

- **Backend:** Added `members` @ResolveField to `Organisation` entity (was missing in initial schema, needed for frontend `myOrganisations` query)
- **Backend:** Added `user` @ResolveField to `OrganisationMember` entity (same reason)
- **Frontend:** Used `useId()` hook in create-org form for accessibility (not in plan, linter fix)
- All other deviations were security/correctness fixes applied during code review

---

## Continuation Instructions

### How to Resume

1. **Verify current state:**

```bash
cd /Users/fawazabdganiyu/akanors-ventures/apps/wathiqah/.claude/worktrees/nice-ptolemy-dd0f9a
git log --oneline -10
pnpm --filter api test --no-coverage 2>&1 | tail -5
pnpm --filter web build 2>&1 | tail -5
```

Expected: 140 backend tests pass, frontend builds clean.

2. **Start with FE-5** (Org Dashboard):
   - Read `docs/superpowers/plans/2026-05-31-organisation-accounts-frontend.md` Task 6 (steps renumbered in plan)
   - Create `org-hero.tsx`, `org-stats-row.tsx`, `org/$slug/index.tsx`
   - Use `useActiveOrg()` to get org slug from context
   - Query `myOrganisations` then find by slug (or add a `organisation(slug)` query)
   - Hardcode stats to 0 or add count queries

3. **Then FE-6, FE-7, FE-8** in sequence following the plan.

4. **After all tasks complete**, use `superpowers:finishing-a-development-branch` skill to create PR targeting `dev` branch.

### Critical Files for Context

- **Design spec:** `docs/superpowers/specs/2026-05-31-organisation-accounts-design.md`
- **Backend plan:** `docs/superpowers/plans/2026-05-31-organisation-accounts-backend.md`
- **Frontend plan:** `docs/superpowers/plans/2026-05-31-organisation-accounts-frontend.md`
- **Backend schema:** `apps/api/src/schema.gql` (auto-generated, includes all org types)
- **Frontend queries:** `apps/web/src/lib/apollo/queries/organisations.ts`
- **OrgContext:** `apps/web/src/context/OrgContext.tsx`

### Task Tracking

Use the existing task list (TaskList tool) — tasks 1–16 are marked complete, 17–20 are pending.

---

## Technical Notes

### Database

- **Migration files:** `apps/api/atlas/migrations/20260531100000_org_accounts.sql` + `20260531100001_org_member_userid_idx.sql`
- **Atlas:** All migrations applied locally. `atlas migrate status` shows clean state.
- **Prisma:** Client regenerated, 5 new models exported.

### Backend Architecture

- **JWT payload:** `{ sub: userId, email, activeOrgId?: string }`
- **Scoping pattern:** All services accept `orgId: string | null`, filter with `{ orgId }` or `{ userId, orgId: null }`
- **Guard stack:** `@UseGuards(GqlAuthGuard, OrgRolesGuard)` + `@OrgRoles(OrgRole.ADMIN)` on class/method
- **Decorator:** `@ActiveOrg()` reads `req.user.activeOrgId` (set by JwtStrategy)

### Frontend Architecture

- **Context switching:** `OrgContext.switchToOrg(orgId)` → `switchOrgContext` mutation → stores new JWT in cookies → refetches Apollo → localStorage updated
- **Route structure:** `/org/:slug/*` for all org pages
- **Header state:** `useActiveOrg()` provides `{ activeOrg, isOrgMode, switchToOrg }`
- **Apollo:** Configured to read JWT from cookies automatically

---

## Verification Commands

### Backend Health Check

```bash
pnpm --filter api test --no-coverage  # Should show 140 passing
pnpm --filter api dev  # Should start without errors, schema.gql regenerated
```

### Frontend Health Check

```bash
pnpm --filter web build  # Should complete with no TypeScript errors
pnpm --filter web dev  # Should start on port 3000
```

### Full Stack Test (Manual)

1. Start backend: `pnpm --filter api dev`
2. Start frontend: `pnpm --filter web dev`
3. Navigate to `http://localhost:3000`
4. Log in
5. Click account switcher → "Create organisation"
6. Submit form → should switch to org context, header should show blue tint + org badge
7. Click account switcher → should show new org in list with checkmark

---

## Next Session Prompt

**Suggested opening:**

> Continue implementing the Organisation Accounts frontend. All backend tasks (BE-1 through BE-12) are complete with 140 tests passing. Frontend tasks FE-1 through FE-4 are done (GQL queries, OrgContext, AccountSwitcher, Create Org page).
>
> Remaining: FE-5 (Org Dashboard), FE-6 (Events & Notes page), FE-7 (Members page), FE-8 (Settings page).
>
> Start with FE-5. Read the checkpoint at `docs/superpowers/checkpoints/2026-05-31-org-accounts-checkpoint-1.md` and the frontend plan at `docs/superpowers/plans/2026-05-31-organisation-accounts-frontend.md`.
>
> Use subagent-driven-development to execute the remaining 4 tasks.
