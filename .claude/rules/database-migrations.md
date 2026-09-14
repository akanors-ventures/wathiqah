# Database Migrations (Atlas)

Loads before touching `apps/api/prisma/schema.prisma` or anything under `apps/api/atlas/migrations/`.

**Atlas is the only migration tool.** Never use `prisma migrate dev`, `prisma migrate deploy`, or any Prisma migrate command — they are disabled. All schema changes go through Atlas.

## Normal workflow (covers 95% of cases)

1. Edit `apps/api/prisma/schema.prisma`
2. `pnpm --filter api db:generate` — regenerates the Prisma client
3. `pnpm --filter api db:migrate` — Atlas diffs schema.prisma against the DB and **auto-generates** both the migration SQL file and the updated `atlas.sum`. Do not write migration SQL manually.
4. `pnpm --filter api db:apply` — applies the migration locally. Verify zero errors before continuing.
5. Commit `apps/api/atlas/migrations/<timestamp>.sql` and the updated `apps/api/atlas/migrations/atlas.sum` together. Never commit one without the other.

## Rules

- **Never use `atlas migrate set`** to mark a migration as applied unless every SQL statement in that file has already been executed. Marking without running causes silent schema drift — missing columns crash the app on startup.
- **Do not run `db:apply` on production manually** — CI applies migrations automatically via `.github/workflows/ci-atlas.yaml` on merge to `main`.
- **FK constraints must use `NOT VALID`**: `ADD CONSTRAINT ... FOREIGN KEY ... NOT VALID` followed by `ALTER TABLE ... VALIDATE CONSTRAINT ...`. `db:migrate`'s auto-generated SQL never adds this automatically, even for a brand-new nullable FK column — check every generated migration by hand before committing.
- Atlas requires `atlas login` (browser-based); token expires periodically.
- **Checksum mismatch** on `db:migrate`/`atlas migrate status` (e.g. "X.sql was added... checksum mismatch"): `atlas.sum` is out of sync with files already in `atlas/migrations/` (usually from a merge). Fix with `atlas migrate hash --dir file://atlas/migrations` — recomputes hashes only, applies nothing.
- **`db:migrate` can bundle in unrelated drift**: if the generated SQL touches tables you didn't change (seen on `contacts`, `notes`, `org_events`, `org_subscriptions`, `organisation_members`, `projects`, `promises`, `transactions` — FK `ON DELETE` behavior drifts from committed schema), that's pre-existing DB drift, not your change. Trim the generated `.sql` to your actual diff before `atlas migrate hash`/`db:apply`.
- **Worktrees**: if two worktrees both run `db:migrate`, each generates its own migration file with its own timestamp. They will conflict when merged. Coordinate: only one worktree should generate a schema-changing migration at a time, or rebase and re-generate after merging the other.

## Special case: removing a PostgreSQL enum value

PostgreSQL does not support `ALTER TYPE ... DROP VALUE`. Atlas will error with "reordering enum value is not supported" if you auto-generate a migration that removes enum values. This is the **only** case where you write migration SQL manually:

1. Write the SQL by hand (see `20260403120000.sql` as a reference): `CREATE TYPE foo_new AS ENUM (...)` with only the desired values → `ALTER TABLE ... ALTER COLUMN type TYPE foo_new USING type::text::foo_new` → `DROP TYPE foo_old; ALTER TYPE foo_new RENAME TO foo_old;`
2. Run `atlas migrate hash --dir file://atlas/migrations` from `apps/api/` to rehash `atlas.sum` — CI will fail with a checksum mismatch if you skip this.
3. Do NOT write migration SQL manually for any other reason — let `db:migrate` generate it.

## PostgreSQL column naming

Prisma uses **camelCase** column names by default (without `@map`). When writing raw SQL in migrations, use the Prisma field name directly: `"returnDirection"` not `"return_direction"`, `"previousState"` not `"previous_state"`. Check the initial migration SQL (`20260224181022.sql`) if unsure.

## Diagnosing schema drift

If the app crashes with `column X does not exist` or `relation X does not exist` despite Atlas reporting all migrations applied:

1. Run `atlas migrate status --env local` to confirm Atlas thinks everything is applied
2. Query the DB directly (`psql ... -c "SELECT column_name FROM information_schema.columns WHERE table_name='...' AND column_name='...'"`) to check what's actually there
3. For each missing object, find the migration that creates it and run that SQL directly via `psql`
4. Do **not** re-run `atlas migrate set` — the revision table already has the entry; only the actual DB object is missing
