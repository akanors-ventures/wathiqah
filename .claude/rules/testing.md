# Testing Reference

Loads when writing or debugging backend (Jest) or frontend (Vitest) tests. See `CLAUDE.md` for the top-level index.

- Run targeted backend tests from the api directory: `cd apps/api && npx jest --testPathPatterns="<pattern>" --no-coverage` (plural flag — `--testPathPattern` errors: "Option ... was replaced by --testPathPatterns").
- `pnpm --filter api test -- --testPathPattern=<x>` mangles args in worktrees — use the `cd apps/api && npx jest` form instead.
- In test files, use `as unknown as T` double-cast to access private members — never `as any` and never eslint-disable comments to suppress `no-explicit-any`.
- When using `jest.spyOn`, always add `afterEach(() => jest.restoreAllMocks())` in the same describe block to prevent cross-test mock leakage.
- Frontend (Vitest): `@testing-library/user-event` is **not installed** — use `fireEvent` from `@testing-library/react` for click/interaction tests.
- When mocking `useQuery`/`useMutation` by GraphQL operation name in Vitest, don't assume `document.definitions[0]` is the operation — a query built with an interpolated fragment (`${SOME_FIELDS}`) puts the FragmentDefinition first. Find it via `definitions.find(d => d.kind === "OperationDefinition")`.
- **Manual browser QA**: fresh signups block login on email verification (no local inbox access to the token) — bypass with `psql ... -c "UPDATE users SET \"isEmailVerified\" = true WHERE email = '...'"` on the local dev DB. Same for testing org features: `UPDATE users SET tier = 'PRO' WHERE email = '...'`. Clean up test users/orgs/contacts afterward.
- **Manual QA cleanup order**: delete `contacts` (by both `userId` and `linkedUserId`), then `transaction_history`/`transactions` (by `createdById`), before deleting the `users` row — wrong order hits FK violations like `contacts_userId_fkey`.
- **Browser pane clicks**: the screenshot image is scaled down from the actual viewport (e.g. 800×455 image for a 1280×720 viewport) — clicking raw screenshot pixel coordinates lands in the wrong place. Use `ref` from `read_page`/`find` instead of coordinates whenever possible.
- Components using `<Link>` from `@tanstack/react-router` need it mocked in Vitest tests (no `RouterProvider` in the test env): `vi.mock("@tanstack/react-router", () => ({ Link: ({ children, to }) => <a href={to}>{children}</a> }))` — otherwise `useLinkProps`/`useRouterState` throw `Cannot read properties of null (reading '__store')`.
- Frontend is **Biome-linted, not ESLint** — `// eslint-disable-next-line` is inert and Biome still flags the issue (e.g. `useExhaustiveDependencies`). Fix the dependency array or suppress with `// biome-ignore lint/<rule>: <reason>`.
- `pnpm --filter web exec biome check --write <paths>` — paths must be relative to `apps/web` (the filter already `cd`s there). Repo-root-relative paths double the prefix (`apps/web/apps/web/...`) and Biome silently skips every file.
- **Testing a TanStack Start route directly**: export the page component itself, not just `Route` (e.g. `export function NewTransactionPage()`, matching `settings.tsx`'s `SettingsPage`) — lets a test `render()` it directly without needing to unpack `createFileRoute`'s return shape.
- **Submitting a react-hook-form form in Vitest**: `fireEvent.click()` on the `type="submit"` button reliably triggers `form.handleSubmit(onSubmit)`; `fireEvent.submit(formElement)` did not fire it at all in this setup, and failed silently (no error, `onSubmit` just never ran) — always click the submit button.
- **Mocking a form-fields child component** (e.g. `TransactionFormFields`) to isolate a route's `onSubmit` logic: accept the real `form` prop in the mock and call `form.setValue(...)` in a `useEffect` to satisfy zod `.refine()` checks (e.g. "amount must be positive for funds") that the component's real inputs would otherwise set — otherwise `handleSubmit` resolves to the invalid branch and your submit handler never runs, with no visible error.

`pnpm typecheck` runs `tsc --noEmit` across both apps via Turbo. Use it for full-monorepo type validation.
