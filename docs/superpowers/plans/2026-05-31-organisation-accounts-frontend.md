# Organisation Accounts — Frontend Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Prerequisite:** The backend plan (`2026-05-31-organisation-accounts-backend.md`) must be fully implemented and the API must be running before executing this plan.

**Goal:** Build the full frontend for org accounts — account switcher, org context state, org dashboard, Events & Notes page, and member management.

**Architecture:** A new `OrgContext` React context manages the active org state (stored in localStorage alongside the org-scoped JWT). The account switcher in the Header calls `switchOrgContext` and refetches all Apollo queries. Org-specific pages are under `/org/:slug/`.

**Tech Stack:** TanStack Start, TanStack Router, Apollo Client, Shadcn UI, Tailwind CSS, GraphQL Code-First (codegen from `schema.gql`)

---

## File Map

**New files (create):**

- `apps/web/src/lib/apollo/queries/organisations.ts` — all org-related GQL queries/mutations
- `apps/web/src/context/OrgContext.tsx` — active org state + switchOrg action
- `apps/web/src/hooks/use-active-org.ts` — convenience hook
- `apps/web/src/components/org/account-switcher.tsx` — context switcher trigger + dropdown
- `apps/web/src/components/org/org-hero.tsx` — org name/badge hero bar
- `apps/web/src/components/org/org-stats-row.tsx` — 4-tile stats bar
- `apps/web/src/components/org/event-card.tsx` — single event display card
- `apps/web/src/components/org/note-entry.tsx` — single note display card
- `apps/web/src/components/org/member-row.tsx` — single member row
- `apps/web/src/routes/org/create.tsx` — create org page
- `apps/web/src/routes/org/$slug/index.tsx` — org dashboard
- `apps/web/src/routes/org/$slug/events.tsx` — events + notes page
- `apps/web/src/routes/org/$slug/members.tsx` — member management
- `apps/web/src/routes/org/$slug/settings.tsx` — org settings

**Modified files:**

- `apps/web/src/components/layout/Header.tsx` — add account switcher, org mode badge, Events/Members nav links
- `apps/web/src/context/AuthContext.tsx` — expose org context integration
- `apps/web/src/router.tsx` — register new org routes

---

## Task 1: GraphQL queries + mutations + codegen

**Files:**

- Create: `apps/web/src/lib/apollo/queries/organisations.ts`

- [ ] **Step 1: Create the organisations query file**

Create `apps/web/src/lib/apollo/queries/organisations.ts`:

```typescript
import { gql, type TypedDocumentNode } from "@apollo/client";
import type {
  MyOrganisationsQuery,
  MyOrganisationsQueryVariables,
  CreateOrganisationMutation,
  CreateOrganisationMutationVariables,
  UpdateOrganisationMutation,
  UpdateOrganisationMutationVariables,
  SwitchOrgContextMutation,
  SwitchOrgContextMutationVariables,
  InviteMemberMutation,
  InviteMemberMutationVariables,
  UpdateMemberRoleMutation,
  UpdateMemberRoleMutationVariables,
  RemoveMemberMutation,
  RemoveMemberMutationVariables,
  PromoteContactToOrgMutation,
  PromoteContactToOrgMutationVariables,
  OrgUpcomingEventsQuery,
  OrgUpcomingEventsQueryVariables,
  OrgEventsQuery,
  OrgEventsQueryVariables,
  OrgEventCategorySuggestionsQuery,
  OrgEventCategorySuggestionsQueryVariables,
  CreateOrgEventMutation,
  CreateOrgEventMutationVariables,
  UpdateOrgEventMutation,
  UpdateOrgEventMutationVariables,
  RemoveOrgEventMutation,
  RemoveOrgEventMutationVariables,
  OrgNotesQuery,
  OrgNotesQueryVariables,
  CreateOrgNoteMutation,
  CreateOrgNoteMutationVariables,
  UpdateOrgNoteMutation,
  UpdateOrgNoteMutationVariables,
  RemoveOrgNoteMutation,
  RemoveOrgNoteMutationVariables,
} from "@/types/__generated__/graphql";

export const ORGANISATION_FIELDS = gql`
  fragment OrganisationFields on Organisation {
    id
    name
    slug
    description
    industry
    logoUrl
    attributionMode
    createdAt
  }
`;

export const MY_ORGANISATIONS_QUERY: TypedDocumentNode<
  MyOrganisationsQuery,
  MyOrganisationsQueryVariables
> = gql`
  ${ORGANISATION_FIELDS}
  query MyOrganisations {
    myOrganisations {
      ...OrganisationFields
      members {
        id
        userId
        role
        joinedAt
        user {
          id
          firstName
          lastName
          email
        }
      }
    }
  }
`;

export const SWITCH_ORG_CONTEXT_MUTATION: TypedDocumentNode<
  SwitchOrgContextMutation,
  SwitchOrgContextMutationVariables
> = gql`
  mutation SwitchOrgContext($orgId: String) {
    switchOrgContext(orgId: $orgId) {
      accessToken
      refreshToken
      user {
        id
        email
        firstName
        lastName
      }
    }
  }
`;

export const CREATE_ORGANISATION_MUTATION: TypedDocumentNode<
  CreateOrganisationMutation,
  CreateOrganisationMutationVariables
> = gql`
  ${ORGANISATION_FIELDS}
  mutation CreateOrganisation($input: CreateOrganisationInput!) {
    createOrganisation(input: $input) {
      ...OrganisationFields
    }
  }
`;

export const UPDATE_ORGANISATION_MUTATION: TypedDocumentNode<
  UpdateOrganisationMutation,
  UpdateOrganisationMutationVariables
> = gql`
  ${ORGANISATION_FIELDS}
  mutation UpdateOrganisation($input: UpdateOrganisationInput!) {
    updateOrganisation(input: $input) {
      ...OrganisationFields
    }
  }
`;

export const INVITE_MEMBER_MUTATION: TypedDocumentNode<
  InviteMemberMutation,
  InviteMemberMutationVariables
> = gql`
  mutation InviteMember($input: InviteMemberInput!) {
    inviteMember(input: $input) {
      id
      userId
      role
      joinedAt
    }
  }
`;

export const UPDATE_MEMBER_ROLE_MUTATION: TypedDocumentNode<
  UpdateMemberRoleMutation,
  UpdateMemberRoleMutationVariables
> = gql`
  mutation UpdateMemberRole($memberId: ID!, $role: OrgRole!) {
    updateMemberRole(memberId: $memberId, role: $role) {
      id
      role
    }
  }
`;

export const REMOVE_MEMBER_MUTATION: TypedDocumentNode<
  RemoveMemberMutation,
  RemoveMemberMutationVariables
> = gql`
  mutation RemoveMember($memberId: ID!) {
    removeMember(memberId: $memberId)
  }
`;

export const PROMOTE_CONTACT_TO_ORG_MUTATION: TypedDocumentNode<
  PromoteContactToOrgMutation,
  PromoteContactToOrgMutationVariables
> = gql`
  mutation PromoteContactToOrg($contactId: ID!) {
    promoteContactToOrg(contactId: $contactId) {
      id
      firstName
      lastName
    }
  }
`;

// ── Events ──────────────────────────────────────────────────────────────────

export const ORG_EVENT_FIELDS = gql`
  fragment OrgEventFields on OrgEvent {
    id
    orgId
    title
    date
    endDate
    category
    notes
    isRecurring
    recurrence
    createdById
    createdAt
  }
`;

export const ORG_UPCOMING_EVENTS_QUERY: TypedDocumentNode<
  OrgUpcomingEventsQuery,
  OrgUpcomingEventsQueryVariables
> = gql`
  ${ORG_EVENT_FIELDS}
  query OrgUpcomingEvents($category: String) {
    orgUpcomingEvents(category: $category) {
      ...OrgEventFields
    }
  }
`;

export const ORG_EVENTS_QUERY: TypedDocumentNode<
  OrgEventsQuery,
  OrgEventsQueryVariables
> = gql`
  ${ORG_EVENT_FIELDS}
  query OrgEvents($category: String) {
    orgEvents(category: $category) {
      ...OrgEventFields
    }
  }
`;

export const ORG_EVENT_CATEGORY_SUGGESTIONS_QUERY: TypedDocumentNode<
  OrgEventCategorySuggestionsQuery,
  OrgEventCategorySuggestionsQueryVariables
> = gql`
  query OrgEventCategorySuggestions {
    orgEventCategorySuggestions
  }
`;

export const CREATE_ORG_EVENT_MUTATION: TypedDocumentNode<
  CreateOrgEventMutation,
  CreateOrgEventMutationVariables
> = gql`
  ${ORG_EVENT_FIELDS}
  mutation CreateOrgEvent($input: CreateOrgEventInput!) {
    createOrgEvent(input: $input) {
      ...OrgEventFields
    }
  }
`;

export const UPDATE_ORG_EVENT_MUTATION: TypedDocumentNode<
  UpdateOrgEventMutation,
  UpdateOrgEventMutationVariables
> = gql`
  ${ORG_EVENT_FIELDS}
  mutation UpdateOrgEvent($id: ID!, $input: UpdateOrgEventInput!) {
    updateOrgEvent(id: $id, input: $input) {
      ...OrgEventFields
    }
  }
`;

export const REMOVE_ORG_EVENT_MUTATION: TypedDocumentNode<
  RemoveOrgEventMutation,
  RemoveOrgEventMutationVariables
> = gql`
  mutation RemoveOrgEvent($id: ID!) {
    removeOrgEvent(id: $id)
  }
`;

// ── Notes ────────────────────────────────────────────────────────────────────

export const ORG_NOTE_FIELDS = gql`
  fragment OrgNoteFields on OrgNote {
    id
    orgId
    body
    category
    createdById
    createdAt
    updatedAt
  }
`;

export const ORG_NOTES_QUERY: TypedDocumentNode<
  OrgNotesQuery,
  OrgNotesQueryVariables
> = gql`
  ${ORG_NOTE_FIELDS}
  query OrgNotes($category: String) {
    orgNotes(category: $category) {
      ...OrgNoteFields
    }
  }
`;

export const CREATE_ORG_NOTE_MUTATION: TypedDocumentNode<
  CreateOrgNoteMutation,
  CreateOrgNoteMutationVariables
> = gql`
  ${ORG_NOTE_FIELDS}
  mutation CreateOrgNote($input: CreateOrgNoteInput!) {
    createOrgNote(input: $input) {
      ...OrgNoteFields
    }
  }
`;

export const UPDATE_ORG_NOTE_MUTATION: TypedDocumentNode<
  UpdateOrgNoteMutation,
  UpdateOrgNoteMutationVariables
> = gql`
  ${ORG_NOTE_FIELDS}
  mutation UpdateOrgNote($id: ID!, $input: UpdateOrgNoteInput!) {
    updateOrgNote(id: $id, input: $input) {
      ...OrgNoteFields
    }
  }
`;

export const REMOVE_ORG_NOTE_MUTATION: TypedDocumentNode<
  RemoveOrgNoteMutation,
  RemoveOrgNoteMutationVariables
> = gql`
  mutation RemoveOrgNote($id: ID!) {
    removeOrgNote(id: $id)
  }
`;
```

- [ ] **Step 2: Run codegen**

```bash
pnpm --filter web codegen
```

Expected: `apps/web/src/types/__generated__/graphql.ts` updated with new types. No errors.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/lib/apollo/queries/organisations.ts apps/web/src/types/__generated__/
git commit -m "feat: add org GQL queries, mutations, and regenerate types"
```

---

## Task 2: OrgContext provider + useActiveOrg hook

**Files:**

- Create: `apps/web/src/context/OrgContext.tsx`
- Create: `apps/web/src/hooks/use-active-org.ts`
- Modify: `apps/web/src/routes/__root.tsx`

- [ ] **Step 1: Create OrgContext**

Create `apps/web/src/context/OrgContext.tsx`:

```typescript
import { useApolloClient, useMutation, useQuery } from "@apollo/client/react";
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  MY_ORGANISATIONS_QUERY,
  SWITCH_ORG_CONTEXT_MUTATION,
} from "@/lib/apollo/queries/organisations";
import type { Organisation } from "@/types/__generated__/graphql";

const ORG_STORAGE_KEY = "wathiqah_active_org_id";

interface OrgContextType {
  activeOrg: Organisation | null;
  myOrgs: Organisation[];
  loadingOrgs: boolean;
  switchToOrg: (orgId: string | null) => Promise<void>;
  isOrgMode: boolean;
}

const OrgContext = createContext<OrgContextType | null>(null);

export function OrgProvider({ children }: { children: ReactNode }) {
  const apolloClient = useApolloClient();
  const [activeOrgId, setActiveOrgId] = useState<string | null>(
    () => localStorage.getItem(ORG_STORAGE_KEY),
  );

  const { data, loading: loadingOrgs, refetch } = useQuery(MY_ORGANISATIONS_QUERY, {
    fetchPolicy: "cache-and-network",
  });

  const myOrgs = data?.myOrganisations ?? [];
  const activeOrg = myOrgs.find((o) => o.id === activeOrgId) ?? null;

  const [switchOrgContextMutation] = useMutation(SWITCH_ORG_CONTEXT_MUTATION);

  const switchToOrg = useCallback(
    async (orgId: string | null) => {
      const { data: switchData } = await switchOrgContextMutation({
        variables: { orgId },
      });

      if (!switchData?.switchOrgContext) return;

      const { accessToken, refreshToken } = switchData.switchOrgContext;

      // Store new tokens (same cookie approach as auth)
      document.cookie = `accessToken=${accessToken}; path=/; SameSite=Strict`;
      document.cookie = `refreshToken=${refreshToken}; path=/; SameSite=Strict`;

      // Persist active org selection
      if (orgId) {
        localStorage.setItem(ORG_STORAGE_KEY, orgId);
      } else {
        localStorage.removeItem(ORG_STORAGE_KEY);
      }
      setActiveOrgId(orgId);

      // Refetch all active Apollo queries so pages see org-scoped data
      await apolloClient.refetchQueries({ include: "active" });
    },
    [switchOrgContextMutation, apolloClient],
  );

  const value = useMemo(
    () => ({
      activeOrg,
      myOrgs,
      loadingOrgs,
      switchToOrg,
      isOrgMode: activeOrg !== null,
    }),
    [activeOrg, myOrgs, loadingOrgs, switchToOrg],
  );

  return <OrgContext.Provider value={value}>{children}</OrgContext.Provider>;
}

export function useOrgContext() {
  const ctx = useContext(OrgContext);
  if (!ctx) throw new Error("useOrgContext must be used inside OrgProvider");
  return ctx;
}
```

- [ ] **Step 2: Create useActiveOrg hook**

Create `apps/web/src/hooks/use-active-org.ts`:

```typescript
import { useOrgContext } from "@/context/OrgContext";

/**
 * Convenience hook — returns the active org and a boolean indicating org mode.
 * Components that only need the active org (not the full list) use this.
 */
export function useActiveOrg() {
  const { activeOrg, isOrgMode, switchToOrg } = useOrgContext();
  return { activeOrg, isOrgMode, switchToOrg };
}
```

- [ ] **Step 3: Wrap the app with OrgProvider in `__root.tsx`**

In `apps/web/src/routes/__root.tsx`, import `OrgProvider`:

```typescript
import { OrgProvider } from "@/context/OrgContext";
```

In the `RootDocument` component, wrap the children render inside `AuthProvider` with `OrgProvider`:

```tsx
// Find the existing:
<AuthProvider>
  {children}
</AuthProvider>

// Replace with:
<AuthProvider>
  <OrgProvider>
    {children}
  </OrgProvider>
</AuthProvider>
```

- [ ] **Step 4: Verify the app still compiles**

```bash
pnpm --filter web build 2>&1 | tail -10
```

Expected: Build succeeds with no TypeScript errors.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/context/OrgContext.tsx apps/web/src/hooks/use-active-org.ts apps/web/src/routes/__root.tsx
git commit -m "feat: add OrgContext provider and useActiveOrg hook"
```

---

## Task 3: Account Switcher component

**Files:**

- Create: `apps/web/src/components/org/account-switcher.tsx`

- [ ] **Step 1: Create the AccountSwitcher component**

Create `apps/web/src/components/org/account-switcher.tsx`:

```tsx
import { Building2, ChevronDown, Plus, User } from "lucide-react";
import { useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/hooks/use-auth";
import { useOrgContext } from "@/context/OrgContext";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function AccountSwitcher() {
  const { user } = useAuth();
  const { activeOrg, myOrgs, switchToOrg, isOrgMode } = useOrgContext();
  const navigate = useNavigate();

  const initials = activeOrg
    ? activeOrg.name
        .split(" ")
        .slice(0, 2)
        .map((w) => w[0])
        .join("")
        .toUpperCase()
    : `${user?.firstName?.[0] ?? ""}${user?.lastName?.[0] ?? ""}`.toUpperCase();

  const displayName = activeOrg
    ? activeOrg.name.length > 16
      ? `${activeOrg.name.slice(0, 14)}…`
      : activeOrg.name
    : `${user?.firstName ?? ""} ${user?.lastName?.[0] ?? ""}.`;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className={cn(
            "flex items-center gap-2 px-2 py-1.5 h-9 rounded-lg border transition-all duration-200",
            isOrgMode
              ? "border-blue-200 bg-blue-50 hover:bg-blue-100 text-blue-800 dark:border-blue-800 dark:bg-blue-950 dark:hover:bg-blue-900 dark:text-blue-200"
              : "border-border bg-background hover:bg-muted/50",
          )}
        >
          {/* Avatar */}
          <div
            className={cn(
              "flex h-6 w-6 items-center justify-center rounded-md text-[10px] font-bold flex-shrink-0",
              isOrgMode
                ? "bg-blue-200 text-blue-800 dark:bg-blue-800 dark:text-blue-200"
                : "bg-muted text-muted-foreground",
            )}
          >
            {initials}
          </div>

          {/* Name + type */}
          <div className="flex flex-col items-start gap-0 min-w-0">
            <span className="text-[12px] font-semibold leading-none truncate max-w-[100px]">
              {displayName}
            </span>
            <span
              className={cn(
                "text-[9px] uppercase tracking-wide font-bold leading-none mt-0.5",
                isOrgMode ? "text-blue-500" : "text-muted-foreground",
              )}
            >
              {isOrgMode ? "Organisation" : "Personal"}
            </span>
          </div>

          <ChevronDown className="h-3 w-3 text-muted-foreground ml-0.5 flex-shrink-0" />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-56 mt-1">
        {/* Personal */}
        <DropdownMenuLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/70 px-2 py-1.5">
          Switch context
        </DropdownMenuLabel>

        <DropdownMenuItem
          className="flex items-center gap-2.5 cursor-pointer"
          onClick={() => switchToOrg(null)}
        >
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-muted text-muted-foreground text-[10px] font-bold flex-shrink-0">
            {`${user?.firstName?.[0] ?? ""}${user?.lastName?.[0] ?? ""}`.toUpperCase()}
          </div>
          <div className="flex flex-col min-w-0 flex-1">
            <span className="text-[13px] font-semibold leading-tight truncate">
              {user?.firstName} {user?.lastName}
            </span>
            <span className="text-[11px] text-muted-foreground">Personal</span>
          </div>
          {!isOrgMode && (
            <span className="text-blue-500 text-sm font-bold flex-shrink-0">
              ✓
            </span>
          )}
        </DropdownMenuItem>

        {/* Orgs */}
        {myOrgs.length > 0 && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/70 px-2 py-1.5">
              Organisations
            </DropdownMenuLabel>
            {myOrgs.map((org) => (
              <DropdownMenuItem
                key={org.id}
                className="flex items-center gap-2.5 cursor-pointer"
                onClick={() => switchToOrg(org.id)}
              >
                <div className="flex h-7 w-7 items-center justify-center rounded-md bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300 text-[10px] font-bold flex-shrink-0">
                  {org.name
                    .split(" ")
                    .slice(0, 2)
                    .map((w) => w[0])
                    .join("")
                    .toUpperCase()}
                </div>
                <div className="flex flex-col min-w-0 flex-1">
                  <span className="text-[13px] font-semibold leading-tight truncate">
                    {org.name}
                  </span>
                  <span className="text-[11px] text-muted-foreground">
                    {org.industry ?? "Organisation"}
                  </span>
                </div>
                {activeOrg?.id === org.id && (
                  <span className="text-blue-500 text-sm font-bold flex-shrink-0">
                    ✓
                  </span>
                )}
              </DropdownMenuItem>
            ))}
          </>
        )}

        {/* Create org */}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="flex items-center gap-2 cursor-pointer text-muted-foreground"
          onClick={() => navigate({ to: "/org/create" })}
        >
          <Plus className="h-4 w-4" />
          <span className="text-[13px]">Create organisation</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/components/org/account-switcher.tsx
git commit -m "feat: add AccountSwitcher component with personal/org context toggle"
```

---

## Task 4: Update Header for org mode

**Files:**

- Modify: `apps/web/src/components/layout/Header.tsx`

- [ ] **Step 1: Import AccountSwitcher and useActiveOrg**

In `apps/web/src/components/layout/Header.tsx`, add these imports:

```typescript
import { AccountSwitcher } from "@/components/org/account-switcher";
import { useActiveOrg } from "@/hooks/use-active-org";
import { CalendarDays, Users } from "lucide-react";
import { cn } from "@/lib/utils";
```

- [ ] **Step 2: Add org mode logic to Header component**

In the `Header` function body, after the `useSubscription` hook, add:

```typescript
const { activeOrg, isOrgMode } = useActiveOrg();
```

- [ ] **Step 3: Add org name badge to header-left**

Inside the `<div className="flex items-center gap-4 ...">` div, after the logo `<Link>`, add:

```tsx
{
  isOrgMode && activeOrg && (
    <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-blue-50 border border-blue-200 dark:bg-blue-950 dark:border-blue-800">
      <span className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0" />
      <span className="text-[11px] font-bold uppercase tracking-wide text-blue-700 dark:text-blue-300 max-w-[160px] truncate">
        {activeOrg.name}
      </span>
    </div>
  );
}
```

- [ ] **Step 4: Add org-only nav links to the desktop nav**

Inside the `<nav className="hidden md:flex ...">` section, after the existing `NavDropdown`s and `NavLink`s, add:

```tsx
{
  isOrgMode && activeOrg && (
    <>
      <NavLink to={`/org/${activeOrg.slug}/events`}>
        <span className="flex items-center gap-1.5">
          <CalendarDays className="w-3.5 h-3.5" />
          Events
        </span>
      </NavLink>
      <NavLink to={`/org/${activeOrg.slug}/members`}>
        <span className="flex items-center gap-1.5">
          <Users className="w-3.5 h-3.5" />
          Members
        </span>
      </NavLink>
    </>
  );
}
```

- [ ] **Step 5: Replace HeaderUser with AccountSwitcher + HeaderUser**

In the `<div className="flex items-center gap-4 shrink-0">` section, add `<AccountSwitcher />` before `<HeaderUser />`:

```tsx
<div className="flex items-center gap-4 shrink-0">
  {user && !isPro && !subLoading && (
    // ... existing Go Pro button ...
  )}
  <AccountSwitcher />
  <HeaderUser />
</div>
```

- [ ] **Step 6: Apply org mode header tint**

Update the `<header>` className to include a conditional blue tint:

```tsx
<header
  className={cn(
    "sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur-md supports-[backdrop-filter]:bg-background/80 shadow-sm transition-colors duration-300",
    isOrgMode
      ? "border-blue-200 bg-blue-50/95 dark:border-blue-800 dark:bg-blue-950/95"
      : "border-border",
  )}
>
```

- [ ] **Step 7: Verify the build compiles**

```bash
pnpm --filter web build 2>&1 | tail -10
```

Expected: No TypeScript errors.

- [ ] **Step 8: Commit**

```bash
git add apps/web/src/components/layout/Header.tsx
git commit -m "feat: update Header with account switcher and org mode tint"
```

---

## Task 5: Create Organisation page

**Files:**

- Create: `apps/web/src/routes/org/create.tsx`

- [ ] **Step 1: Create the page**

Create `apps/web/src/routes/org/create.tsx`:

```tsx
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation } from "@apollo/client/react";
import { useForm } from "react-hook-form";
import { Building2 } from "lucide-react";
import { CREATE_ORGANISATION_MUTATION } from "@/lib/apollo/queries/organisations";
import { useOrgContext } from "@/context/OrgContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { authGuard } from "@/utils/auth";
import type { CreateOrganisationInput } from "@/types/__generated__/graphql";

export const Route = createFileRoute("/org/create")({
  component: CreateOrgPage,
  beforeLoad: (ctx) => authGuard({ location: ctx.location }),
});

function CreateOrgPage() {
  const navigate = useNavigate();
  const { switchToOrg } = useOrgContext();
  const [createOrg, { loading, error }] = useMutation(
    CREATE_ORGANISATION_MUTATION,
  );

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CreateOrganisationInput>();

  async function onSubmit(data: CreateOrganisationInput) {
    const { data: result } = await createOrg({ variables: { input: data } });
    if (result?.createOrganisation) {
      // Switch to the new org context immediately
      await switchToOrg(result.createOrganisation.id);
      navigate({ to: `/org/${result.createOrganisation.slug}` });
    }
  }

  return (
    <div className="container mx-auto max-w-lg px-4 py-16">
      <div className="flex flex-col items-center text-center mb-10">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 border border-blue-100 mb-4">
          <Building2 className="h-7 w-7 text-blue-600" />
        </div>
        <h1 className="text-2xl font-black tracking-tight">
          Create an Organisation
        </h1>
        <p className="text-sm text-muted-foreground mt-2 max-w-xs">
          Set up a shared workspace for your team — separate from your personal
          ledger.
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <div className="space-y-1.5">
          <Label htmlFor="name">Organisation name *</Label>
          <Input
            id="name"
            placeholder="e.g. Akanors Integrated Farm"
            {...register("name", { required: "Name is required" })}
          />
          {errors.name && (
            <p className="text-xs text-destructive">{errors.name.message}</p>
          )}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="industry">
            Industry <span className="text-muted-foreground">(optional)</span>
          </Label>
          <Input
            id="industry"
            placeholder="e.g. Agriculture, Cooperative, NGO"
            {...register("industry")}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="description">
            Description{" "}
            <span className="text-muted-foreground">(optional)</span>
          </Label>
          <Textarea
            id="description"
            placeholder="What does your organisation do?"
            rows={3}
            {...register("description")}
          />
        </div>

        {error && <p className="text-sm text-destructive">{error.message}</p>}

        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? "Creating…" : "Create Organisation"}
        </Button>
      </form>
    </div>
  );
}
```

- [ ] **Step 2: Register the route in router.tsx**

In `apps/web/src/router.tsx`, confirm the new route file path `apps/web/src/routes/org/create.tsx` is picked up by TanStack Router's file-based routing. If the project uses file-based routing auto-discovery, no change is needed. If routes are manually registered, add:

```typescript
import { Route as OrgCreateRoute } from "./routes/org/create";
// and wire it into the route tree
```

Check `apps/web/src/router.tsx` — if it uses `routeTree` from codegen, run:

```bash
pnpm --filter web dev &
sleep 5
pkill -f "vite"
```

Expected: `routeTree.gen.ts` is updated to include `/org/create`.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/routes/org/
git commit -m "feat: add create organisation page"
```

---

## Task 6: Org Dashboard page

**Files:**

- Create: `apps/web/src/components/org/org-hero.tsx`
- Create: `apps/web/src/components/org/org-stats-row.tsx`
- Create: `apps/web/src/routes/org/$slug/index.tsx`

- [ ] **Step 1: Create OrgHero component**

Create `apps/web/src/components/org/org-hero.tsx`:

```tsx
import { Link } from "@tanstack/react-router";
import { Settings, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { Organisation } from "@/types/__generated__/graphql";

interface OrgHeroProps {
  org: Organisation;
  isAdmin: boolean;
}

export function OrgHero({ org, isAdmin }: OrgHeroProps) {
  const initials = org.name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();

  return (
    <div className="bg-gradient-to-br from-slate-900 to-slate-700 dark:from-slate-950 dark:to-slate-800 rounded-xl p-6 flex items-start justify-between gap-4">
      <div className="flex items-center gap-4">
        <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-blue-600 text-white text-xl font-black border-2 border-white/10 flex-shrink-0">
          {initials}
        </div>
        <div>
          <h1 className="text-xl font-black text-white tracking-tight">
            {org.name}
          </h1>
          {org.description && (
            <p className="text-sm text-blue-200 mt-0.5">{org.description}</p>
          )}
          <div className="flex items-center gap-2 mt-2">
            <Badge className="bg-blue-600 hover:bg-blue-600 text-white text-[10px] font-black uppercase">
              PRO
            </Badge>
            {org.industry && (
              <Badge
                variant="outline"
                className="border-white/20 text-white/70 text-[10px]"
              >
                {org.industry}
              </Badge>
            )}
          </div>
        </div>
      </div>

      {isAdmin && (
        <div className="flex items-center gap-2 flex-shrink-0">
          <Button
            asChild
            variant="ghost"
            size="sm"
            className="text-white/70 hover:text-white hover:bg-white/10 border border-white/20"
          >
            <Link to={`/org/${org.slug}/settings`}>
              <Settings className="h-4 w-4 mr-1.5" />
              Settings
            </Link>
          </Button>
          <Button
            asChild
            size="sm"
            className="bg-white text-slate-900 hover:bg-white/90 font-semibold"
          >
            <Link to="/transactions/new">
              <Plus className="h-4 w-4 mr-1.5" />
              New Transaction
            </Link>
          </Button>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Create OrgStatsRow component**

Create `apps/web/src/components/org/org-stats-row.tsx`:

```tsx
interface StatCellProps {
  label: string;
  value: string | number;
  sub?: string;
}

function StatCell({ label, value, sub }: StatCellProps) {
  return (
    <div className="px-5 py-4 border-r border-border last:border-r-0">
      <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
        {label}
      </p>
      <p className="text-2xl font-black tracking-tight mt-0.5">{value}</p>
      {sub && <p className="text-[11px] text-muted-foreground mt-0.5">{sub}</p>}
    </div>
  );
}

interface OrgStatsRowProps {
  transactionCount: number;
  contactCount: number;
  upcomingEventCount: number;
  activeProjectCount: number;
}

export function OrgStatsRow({
  transactionCount,
  contactCount,
  upcomingEventCount,
  activeProjectCount,
}: OrgStatsRowProps) {
  return (
    <div className="grid grid-cols-4 bg-card border border-border rounded-xl overflow-hidden">
      <StatCell label="Transactions" value={transactionCount} />
      <StatCell label="Contacts" value={contactCount} />
      <StatCell
        label="Upcoming Events"
        value={upcomingEventCount}
        sub={upcomingEventCount > 0 ? "Check Events tab" : undefined}
      />
      <StatCell label="Active Projects" value={activeProjectCount} />
    </div>
  );
}
```

- [ ] **Step 3: Create the org dashboard route**

Create `apps/web/src/routes/org/$slug/index.tsx`:

```tsx
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@apollo/client/react";
import { CalendarDays, Plus, UserPlus, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { OrgHero } from "@/components/org/org-hero";
import { OrgStatsRow } from "@/components/org/org-stats-row";
import { BrandLoader } from "@/components/ui/page-loader";
import { authGuard } from "@/utils/auth";
import {
  MY_ORGANISATIONS_QUERY,
  ORG_UPCOMING_EVENTS_QUERY,
} from "@/lib/apollo/queries/organisations";
import { useActiveOrg } from "@/hooks/use-active-org";

export const Route = createFileRoute("/org/$slug/")({
  component: OrgDashboardPage,
  beforeLoad: (ctx) => authGuard({ location: ctx.location }),
});

function OrgDashboardPage() {
  const { slug } = Route.useParams();
  const { activeOrg } = useActiveOrg();
  const { data: orgsData } = useQuery(MY_ORGANISATIONS_QUERY);
  const org = orgsData?.myOrganisations.find((o) => o.slug === slug);

  const { data: eventsData } = useQuery(ORG_UPCOMING_EVENTS_QUERY, {
    skip: !org,
  });

  if (!org) return <BrandLoader />;

  const upcomingEvents = eventsData?.orgUpcomingEvents ?? [];

  const quickActions = [
    {
      icon: Plus,
      label: "Record transaction",
      sub: "Log a sale, payment or loan",
      href: "/transactions/new",
    },
    {
      icon: CalendarDays,
      label: "Add event",
      sub: "Vaccination, Eid, breeding",
      href: `/org/${slug}/events`,
    },
    {
      icon: UserPlus,
      label: "Add contact",
      sub: "Buyer, vet, partner",
      href: "/contacts/new",
    },
    {
      icon: Users,
      label: "Invite member",
      sub: "Add staff or operator",
      href: `/org/${slug}/members`,
    },
  ];

  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      <OrgHero org={org} isAdmin={true} />
      {/* Note: transactionCount, contactCount, and activeProjectCount need
          their own org-scoped Apollo queries (orgTransactions, orgContacts,
          orgProjects with status=ACTIVE). Add those queries to organisations.ts
          and wire them here. For now they render 0 until those queries are added. */}
      <OrgStatsRow
        transactionCount={0}
        contactCount={0}
        upcomingEventCount={upcomingEvents.length}
        activeProjectCount={0}
      />

      {/* Quick actions */}
      <div>
        <h2 className="text-[11px] font-black uppercase tracking-widest text-muted-foreground mb-3">
          Quick actions
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {quickActions.map(({ icon: Icon, label, sub, href }) => (
            <Link
              key={label}
              to={href}
              className="flex flex-col gap-1 p-4 rounded-xl border border-border bg-card hover:border-primary/30 hover:bg-primary/5 transition-all duration-150"
            >
              <Icon className="h-5 w-5 text-muted-foreground mb-1" />
              <span className="text-[13px] font-semibold">{label}</span>
              <span className="text-[11px] text-muted-foreground">{sub}</span>
            </Link>
          ))}
        </div>
      </div>

      {/* Upcoming events preview */}
      {upcomingEvents.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-[11px] font-black uppercase tracking-widest text-muted-foreground">
              Upcoming events
            </h2>
            <Button asChild variant="ghost" size="sm" className="text-xs">
              <Link to={`/org/${slug}/events`}>View all →</Link>
            </Button>
          </div>
          <div className="space-y-2">
            {upcomingEvents.slice(0, 3).map((event) => (
              <div
                key={event.id}
                className="flex items-center gap-3 p-3 rounded-lg border border-border bg-card"
              >
                <div className="flex-shrink-0 w-10 text-center">
                  <p className="text-[9px] font-bold uppercase text-muted-foreground">
                    {new Date(event.date).toLocaleDateString("en-NG", {
                      month: "short",
                    })}
                  </p>
                  <p className="text-lg font-black leading-tight">
                    {new Date(event.date).getDate()}
                  </p>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-semibold truncate">
                    {event.title}
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    {event.category}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Verify build**

```bash
pnpm --filter web build 2>&1 | tail -10
```

Expected: No errors.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/components/org/ apps/web/src/routes/org/
git commit -m "feat: add org dashboard with hero, stats, quick actions, and events preview"
```

---

## Task 7: Events & Notes page

**Files:**

- Create: `apps/web/src/components/org/event-card.tsx`
- Create: `apps/web/src/components/org/note-entry.tsx`
- Create: `apps/web/src/routes/org/$slug/events.tsx`

- [ ] **Step 1: Create EventCard component**

Create `apps/web/src/components/org/event-card.tsx`:

```tsx
import { differenceInDays, format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { OrgEvent } from "@/types/__generated__/graphql";

const CATEGORY_STYLES: Record<string, string> = {
  "Islamic Calendar":
    "bg-amber-50 border-amber-200 dark:bg-amber-950 dark:border-amber-800",
  Breeding:
    "bg-green-50 border-green-200 dark:bg-green-950 dark:border-green-800",
  Vaccination:
    "bg-blue-50 border-blue-200 dark:bg-blue-950 dark:border-blue-800",
  Regulatory:
    "bg-violet-50 border-violet-200 dark:bg-violet-950 dark:border-violet-800",
  Commercial:
    "bg-orange-50 border-orange-200 dark:bg-orange-950 dark:border-orange-800",
};

function getCategoryStyle(category: string): string {
  return (
    CATEGORY_STYLES[category] ??
    "bg-slate-50 border-slate-200 dark:bg-slate-900 dark:border-slate-700"
  );
}

interface EventCardProps {
  event: OrgEvent;
  onEdit?: (event: OrgEvent) => void;
  onDelete?: (id: string) => void;
}

export function EventCard({ event, onEdit, onDelete }: EventCardProps) {
  const eventDate = new Date(event.date);
  const daysUntil = differenceInDays(eventDate, new Date());

  return (
    <div
      className={cn(
        "flex items-start gap-4 p-4 rounded-xl border cursor-pointer transition-all duration-150 hover:shadow-sm",
        getCategoryStyle(event.category),
      )}
      onClick={() => onEdit?.(event)}
    >
      {/* Date box */}
      <div className="flex-shrink-0 w-10 text-center bg-white dark:bg-slate-900 rounded-lg border border-white/60 dark:border-slate-700 py-1.5">
        <p className="text-[9px] font-black uppercase tracking-wider text-muted-foreground">
          {format(eventDate, "MMM")}
        </p>
        <p className="text-lg font-black leading-tight">
          {format(eventDate, "d")}
        </p>
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-bold">{event.title}</p>
        {event.notes && (
          <p className="text-[12px] text-muted-foreground mt-1 line-clamp-2">
            {event.notes}
          </p>
        )}
        <div className="flex items-center gap-2 mt-2 flex-wrap">
          <Badge
            variant="secondary"
            className="text-[10px] font-bold uppercase tracking-wide h-5"
          >
            {event.category}
          </Badge>
          {event.isRecurring && (
            <span className="text-[10px] text-muted-foreground">
              ↻ {event.recurrence}
            </span>
          )}
        </div>
      </div>

      {/* Countdown */}
      <div className="flex-shrink-0 text-right">
        <span
          className={cn(
            "text-[12px] font-bold",
            daysUntil <= 7
              ? "text-red-500"
              : daysUntil <= 30
                ? "text-amber-600"
                : "text-muted-foreground",
          )}
        >
          {daysUntil === 0
            ? "Today"
            : daysUntil < 0
              ? "Past"
              : daysUntil === 1
                ? "Tomorrow"
                : `${daysUntil}d`}
        </span>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create NoteEntry component**

Create `apps/web/src/components/org/note-entry.tsx`:

```tsx
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import type { OrgNote } from "@/types/__generated__/graphql";

interface NoteEntryProps {
  note: OrgNote;
  authorName?: string;
  onEdit?: (note: OrgNote) => void;
}

export function NoteEntry({ note, authorName, onEdit }: NoteEntryProps) {
  return (
    <div
      className="p-4 rounded-xl bg-muted/30 border border-border cursor-pointer hover:border-border/80 hover:shadow-sm transition-all duration-150"
      onClick={() => onEdit?.(note)}
    >
      <div className="flex items-center justify-between mb-2">
        <p className="text-[12px] font-bold text-foreground/70">
          {format(new Date(note.createdAt), "EEE, d MMM yyyy")}
        </p>
        {authorName && (
          <p className="text-[11px] text-muted-foreground">{authorName}</p>
        )}
      </div>
      <p className="text-[13px] text-foreground leading-relaxed whitespace-pre-wrap">
        {note.body}
      </p>
      {note.category && (
        <div className="mt-3">
          <Badge
            variant="secondary"
            className="text-[10px] font-bold uppercase"
          >
            {note.category}
          </Badge>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Create the Events & Notes page**

Create `apps/web/src/routes/org/$slug/events.tsx`:

```tsx
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery } from "@apollo/client/react";
import { useState } from "react";
import { Plus, PenLine } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { EventCard } from "@/components/org/event-card";
import { NoteEntry } from "@/components/org/note-entry";
import { BrandLoader } from "@/components/ui/page-loader";
import { authGuard } from "@/utils/auth";
import {
  ORG_UPCOMING_EVENTS_QUERY,
  ORG_NOTES_QUERY,
  ORG_EVENT_CATEGORY_SUGGESTIONS_QUERY,
  REMOVE_ORG_EVENT_MUTATION,
  REMOVE_ORG_NOTE_MUTATION,
} from "@/lib/apollo/queries/organisations";
import { format, isThisWeek, isThisMonth } from "date-fns";
import type { OrgEvent } from "@/types/__generated__/graphql";

export const Route = createFileRoute("/org/$slug/events")({
  component: EventsPage,
  beforeLoad: (ctx) => authGuard({ location: ctx.location }),
});

function EventsPage() {
  const { slug } = Route.useParams();
  const [categoryFilter, setCategoryFilter] = useState<string | undefined>();

  const {
    data: eventsData,
    loading: eventsLoading,
    refetch: refetchEvents,
  } = useQuery(ORG_UPCOMING_EVENTS_QUERY, {
    variables: { category: categoryFilter },
  });
  const { data: notesData, refetch: refetchNotes } = useQuery(ORG_NOTES_QUERY, {
    variables: { category: categoryFilter },
  });
  const { data: suggestionsData } = useQuery(
    ORG_EVENT_CATEGORY_SUGGESTIONS_QUERY,
  );

  const [removeEvent] = useMutation(REMOVE_ORG_EVENT_MUTATION);
  const [removeNote] = useMutation(REMOVE_ORG_NOTE_MUTATION);

  const upcomingEvents = eventsData?.orgUpcomingEvents ?? [];
  const notes = notesData?.orgNotes ?? [];
  const suggestions = suggestionsData?.orgEventCategorySuggestions ?? [];

  // Group events by time horizon
  const thisWeekEvents = upcomingEvents.filter((e) =>
    isThisWeek(new Date(e.date)),
  );
  const thisMonthEvents = upcomingEvents.filter(
    (e) => !isThisWeek(new Date(e.date)) && isThisMonth(new Date(e.date)),
  );
  const laterEvents = upcomingEvents.filter(
    (e) => !isThisWeek(new Date(e.date)) && !isThisMonth(new Date(e.date)),
  );

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Page header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-3xl font-black tracking-tight">
            Events &amp; Notes
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Important dates, schedules, and organisation records
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <PenLine className="h-4 w-4 mr-1.5" />
            Add Note
          </Button>
          <Button size="sm">
            <Plus className="h-4 w-4 mr-1.5" />
            Add Event
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-[1fr_240px] gap-6">
        {/* Main content */}
        <div>
          <Tabs defaultValue="upcoming">
            <TabsList>
              <TabsTrigger value="upcoming">
                Upcoming
                <Badge
                  variant="secondary"
                  className="ml-1.5 text-[10px] h-4 px-1.5"
                >
                  {upcomingEvents.length}
                </Badge>
              </TabsTrigger>
              <TabsTrigger value="notes">
                Notes
                <Badge
                  variant="secondary"
                  className="ml-1.5 text-[10px] h-4 px-1.5"
                >
                  {notes.length}
                </Badge>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="upcoming" className="mt-4 space-y-6">
              {eventsLoading && <BrandLoader />}

              {thisWeekEvents.length > 0 && (
                <section>
                  <SectionLabel>This week</SectionLabel>
                  <div className="space-y-2">
                    {thisWeekEvents.map((e) => (
                      <EventCard key={e.id} event={e} />
                    ))}
                  </div>
                </section>
              )}

              {thisMonthEvents.length > 0 && (
                <section>
                  <SectionLabel>This month</SectionLabel>
                  <div className="space-y-2">
                    {thisMonthEvents.map((e) => (
                      <EventCard key={e.id} event={e} />
                    ))}
                  </div>
                </section>
              )}

              {laterEvents.length > 0 && (
                <section>
                  <SectionLabel>Upcoming</SectionLabel>
                  <div className="space-y-2">
                    {laterEvents.map((e) => (
                      <EventCard key={e.id} event={e} />
                    ))}
                  </div>
                </section>
              )}

              {upcomingEvents.length === 0 && !eventsLoading && (
                <div className="text-center py-16 text-muted-foreground">
                  <CalendarDays className="h-10 w-10 mx-auto mb-3 opacity-30" />
                  <p className="text-sm font-medium">No upcoming events</p>
                  <p className="text-xs mt-1">
                    Add your first event to get started
                  </p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="notes" className="mt-4">
              {/* Write prompt */}
              <button className="w-full text-left p-4 rounded-xl border border-dashed border-border bg-background hover:border-primary/30 mb-4 transition-all">
                <p className="text-[12px] font-semibold text-muted-foreground">
                  + Write a note…
                </p>
                <p className="text-[11px] text-muted-foreground/60 mt-0.5">
                  Observations, records, decisions, meeting summaries — anything
                  worth keeping
                </p>
              </button>

              <div className="space-y-3">
                {notes.map((note) => (
                  <NoteEntry key={note.id} note={note} />
                ))}
              </div>

              {notes.length === 0 && (
                <div className="text-center py-12 text-muted-foreground">
                  <PenLine className="h-8 w-8 mx-auto mb-3 opacity-30" />
                  <p className="text-sm font-medium">No notes yet</p>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>

        {/* Sidebar filters */}
        <div className="space-y-4">
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-2">
              Filter by category
            </p>
            <div className="space-y-0.5">
              <FilterOption
                label="All"
                count={upcomingEvents.length}
                active={!categoryFilter}
                onClick={() => setCategoryFilter(undefined)}
              />
              {suggestions.map((cat) => (
                <FilterOption
                  key={cat}
                  label={cat}
                  count={
                    upcomingEvents.filter((e) => e.category === cat).length
                  }
                  active={categoryFilter === cat}
                  onClick={() =>
                    setCategoryFilter(cat === categoryFilter ? undefined : cat)
                  }
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Fix missing import in the component:
import { CalendarDays } from "lucide-react";

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 mb-2">
      <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
        {children}
      </span>
      <div className="flex-1 h-px bg-border" />
    </div>
  );
}

function FilterOption({
  label,
  count,
  active,
  onClick,
}: {
  label: string;
  count: number;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left transition-colors text-[12px] font-medium ${
        active
          ? "bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300"
          : "text-muted-foreground hover:bg-muted/50"
      }`}
    >
      <span>{label}</span>
      <span className="text-[10px] font-bold">{count}</span>
    </button>
  );
}
```

- [ ] **Step 4: Verify build**

```bash
pnpm --filter web build 2>&1 | tail -15
```

Expected: No errors.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/components/org/ apps/web/src/routes/org/$slug/events.tsx
git commit -m "feat: add Events and Notes page with tabs, category filter, and grouped events"
```

---

## Task 8: Member Management page

**Files:**

- Create: `apps/web/src/components/org/member-row.tsx`
- Create: `apps/web/src/routes/org/$slug/members.tsx`

- [ ] **Step 1: Create MemberRow component**

Create `apps/web/src/components/org/member-row.tsx`:

```tsx
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import { OrgRole } from "@/types/__generated__/graphql";
import type { OrganisationMember } from "@/types/__generated__/graphql";

const ROLE_BADGE_VARIANTS: Record<OrgRole, string> = {
  [OrgRole.Admin]: "bg-slate-900 text-white dark:bg-white dark:text-slate-900",
  [OrgRole.Operator]:
    "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  [OrgRole.Viewer]: "bg-muted text-muted-foreground",
};

interface MemberRowProps {
  member: OrganisationMember & {
    user: { firstName: string; lastName: string; email: string };
  };
  isCurrentUser: boolean;
  isAdmin: boolean;
  onRoleChange?: (memberId: string, role: OrgRole) => void;
  onRemove?: (memberId: string) => void;
}

export function MemberRow({
  member,
  isCurrentUser,
  isAdmin,
  onRoleChange,
  onRemove,
}: MemberRowProps) {
  const initials =
    `${member.user.firstName[0]}${member.user.lastName[0]}`.toUpperCase();
  const name = `${member.user.firstName} ${member.user.lastName}`;

  return (
    <div className="flex items-center gap-3 py-3 border-b border-border last:border-b-0">
      {/* Avatar */}
      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-muted text-muted-foreground text-[12px] font-bold flex-shrink-0">
        {initials}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-[13px] font-semibold truncate">{name}</p>
          {isCurrentUser && (
            <Badge variant="secondary" className="text-[9px] h-4 px-1.5">
              You
            </Badge>
          )}
        </div>
        <p className="text-[11px] text-muted-foreground truncate">
          {member.user.email}
        </p>
      </div>

      {/* Role */}
      {isAdmin && !isCurrentUser ? (
        <Select
          value={member.role}
          onValueChange={(value) => onRoleChange?.(member.id, value as OrgRole)}
        >
          <SelectTrigger className="w-28 h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={OrgRole.Admin}>Admin</SelectItem>
            <SelectItem value={OrgRole.Operator}>Operator</SelectItem>
            <SelectItem value={OrgRole.Viewer}>Viewer</SelectItem>
          </SelectContent>
        </Select>
      ) : (
        <Badge
          className={`text-[10px] font-bold uppercase ${ROLE_BADGE_VARIANTS[member.role]}`}
        >
          {member.role}
        </Badge>
      )}

      {/* Remove */}
      {isAdmin && !isCurrentUser && (
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-muted-foreground hover:text-destructive"
          onClick={() => onRemove?.(member.id)}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Create the Members page**

Create `apps/web/src/routes/org/$slug/members.tsx`:

```tsx
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery } from "@apollo/client/react";
import { useState } from "react";
import { UserPlus } from "lucide-react";
import { useForm } from "react-hook-form";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { MemberRow } from "@/components/org/member-row";
import { BrandLoader } from "@/components/ui/page-loader";
import { authGuard } from "@/utils/auth";
import { useAuth } from "@/hooks/use-auth";
import {
  MY_ORGANISATIONS_QUERY,
  INVITE_MEMBER_MUTATION,
  UPDATE_MEMBER_ROLE_MUTATION,
  REMOVE_MEMBER_MUTATION,
} from "@/lib/apollo/queries/organisations";
import type { InviteMemberInput } from "@/types/__generated__/graphql";
import { OrgRole } from "@/types/__generated__/graphql";

export const Route = createFileRoute("/org/$slug/members")({
  component: MembersPage,
  beforeLoad: (ctx) => authGuard({ location: ctx.location }),
});

function MembersPage() {
  const { slug } = Route.useParams();
  const { user } = useAuth();
  const [inviteOpen, setInviteOpen] = useState(false);

  const { data, loading, refetch } = useQuery(MY_ORGANISATIONS_QUERY);
  const org = data?.myOrganisations.find((o) => o.slug === slug);
  const members = (org as any)?.members ?? [];

  const currentMember = members.find((m: any) => m.userId === user?.id);
  const isAdmin = currentMember?.role === OrgRole.Admin;

  const [inviteMember, { loading: inviting, error: inviteError }] = useMutation(
    INVITE_MEMBER_MUTATION,
  );
  const [updateRole] = useMutation(UPDATE_MEMBER_ROLE_MUTATION);
  const [removeMember] = useMutation(REMOVE_MEMBER_MUTATION);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<InviteMemberInput>({
    defaultValues: { role: OrgRole.Operator },
  });

  async function onInvite(data: InviteMemberInput) {
    await inviteMember({ variables: { input: data } });
    await refetch();
    reset();
    setInviteOpen(false);
  }

  async function handleRoleChange(memberId: string, role: OrgRole) {
    await updateRole({ variables: { memberId, role } });
    await refetch();
  }

  async function handleRemove(memberId: string) {
    if (!confirm("Remove this member from the organisation?")) return;
    await removeMember({ variables: { memberId } });
    await refetch();
  }

  if (loading) return <BrandLoader />;

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-3xl font-black tracking-tight">Members</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {members.length} {members.length === 1 ? "member" : "members"} in
            this organisation
          </p>
        </div>
        {isAdmin && (
          <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <UserPlus className="h-4 w-4 mr-1.5" />
                Invite member
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Invite a member</DialogTitle>
              </DialogHeader>
              <form
                onSubmit={handleSubmit(onInvite)}
                className="space-y-4 mt-2"
              >
                <div className="space-y-1.5">
                  <Label>Email address</Label>
                  <Input
                    placeholder="member@example.com"
                    {...register("email", { required: "Email is required" })}
                  />
                  {errors.email && (
                    <p className="text-xs text-destructive">
                      {errors.email.message}
                    </p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label>Role</Label>
                  <Select
                    value={watch("role")}
                    onValueChange={(v) => setValue("role", v as OrgRole)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={OrgRole.Operator}>
                        Operator — can create records
                      </SelectItem>
                      <SelectItem value={OrgRole.Viewer}>
                        Viewer — read-only access
                      </SelectItem>
                      <SelectItem value={OrgRole.Admin}>
                        Admin — full control
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {inviteError && (
                  <p className="text-sm text-destructive">
                    {inviteError.message}
                  </p>
                )}
                <Button type="submit" className="w-full" disabled={inviting}>
                  {inviting ? "Inviting…" : "Send invitation"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <div className="bg-card border border-border rounded-xl px-4">
        {members.map((member: any) => (
          <MemberRow
            key={member.id}
            member={member}
            isCurrentUser={member.userId === user?.id}
            isAdmin={isAdmin}
            onRoleChange={handleRoleChange}
            onRemove={handleRemove}
          />
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/components/org/member-row.tsx apps/web/src/routes/org/$slug/members.tsx
git commit -m "feat: add member management page with invite, role change, and remove"
```

---

## Task 9: Org Settings page

**Files:**

- Create: `apps/web/src/routes/org/$slug/settings.tsx`

- [ ] **Step 1: Create the settings page**

Create `apps/web/src/routes/org/$slug/settings.tsx`:

```tsx
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery } from "@apollo/client/react";
import { useForm } from "react-hook-form";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { BrandLoader } from "@/components/ui/page-loader";
import { authGuard } from "@/utils/auth";
import {
  MY_ORGANISATIONS_QUERY,
  UPDATE_ORGANISATION_MUTATION,
} from "@/lib/apollo/queries/organisations";
import type { UpdateOrganisationInput } from "@/types/__generated__/graphql";
import { AttributionMode } from "@/types/__generated__/graphql";
import { toast } from "sonner";

export const Route = createFileRoute("/org/$slug/settings")({
  component: OrgSettingsPage,
  beforeLoad: (ctx) => authGuard({ location: ctx.location }),
});

function OrgSettingsPage() {
  const { slug } = Route.useParams();
  const { data, loading } = useQuery(MY_ORGANISATIONS_QUERY);
  const org = data?.myOrganisations.find((o) => o.slug === slug);

  const [updateOrg, { loading: saving }] = useMutation(
    UPDATE_ORGANISATION_MUTATION,
  );

  const { register, handleSubmit, setValue, watch, reset } =
    useForm<UpdateOrganisationInput>();

  useEffect(() => {
    if (org) {
      reset({
        name: org.name,
        description: org.description ?? "",
        industry: org.industry ?? "",
        attributionMode: org.attributionMode,
      });
    }
  }, [org, reset]);

  async function onSubmit(data: UpdateOrganisationInput) {
    await updateOrg({ variables: { input: data } });
    toast.success("Organisation settings saved");
  }

  if (loading) return <BrandLoader />;
  if (!org) return null;

  return (
    <div className="container mx-auto px-4 py-8 max-w-xl">
      <div className="mb-8">
        <h1 className="text-3xl font-black tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Manage your organisation profile and preferences
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div className="space-y-1.5">
          <Label>Organisation name</Label>
          <Input {...register("name", { required: true })} />
        </div>

        <div className="space-y-1.5">
          <Label>
            Industry <span className="text-muted-foreground">(optional)</span>
          </Label>
          <Input
            placeholder="e.g. Agriculture, Cooperative, NGO"
            {...register("industry")}
          />
        </div>

        <div className="space-y-1.5">
          <Label>
            Description{" "}
            <span className="text-muted-foreground">(optional)</span>
          </Label>
          <Textarea rows={3} {...register("description")} />
        </div>

        <div className="space-y-1.5">
          <Label>Transaction attribution</Label>
          <Select
            value={watch("attributionMode")}
            onValueChange={(v) =>
              setValue("attributionMode", v as AttributionMode)
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={AttributionMode.OrgOnly}>
                Organisation name only (default)
              </SelectItem>
              <SelectItem value={AttributionMode.OrgAndOperator}>
                Organisation + staff member name
              </SelectItem>
            </SelectContent>
          </Select>
          <p className="text-[11px] text-muted-foreground">
            Controls how your org appears in transaction notifications sent to
            contacts.
          </p>
        </div>

        <Button type="submit" disabled={saving}>
          {saving ? "Saving…" : "Save changes"}
        </Button>
      </form>
    </div>
  );
}
```

- [ ] **Step 2: Run final frontend build**

```bash
pnpm --filter web build 2>&1 | tail -15
```

Expected: Build completes with no TypeScript errors.

- [ ] **Step 3: Run the full app and verify org flow end-to-end**

```bash
pnpm dev &
sleep 12
echo "Visit http://localhost:3000 — log in, open the switcher, create an org, switch to it, and confirm the header shows the org badge."
```

- [ ] **Step 4: Final commit**

```bash
git add apps/web/src/routes/org/
git commit -m "feat: add org settings page — complete frontend for organisation accounts"
```
