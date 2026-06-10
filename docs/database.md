# Database

## Overview

PostgreSQL hosted on Supabase with two tables: `audit_log` (tenant-scoped audit entries) and `issued_tokens` (JWT lifecycle tracking). Row Level Security is enabled on `audit_log`.

## Schema

### `audit_log`

| Column | Type | Notes |
|--------|------|-------|
| `id` | `UUID` | Primary key, auto-generated |
| `tenant_id` | `TEXT` | Tenant identifier (required) |
| `user_id` | `TEXT` | User who performed the action |
| `action` | `TEXT` | Action name (e.g. `PATIENT_VIEWED`) |
| `resource` | `TEXT` | Optional resource identifier |
| `payload` | `JSONB` | Optional structured metadata |
| `created_at` | `TIMESTAMPTZ` | Defaults to `now()` |

**Indexes:**

- `(tenant_id, created_at DESC)` — list queries per tenant
- `(tenant_id, action)` — action filter per tenant

### `issued_tokens`

| Column | Type | Notes |
|--------|------|-------|
| `id` | `UUID` | Primary key |
| `token_jti` | `TEXT` | Unique; matches JWT `jti` |
| `status` | `TEXT` | `ACTIVE`, `EXPIRED`, or `REVOKED` |
| `expires_at` | `TIMESTAMPTZ` | Token expiration |
| `created_at` | `TIMESTAMPTZ` | When token was issued |

RLS enabled on `issued_tokens`. Token lookup/update uses anon key + caller JWT (`jti` claim). Bootstrap insert uses direct Postgres.

## Row Level Security

RLS is enabled on `audit_log`. Policies use the tenant ID from the JWT:

```sql
-- SELECT: tenant can only read own rows
CREATE POLICY audit_log_select ON audit_log
    FOR SELECT
    USING (tenant_id = (auth.jwt() ->> 'tenant_id'));

-- INSERT: tenant can only insert with matching tenant_id
CREATE POLICY audit_log_insert ON audit_log
    FOR INSERT
    WITH CHECK (tenant_id = (auth.jwt() ->> 'tenant_id'));
```

### `issued_tokens` (Phase B)

```sql
ALTER TABLE issued_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY issued_tokens_select ON issued_tokens
    FOR SELECT
    USING (token_jti = (auth.jwt() ->> 'jti'));

CREATE POLICY issued_tokens_update ON issued_tokens
    FOR UPDATE
    USING (token_jti = (auth.jwt() ->> 'jti'))
    WITH CHECK (token_jti = (auth.jwt() ->> 'jti'));
```

Bootstrap `INSERT` bypasses RLS via direct Postgres (`DATABASE_URL`).

**How it works:** When a request includes `Authorization: Bearer <jwt>`, Supabase evaluates `auth.jwt()` against the token. The `tenant_id` claim must match the row's `tenant_id`.

**API note:** All runtime DB access uses the anon key with the caller's JWT — RLS enforces tenant isolation on `audit_log` and `jti` scoping on `issued_tokens`. Bootstrap token insert is the one exception (direct Postgres via `DATABASE_URL`).

## Seed Data

Seed script (`npm run db:seed`) inserts **16 rows** across three tenants:

| Tenant | Sample actions |
|--------|----------------|
| `tenant-a` | `PATIENT_VIEWED`, `RECORD_UPDATED`, `LOGIN`, etc. |
| `tenant-b` | `APPOINTMENT_SCHEDULED`, `PRESCRIPTION_ISSUED`, etc. |
| `tenant-c` | `LAB_RESULT_VIEWED`, `CONSENT_SIGNED`, etc. |

Rows span multiple timestamps and include varied `resource` and `payload` values.

## Setup Commands

```bash
# Apply migration (requires DATABASE_URL)
npm run db:migrate

# Seed audit data (requires DATABASE_URL)
npm run db:seed

# Both
npm run db:setup
```

Migration files: `supabase/migrations/001_initial_schema.sql`, `002_issued_tokens_rls.sql`

Seed reference SQL: `supabase/seed.sql`  
Seed script: `scripts/seed.ts` + `scripts/seed-data.ts`

## Environment Variables

| Variable | Used by | Description |
|----------|---------|-------------|
| `DATABASE_URL` | `db:migrate`, `db:seed`, bootstrap | Direct Postgres connection URI |
| `SUPABASE_URL` | API, tests | Supabase project base URL |
| `SUPABASE_ANON_KEY` | API, tests | Anon key + caller JWT (RLS) |
| `JWT_SECRET` | JWT signing, RLS tests | Must match Supabase JWT secret |

## Related Docs

- [Architecture](architecture.md)
- [Authentication](authentication.md)
- [Testing](testing.md) — seed and RLS verification
