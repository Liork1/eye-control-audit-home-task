# Testing

This project uses [Jest](https://jestjs.io/) for unit, integration, and database tests.

## Running tests

| Command | What it runs |
|---------|----------------|
| `npm test` | All tests that do **not** require a live Supabase connection |
| `RUN_DB_TESTS=true npm test` | All tests, including live Supabase integration tests |
| `npm run test:rls` | RLS tenant-isolation tests only (requires Supabase) |

## `RUN_DB_TESTS`

`RUN_DB_TESTS` is an **optional environment flag** that enables database integration tests against your real Supabase project.

By default (`npm test`), these tests are **skipped**. That keeps the default test run fast, offline, and safe to run in CI without Supabase credentials.

Set `RUN_DB_TESTS=true` when you want to verify that seed data was actually written to Supabase—not just that the seed script defines the correct rows in code.

### What runs with and without the flag

| Suite | `npm test` | `RUN_DB_TESTS=true npm test` |
|-------|------------|------------------------------|
| Seed definition (`tests/db/seed.test.ts`) | ✅ Runs (offline; checks `SEED_ROWS` in code) | ✅ Runs |
| Seed in database (`tests/db/seed.test.ts`) | ⏭ Skipped | ✅ Runs (queries `audit_log` via service role) |
| Smoke / build tests | ✅ Runs | ✅ Runs |
| RLS tests (`tests/rls/`) | Use `npm run test:rls` | Use `npm run test:rls` |

The integration suite checks that:

- `audit_log` has at least 14 rows
- All three seed tenants (`tenant-a`, `tenant-b`, `tenant-c`) have at least one row each
- At least five distinct `action` values exist

Implementation: the test file reads `process.env.RUN_DB_TESTS === "true"` and uses `describe.skip` when the flag is unset.

### Prerequisites for live DB tests

1. Copy and fill in `.env` from `.env.example` (at minimum `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`).
2. Apply schema and seed data:

   ```bash
   npm run db:setup
   ```

   Or separately:

   ```bash
   npm run db:migrate   # requires DATABASE_URL
   npm run db:seed
   ```

3. Run tests with the flag:

   ```bash
   RUN_DB_TESTS=true npm test
   ```

If the integration test fails with a database error, the message suggests running `npm run db:migrate && npm run db:seed`.

### CI recommendation

- **Default CI job:** `npm test` (no `RUN_DB_TESTS`) — validates code and offline assertions.
- **Optional CI job or local check:** `RUN_DB_TESTS=true npm test` after `db:setup` — validates the deployed schema and seed against Supabase.

## Test layout

```text
tests/
├── smoke/          # Build and project health checks
├── db/             # Seed definition + optional Supabase integration
└── rls/            # Row Level Security tenant isolation (npm run test:rls)
```

## Environment variables used by tests

| Variable | Required for | Description |
|----------|--------------|-------------|
| `RUN_DB_TESTS` | Live seed integration only | Set to `true` to enable Supabase integration tests in `tests/db/` |
| `SUPABASE_URL` | Live DB / RLS tests | Supabase project base URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Live DB / RLS tests | Service role key (server-side; bypasses RLS) |
| `DATABASE_URL` | `db:migrate` only | Postgres URI for schema migration script |

Tests under `tests/db/` load `.env` via `tests/db/load-env.ts` before importing Supabase clients.
