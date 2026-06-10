# Testing

This project uses [Jest](https://jestjs.io/) for unit, integration, and database tests. Route handlers are tested directly (no HTTP server required).

## Running tests

| Command | What it runs |
|---------|----------------|
| `npm test` | All tests that do **not** require a live Supabase connection |
| `RUN_DB_TESTS=true npm test` | All tests, including live Supabase integration tests |
| `npm run test:rls` | RLS tenant-isolation tests only (requires Supabase) |

## `RUN_DB_TESTS`

`RUN_DB_TESTS` is an **optional environment flag** that enables database integration tests against your real Supabase project.

By default (`npm test`), live DB tests are **skipped**. That keeps the default test run fast, offline, and safe to run in CI without Supabase credentials.

Set `RUN_DB_TESTS=true` when you want to verify behavior against the actual database.

### What runs with and without the flag

| Suite | `npm test` | `RUN_DB_TESTS=true npm test` |
|-------|------------|------------------------------|
| JWT unit tests (`tests/auth/jwt.test.ts`) | ✅ | ✅ |
| Auth integration (`tests/auth/`) | ⏭ Skipped | ✅ |
| Audit API (`tests/audit/`) | ⏭ Skipped | ✅ |
| Tenant isolation (`tests/audit/tenant-isolation.test.ts`) | ⏭ Skipped | ✅ |
| Seed definition (`tests/db/seed.test.ts`) | ✅ (offline) | ✅ |
| Seed in database (`tests/db/seed.test.ts`) | ⏭ Skipped | ✅ |
| Smoke / build (`tests/smoke/`) | ✅ | ✅ |
| RLS tests (`tests/rls/`) | Use `npm run test:rls` | Use `RUN_DB_TESTS=true npm run test:rls` |

## Test Suites

### Authentication (`tests/auth/`)

| Test file | What it verifies |
|-----------|------------------|
| `jwt.test.ts` | JWT sign/verify, claim extraction (offline) |
| `bootstrap.test.ts` | Bootstrap endpoint issues valid tokens |
| `auth.test.ts` | Token lifecycle, expiry, revocation checks |

### Audit API (`tests/audit/`)

| Test file | What it verifies |
|-----------|------------------|
| `create.test.ts` | POST creates entries with JWT tenant/user |
| `list.test.ts` | GET returns filtered results |
| `tenant-isolation.test.ts` | **Mandatory** — bypass attempts blocked |

**Tenant isolation tests** prove tenant-a cannot access tenant-b data via:

- Query param: `?tenant_id=tenant-b`
- Header: `X-Tenant-Id: tenant-b`
- Body: `{ "tenant_id": "tenant-b" }` on POST

### Database (`tests/db/`)

| Test | What it verifies |
|------|------------------|
| Seed definition (offline) | 16+ rows, 3 tenants, 5+ actions in code |
| Seed integration (live) | Rows exist in Supabase `audit_log` |

### RLS (`tests/rls/`)

Direct Supabase client tests using user-scoped JWT (`src/lib/supabase-user.ts`):

| Test | What it verifies |
|------|------------------|
| Positive | tenant-a reads tenant-a rows |
| Negative (filtered) | tenant-a cannot read tenant-b via `.eq("tenant_id", "tenant-b")` |
| Negative (unfiltered) | Unfiltered select returns no tenant-b/c rows |

These prove database-level isolation independent of the API service-role client.

## Prerequisites for live DB tests

1. Copy and fill in `.env` from `.env.example`
2. Align `JWT_SECRET` with Supabase JWT secret
3. Apply schema and seed:

   ```bash
   npm run db:setup
   ```

4. Run tests:

   ```bash
   RUN_DB_TESTS=true npm test
   RUN_DB_TESTS=true npm run test:rls
   ```

If integration tests fail with a database error, run `npm run db:migrate && npm run db:seed`.

## Test layout

```text
tests/
├── auth/           # JWT + bootstrap + token lifecycle
├── audit/          # API create/list + tenant isolation (mandatory)
├── db/             # Seed definition + optional Supabase integration
├── rls/            # Row Level Security tenant isolation
└── smoke/          # Build and project health checks
```

## Environment variables used by tests

| Variable | Required for | Description |
|----------|--------------|-------------|
| `RUN_DB_TESTS` | Live integration | Set to `true` to enable Supabase tests |
| `SUPABASE_URL` | Live DB / RLS | Supabase project base URL |
| `JWT_SECRET` | Auth + RLS tests | Must match Supabase JWT secret |
| `SUPABASE_ANON_KEY` | Audit API, RLS tests | Required — anon key + JWT enforces RLS |
| `DATABASE_URL` | `db:migrate` only | Postgres URI for schema migration |

Test files load `.env` via `tests/*/load-env.ts` before importing Supabase clients.

## CI recommendation

- **Default CI job:** `npm test` — validates code and offline assertions, no credentials needed
- **Optional CI job:** `RUN_DB_TESTS=true npm test` + `npm run test:rls` after `db:setup` — validates live Supabase integration

## Related Docs

- [E2E Walkthrough](e2e-walkthrough.md) — hands-on verification steps
- [API](api.md) — endpoint reference
- [Authentication](authentication.md) — JWT and token lifecycle
