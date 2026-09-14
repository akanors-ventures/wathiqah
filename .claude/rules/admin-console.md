# Admin Console

Loads when touching `apps/api/src/modules/admin/` or `apps/web/src/routes/admin/`.

Role-gated platform administration surface. Frontend route: `apps/web/src/routes/admin/` (Overview, Users, Subscriptions, Audit Log), gated by `isPlatformAdmin(user.role)` (`apps/web/src/utils/auth.ts`).

**Roles** (`UserRole` enum: `USER`, `ADMIN`, `SUPER_ADMIN`):

- Read queries (`adminUsers`, `adminUser`, `adminStats`, `adminAuditLogs`) and PRO provisioning (`provisionPro`/`deprovisionPro`) — open to `ADMIN` and `SUPER_ADMIN`.
- `setUserRole` — `SUPER_ADMIN`-only. `SUPER_ADMIN` cannot be assigned via this mutation (reserved for the bootstrap account), and a target who is already `SUPER_ADMIN` cannot be demoted through it either — closes a self-lockout path the frontend-only guard didn't cover.
- `AdminResolver` carries a class-level `@Roles(ADMIN, SUPER_ADMIN)` as a safety net: `RolesGuard` lets any authenticated user through a handler with no `@Roles` metadata, so a future undecorated method would otherwise be open platform-wide.

**Audit log**: every mutation (`provisionPro`, `deprovisionPro`, `setUserRole`) writes an `AdminAuditLog` row (`actorId`, `AdminAction` enum, `targetUserId`, optional `metadata` JSON) in the same `$transaction`/`Promise.all` as the mutation itself — never as a fire-and-forget follow-up call.

**Pagination**: shared `PaginationInput` (`apps/api/src/common/dto/pagination.input.ts`) validates `page >= 1` and `1 <= limit <= 100` via `class-validator`; `getPrismaSkip(page, limit)` computes Prisma `skip`. GraphQL `defaultValue` only covers an omitted arg — `adminUsers`/`adminAuditLogs` explicitly guard against `filter: null` too.

**Search**: `AdminUsersFilterInput.search` matches against email/first/last name via case-insensitive `contains`; `%`/`_` are escaped so they match literally instead of acting as SQL wildcards.

**Header nav placement**: the "Admin" link lives inside the account dropdown (`apps/web/src/components/auth/header-user.tsx`), not the top-level nav — a standalone `Admin` NavLink overflowed org mode's wider header and visually collided with the account switcher. Mobile already treated Admin as a secondary action (in the "More" sheet); desktop now mirrors that.
