# TanStack Router & GraphQL Codegen

Loads when adding/editing a route (`apps/web/src/routes/`), a `<Link>`/`navigate()` call with dynamic params, or a GraphQL `@Field()`/schema change.

## TanStack Router — Typed Search Params

Routes with `validateSearch` (e.g. `/pricing`, `/transactions`) require all search params to be passed explicitly in `<Link search={{ ... }}>`. Omitting `search` is a TypeScript error. Use `search={{ param: undefined }}` when no value is needed.

## TanStack Router — Typed Params (Dynamic Segments)

Never build a dynamic-segment href via string interpolation: `<Link to={`/org/${slug}/members` as never}>` updates the URL bar correctly and the route matches, but `Route.useParams()` comes back `undefined` on the resulting *client-side* transition (a hard reload works fine since it re-parses the URL through route matching from scratch). Always use `<Link to="/org/$slug/members" params={{ slug }}>`instead. Same applies to`navigate({ to: ... })`— pass`params`, never a pre-built path string. This holds even for a fully-resolved concrete path (e.g. a server-generated string like `/transactions/abc-123`) — confirmed via a live bug where `navigate({ to: someResolvedPath as never })`left`Route.useParams()` undefined and broke the destination page's query.

## Route Registration

`apps/web/src/routeTree.gen.ts` is **auto-generated** by the TanStack Router dev server. When adding a new route file without running the server, TypeScript will error: `Argument of type '"/new-route"' is not assignable to parameter of type 'keyof FileRoutesByPath'` in many places. Fix: run `pnpm --filter web dev` briefly — it regenerates the file within seconds of startup. Never edit `routeTree.gen.ts` manually.

## GraphQL Schema Generation

- `apps/api/src/schema.gql` is **auto-generated at runtime** when NestJS starts — do NOT edit it manually.
- After adding or changing `@Field()` decorators, run `pnpm --filter api dev` once to regenerate `schema.gql`. Kill it as soon as the server prints "Nest application successfully started".
- After regenerating `schema.gql`, run `pnpm --filter web codegen` to regenerate `apps/web/src/types/__generated__/graphql.ts`.
- Commit both `schema.gql` and `graphql.ts` together — a stale `schema.gql` in the repo will break CI codegen validation even if the backend code is correct.
- Frontend codegen reads from `../api/src/schema.gql` — see `apps/web/codegen.ts`.
- If only a frontend query/fragment selection changes (no backend `@Field()`/schema change), skip starting the api dev server — `pnpm --filter web codegen` alone regenerates types from the `schema.gql` already on disk.
