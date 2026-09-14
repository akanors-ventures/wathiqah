# CLAUDE.md Maintenance Conventions

This file is the standing contract for how `CLAUDE.md` (repo root) and `.claude/rules/*.md` are structured. Any edit to `CLAUDE.md` — manual, or via an agent or skill — must follow this, not re-derive a structure from scratch.

## The rule

The point is context economy, not the line count itself. `CLAUDE.md` loads on every task regardless of what that task is about, so anything sitting in it is paid for every time, even when irrelevant. **`CLAUDE.md` stays at or under 200 lines, always** — a proxy for the real goal: nothing should be in context that the current task doesn't need. When it would grow past that, extract instead of trimming prose. Check `wc -l CLAUDE.md` after every edit that adds content, before committing.

Every `.claude/rules/*.md` file must be small and single-purpose, with a trigger precise enough to decide relevance without opening the file. A grab-bag file forces loading unrelated content to reach the one relevant paragraph. When a topic outgrows one clear trigger, split it, don't widen the trigger.

## What stays inline vs. what gets extracted

A rule stays inline only if it's **load-bearing and short**: it prevents a real, specific bug, and stating it takes 1-8 lines. Test: "if an engineer skips this, does something break in a way that's hard to notice in review?" If yes and short — inline. If yes but needs a paragraph or more — a one-line pointer stays inline, full explanation moves to `.claude/rules/`.

Current inline categories: General Rules, Git Workflow, Configuration Changes discipline, Quick Start (commands + env setup), Project Architecture (monorepo/tech stack/key principles, kept brief), AI Development Workflow, Reference Files.

Everything else — router/testing/frontend gotchas, business-logic mechanics (transactions, dashboard, subscriptions, admin console), database migrations, backend conventions — lives in `.claude/rules/`.

## Current file map

| File                            | Topic                                                                                                                    |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| `testing.md`                    | Backend Jest + frontend Vitest gotchas, `pnpm typecheck`                                                                 |
| `router-and-graphql-codegen.md` | TanStack Router typed search/params, route registration, GraphQL schema codegen                                          |
| `frontend-gotchas.md`           | HMR artifacts on root providers, Apollo one-watcher-per-query, radix-ui imports                                          |
| `transactions-and-balances.md`  | AssetCategory, TransactionType table, perspective flipping, witness system, balance formulas, settlement locking pattern |
| `dashboard-and-org-features.md` | Dashboard stat cards, org-vs-personal scoping, Personal/Org Notes, Shared Access                                         |
| `subscriptions.md`              | `@CheckFeature` pattern, cross-user tier checks, DB-count vs monthly-counter limits                                      |
| `admin-console.md`              | Admin roles, audit log, pagination, search                                                                               |
| `database-migrations.md`        | Atlas workflow, enum-removal special case, drift diagnosis                                                               |
| `backend-conventions.md`        | HTTP/auth, notifications, Prisma transaction timeout, project fund balance, ESLint                                       |
| `claude-md-conventions.md`      | This file                                                                                                                |

When `CLAUDE.md` gains a pointer to a new area, add a row here in the same commit.

## Growth procedure

1. Find the least load-bearing inline section.
2. Move its full content verbatim into the matching (or a new) `.claude/rules/*.md` file.
3. Replace it in `CLAUDE.md` with a single bullet: topic + one-line description + file pointer.
4. Update the file map table above if a new file was created.
5. Re-run `wc -l CLAUDE.md` and confirm ≤200.

Never solve the line budget by deleting content or compressing it into unreadable density — extraction, not lossy compression, is the mechanism.
