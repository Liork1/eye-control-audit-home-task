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

No RLS on `issued_tokens` — accessed only via service-role key on the server.

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

**How it works:** When a request includes `Authorization: Bearer <jwt>`, Supabase evaluates `auth.jwt()` against the token. The `tenant_id` claim must match the row's `tenant_id`.

**API note:** Server routes use the service-role client, which bypasses RLS. Tenant filtering is applied in application code (`eq("tenant_id", claims.tenant_id)`). RLS is verified independently in `tests/rls/`.

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

# Seed audit data (requires SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY)
npm run db:seed

# Both
npm run db:setup
```

Migration file: `supabase/migrations/001_initial_schema.sql`

Seed reference SQL: `supabase/seed.sql`  
Seed script: `scripts/seed.ts` + `scripts/seed-data.ts`

## Environment Variables

| Variable | Used by | Description |
|----------|---------|-------------|
| `DATABASE_URL` | `db:migrate` | Direct Postgres connection URI |
| `SUPABASE_URL` | `db:seed`, API, tests | Supabase project base URL |
| `SUPABASE_SERVICE_ROLE_KEY` | `db:seed`, API | Server-side DB access |
| `JWT_SECRET` | JWT signing, RLS tests | Must match Supabase JWT secret |

## Related Docs

- [Architecture](architecture.md)
- [Authentication](authentication.md)
- [Testing](testing.md) — seed and RLS verification
