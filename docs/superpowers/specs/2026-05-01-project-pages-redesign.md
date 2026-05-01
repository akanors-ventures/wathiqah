# Project Pages Redesign — Design Spec

**Date:** 2026-05-01  
**Goal:** Bring the Projects list page and Project detail page into visual alignment with the dashboard's gold-standard design language — rich cards, consistent typography, hover interactions, and the `StatsCard` pattern for analytics.

---

## Design Language Reference

All choices below derive from existing dashboard components. No new visual patterns are introduced.

| Token                  | Value                                                                  | Source                           |
| ---------------------- | ---------------------------------------------------------------------- | -------------------------------- |
| Outer card radius      | `rounded-[24px]`                                                       | `ProjectsWidget`, `StatsCard`    |
| Inner item radius      | `rounded-xl sm:rounded-2xl`                                            | Dashboard promise list items     |
| Analytics card radius  | `rounded-[20px] sm:rounded-[24px]`                                     | `StatsCard`                      |
| Section wrapper radius | `rounded-[32px]`                                                       | Dashboard "Recent Activity" card |
| Hover shadow           | `hover:shadow-[0_20px_50px_rgba(0,0,0,0.08)]`                          | `StatsCard`                      |
| Hover lift             | `hover:-translate-y-1`                                                 | `StatsCard`                      |
| Card transition        | `transition-all duration-500`                                          | Dashboard throughout             |
| Icon animation         | `group-hover:-rotate-6`                                                | `StatsCard`                      |
| Section title style    | `font-black tracking-tight uppercase opacity-60`                       | Dashboard "Recent activity"      |
| Value typography       | `font-black tracking-tight`                                            | `StatsCard` value                |
| Label typography       | `text-[10px] font-bold uppercase tracking-wider text-muted-foreground` | `StatsCard` title                |
| Background glow        | `absolute -right-8 -bottom-8 w-32 h-32 rounded-full blur-3xl`          | `StatsCard`                      |
| Project color          | Indigo (`#6366f1`)                                                     | `ProjectsWidget`                 |

---

## 1. Projects List Page (`apps/web/src/routes/projects/index.tsx`)

### 1.1 Page Header

- Typography: `text-3xl font-black tracking-tight` for "Projects" heading (upgraded from `font-bold`)
- Subtitle: `text-sm text-muted-foreground font-medium opacity-70` (upgraded from plain `text-muted-foreground`)
- "New Project" button: add `shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-[0.98]` (matches dashboard's "New Transaction")

### 1.2 Project Cards

Replace current plain `Card` with a new `ProjectCard` component at `apps/web/src/components/projects/ProjectCard.tsx`.

**Layout:**

```
┌─────────────────────────────────────────────┐
│  [Initial Avatar]          [Status Badge]   │
│                                              │
│  Project Name (font-bold lg)                 │
│  Description (muted, truncated, optional)    │
│                                              │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐    │
│  │ Balance  │ │ Income   │ │ Expenses │    │
│  │  ₦0      │ │  ₦0      │ │  ₦0      │    │
│  └──────────┘ └──────────┘ └──────────┘    │
│                                              │
│  [Budget progress bar ──────────]  [→]      │
│  No budget set                              │
└─────────────────────────────────────────────┘
```

**Initial Avatar:**

- First 1–2 characters of `project.name` (uppercase)
- `w-11 h-11 rounded-[14px]` with indigo gradient: `bg-gradient-to-br from-indigo-500 to-violet-600`
- `text-sm font-black text-white shadow-lg`

**Status Badge:**

- ACTIVE → `text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20 border-emerald-100 dark:border-emerald-900/30`
- COMPLETED → `text-blue-600 bg-blue-50 dark:bg-blue-900/20 border-blue-100`
- ARCHIVED → `text-zinc-500 bg-zinc-100 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700`
- Font: `text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border`

**Mini-stat cells (Balance / Income / Expenses):**

- `bg-muted/40 rounded-[10px] p-2.5` per cell
- Label: `text-[8px] font-bold uppercase tracking-wider text-muted-foreground/60`
- Value: `text-sm font-black tracking-tight` — emerald if positive income/zero expense, rose if negative balance/expense > 0, foreground for zero

**Budget row:**

- Progress bar: `h-[3px] rounded-full bg-secondary/50` track; `bg-indigo-500` fill
- Label: `text-[9px] font-medium text-muted-foreground` showing "X% of ₦Y" or "No budget set" (muted italic)
- Arrow button: `w-8 h-8 rounded-full bg-muted/50 flex items-center justify-center` with `ArrowRight` icon

**Card container:**

- `rounded-[24px] border border-border/50 bg-card p-5`
- `transition-all duration-500 hover:shadow-[0_20px_50px_rgba(0,0,0,0.08)] hover:-translate-y-1 hover:border-primary/30`
- Decorative glow: `absolute -right-10 -bottom-10 w-28 h-28 rounded-full bg-indigo-500/5 blur-3xl group-hover:bg-indigo-500/10 transition-colors duration-500`
- Entire card is a `Link` wrapping to `/projects/$projectId`

**Grid:** `grid gap-5 md:grid-cols-2 lg:grid-cols-3` (unchanged column counts)

### 1.3 Empty State

- `rounded-[24px] border border-dashed border-border/40 py-20 text-center`
- Icon: `FolderKanban` in a `w-14 h-14 bg-primary/5 rounded-full` centered container
- Heading + muted description + outline "Create Project" button

---

## 2. Project Detail Page (`apps/web/src/routes/projects/$projectId.tsx`)

### 2.1 Page Header

- Back button: unchanged
- Project name: `text-3xl font-black tracking-tight` (upgraded from `font-bold`)
- Status badge (same pill design as project cards) displayed on a new line below the name, or inline if name is short
- Description: `text-sm text-muted-foreground font-medium mt-0.5`
- Button group: unchanged (Edit Project + Log Transaction)

### 2.2 Analytics Cards

Replace the 4 plain `Card` elements with a styled version matching `StatsCard` exactly.  
**Reuse `StatsCard` directly** — no new component needed. `StatsCard` is extended with an optional `descriptionSlot?: React.ReactNode` prop (backwards-compatible addition) so the budget card can embed a `Progress` bar below the description text.

| Card             | Icon           | Variant   | Value color                                    |
| ---------------- | -------------- | --------- | ---------------------------------------------- |
| Current Balance  | `Wallet`       | `primary` | primary (indigo)                               |
| Total Income     | `TrendingUp`   | `default` | emerald via `BalanceIndicator` or direct class |
| Total Expenses   | `TrendingDown` | `default` | rose via direct class                          |
| Budget Remaining | `Target`       | `default` | red if negative, foreground if positive        |

- Balance card: `variant="primary"` → indigo tint background + icon fills indigo on mount
- The budget card passes a small `Progress` component via `descriptionSlot` to show utilization below the description text
- Grid: `grid gap-4 md:grid-cols-2 lg:grid-cols-4` (unchanged)

### 2.3 Transaction History Section

Wrap the entire filters + card grid + pagination in a `rounded-[32px]` `Card` matching the dashboard "Recent Activity" panel:

```tsx
<Card className="rounded-[32px] border-border/50 overflow-hidden transition-all duration-500 hover:shadow-[0_20px_50px_rgba(0,0,0,0.05)]">
  <CardHeader className="flex flex-row items-start justify-between gap-4 pb-4 p-4 sm:p-6">
    <div>
      <CardTitle className="text-lg font-black tracking-tight uppercase opacity-60">
        Transaction History
      </CardTitle>
      <p className="text-[10px] sm:text-xs text-muted-foreground font-medium mt-1">
        All income and expenses for this project.
      </p>
    </div>
    {/* filters row */}
  </CardHeader>
  <CardContent className="p-4 sm:p-6 pt-0">
    {/* empty state or card grid */}
  </CardContent>
</Card>
```

- Filters move into the `CardHeader` alongside the title (right-aligned)
- `ProjectTransactionCard` grid: unchanged from previous task

---

## 3. Files

| Action | File                                               | Change                                                                                                                                      |
| ------ | -------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| Modify | `apps/web/src/components/dashboard/StatsCard.tsx`  | Add `descriptionSlot?: React.ReactNode` prop (backwards-compatible)                                                                         |
| Create | `apps/web/src/components/projects/ProjectCard.tsx` | New rich project card component                                                                                                             |
| Modify | `apps/web/src/routes/projects/index.tsx`           | Replace plain `Card` with `ProjectCard`; upgrade header typography                                                                          |
| Modify | `apps/web/src/routes/projects/$projectId.tsx`      | Upgrade header typography + status badge; replace plain analytics cards with `StatsCard`; wrap transaction section in `rounded-[32px]` Card |

---

## 4. Constraints

- `StatsCard` receives one backwards-compatible addition: `descriptionSlot?: React.ReactNode` — all existing call sites are unaffected
- `BalanceIndicator` component is used for the balance value inside the primary `StatsCard` (already used on the dashboard)
- `ProjectCard` must display `totalIncome` and `totalExpenses` — confirm both fields are returned by `GET_MY_PROJECTS` query fragment; if not, add them to `ProjectFieldsFragment`
- No backend changes required
- No new dependencies
