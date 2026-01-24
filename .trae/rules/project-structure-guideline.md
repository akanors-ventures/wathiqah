---
alwaysApply: true
---

# Wathȋqah Rules

## Tech Stack

- **Repo**: Turbo + pnpm.
- **BE**: NestJS (Code-First GraphQL), Prisma (PostgreSQL), JWT.
- **FE**: TanStack Start (React), TanStack Router/Query, Shadcn UI, Tailwind.

## Core Rules

- **Types**: Strict TS, Zod/DTO validation. No `any`.
- **Naming**: Files `kebab-case`, Classes `PascalCase`.
- **Folder Structure**: Always follow the structure pattern defined in `ARCHITECTURE.md`.

## Backend (NestJS)

- **Modules**: `src/modules/` (Auth, Users, Trans, Witness).
- **GraphQL**: Code-first resolvers/entities.
- **DB**: Use Prisma. `schema.prisma` updates require migration.
- **Security**: `ConfigService` for secrets. `GqlAuthGuard`.

## Frontend (TanStack)

- **Routes**: File-based `src/routes`.
- **UI**: Shadcn + Tailwind. Colocate feature components.
- **Data**: Apollo Client + TanStack Query.
- **Pages color**: Professional and friendly green and white colors with equivalent dark mode colors.

## Witness System

- **Flow**: User adds Witness -> `PENDING` -> `ACKNOWLEDGED`/`DECLINED`.
- **Update**: Modifying txn resets status to `MODIFIED`.
