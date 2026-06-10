# Deployment

## Overview

The application is a standard Next.js 15 app. Any developer (or hosting platform) needs:

1. Node.js dependencies installed
2. Environment variables configured
3. Database schema applied and seed data loaded
4. The app built and started

The database lives in **Supabase PostgreSQL** and is set up via project scripts — not automatically during `npm run build`.

---

## Developer Setup (first time)

Every developer cloning the repo should run:

```bash
# 1. Install dependencies
npm install

# 2. Configure environment
cp .env.example .env
# Edit .env — see Environment Variables below

# 3. Set up database (schema + seed)
npm run db:setup

# 4. Start development server
npm run dev
```

Open [http://localhost:3000/?tenant_id=tenant-a&user_id=user-1](http://localhost:3000/?tenant_id=tenant-a&user_id=user-1)

### Verify setup (recommended)

```bash
# Offline tests (no Supabase needed)
npm test

# Live DB integration (requires seeded Supabase)
RUN_DB_TESTS=true npm test

# RLS tenant isolation
RUN_DB_TESTS=true npm run test:rls

# Production build check
npm run build
```

---

## Database Initial Setup

Database setup is a **one-time step per Supabase project** (re-run safe: migrate is idempotent, seed is idempotent).

### Option A — all-in-one (recommended)

```bash
npm run db:setup
```

Runs `db:migrate` then `db:seed`.

### Option B — step by step

```bash
# Apply schema (requires DATABASE_URL)
npm run db:migrate

# Insert seed data (requires SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY)
npm run db:seed
```

| Script | Command | Requires | What it does |
|--------|---------|----------|--------------|
| Migrate | `npm run db:migrate` | `DATABASE_URL` | Applies `supabase/migrations/001_initial_schema.sql` via `scripts/apply-schema.ts` |
| Seed | `npm run db:seed` | `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` | Inserts 16 audit rows across 3 tenants via `scripts/seed.ts` |
| Setup | `npm run db:setup` | All of the above | Runs migrate + seed |

**When to re-run:**

- **New developer / fresh Supabase project** — run `db:setup`
- **Schema changed** — run `db:migrate`
- **Seed data missing or wiped** — run `db:seed`

> Migrations use `DATABASE_URL` (direct Postgres). Seeding uses the Supabase service-role client. Both are run from your machine or CI — not as part of `npm run build`.

---

## Scripts Reference

| Command | When to run | Description |
|---------|-------------|-------------|
| `npm install` | First clone | Install dependencies |
| `npm run db:setup` | First time / new DB | Apply schema + seed data |
| `npm run db:migrate` | Schema changes | Apply migration SQL |
| `npm run db:seed` | Missing seed data | Insert audit log seed rows |
| `npm run dev` | Daily development | Start dev server (port 3000) |
| `npm test` | Before commit / CI | Jest tests (offline by default) |
| `RUN_DB_TESTS=true npm test` | After db:setup | Include live Supabase integration tests |
| `npm run test:rls` | After db:setup | RLS tenant-isolation tests only |
| `npm run build` | Before deploy | Production build |
| `npm start` | Production | Run built app (after `npm run build`) |
| `npm run lint` | Optional | ESLint |

---

## Environment Variables

Copy `.env.example` to `.env` and fill in:

| Variable | Required | Used by | Description |
|----------|----------|---------|-------------|
| `SUPABASE_URL` | Yes | API, seed, tests | `https://<ref>.supabase.co` (no `/rest/v1/` suffix) |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | API, seed, tests | Server-side DB access |
| `JWT_SECRET` | Yes | API, auth, RLS tests | Must match Supabase JWT secret |
| `DATABASE_URL` | For migrate | `db:migrate` | Postgres connection URI |
| `SUPABASE_ANON_KEY` | Optional | `test:rls` | Anon key; falls back to service role |

For production hosting, set the same runtime variables (`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `JWT_SECRET`) in the platform's environment config. `DATABASE_URL` is only needed where you run migrations.

---

## Production Deployment

```bash
npm install
npm run build
npm start
```

Deploy to any Node.js hosting platform (Railway, Render, Docker, etc.) using the same build/start flow and runtime environment variables.

**Before first production deploy:**

1. Run `npm run db:setup` against the production Supabase project (from CI or your machine)
2. Confirm `JWT_SECRET` matches Supabase JWT secret
3. Run `RUN_DB_TESTS=true npm test` and `npm run test:rls` against that environment

---

## JWT Secret Alignment

```text
JWT_SECRET (.env / hosting) === Supabase Project Settings → API → JWT Secret
```

Mismatch causes token verification failures and broken RLS.

---

## Security Checklist

- [ ] `SUPABASE_SERVICE_ROLE_KEY` is server-only (never exposed to the browser)
- [ ] `JWT_SECRET` matches Supabase JWT secret
- [ ] `DATABASE_URL` is not exposed to client-side code
- [ ] RLS is enabled on `audit_log` (applied by migration)
- [ ] Integration tests pass: `RUN_DB_TESTS=true npm test`

---

## Health Verification

After deploy:

```bash
# Bootstrap
curl -X POST https://<your-domain>/api/auth/bootstrap \
  -H "Content-Type: application/json" \
  -d '{"tenant_id":"tenant-a","user_id":"user-1"}'

# List audit logs (use token from above)
curl https://<your-domain>/api/audit \
  -H "Authorization: Bearer <token>"
```

Or open the frontend:

```text
https://<your-domain>/?tenant_id=tenant-a&user_id=user-1
```

---

## Related Docs

- [Database](database.md) — schema and RLS details
- [Testing](testing.md) — test commands and `RUN_DB_TESTS`
- [E2E Walkthrough](e2e-walkthrough.md) — full verification guide
- [README](../README.md) — quick start
