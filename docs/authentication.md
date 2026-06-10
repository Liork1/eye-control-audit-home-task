# Authentication

## Overview

Authentication is JWT-based with no password. On first load, the frontend reads `tenant_id` and `user_id` from the URL, calls a bootstrap endpoint, and stores the returned token in memory.

## Bootstrap Flow

```
Browser loads /?tenant_id=tenant-a&user_id=user-1
        │
        ▼
POST /api/auth/bootstrap
{ "tenant_id": "tenant-a", "user_id": "user-1" }
        │
        ▼
Server signs JWT (24h TTL) + records jti in issued_tokens
        │
        ▼
{ "token": "<jwt>" }
        │
        ▼
Frontend stores token in React state (memory only)
        │
        ▼
Subsequent API calls: Authorization: Bearer <jwt>
```

## JWT Claims

| Claim | Description |
|-------|-------------|
| `tenant_id` | Tenant the user belongs to |
| `user_id` | User identifier within the tenant |
| `jti` | Unique token ID for lifecycle tracking |
| `role` | `authenticated` — required for Supabase RLS evaluation |
| `iat` / `exp` | Issued-at and expiration (24 hours) |

Example decoded payload:

```json
{
  "tenant_id": "tenant-a",
  "user_id": "user-1",
  "jti": "550e8400-e29b-41d4-a716-446655440000"
}
```

## Token Lifecycle (`issued_tokens`)

Every issued token is recorded in the database:

| Field | Purpose |
|-------|---------|
| `token_jti` | Matches JWT `jti` claim |
| `status` | `ACTIVE`, `EXPIRED`, or `REVOKED` |
| `expires_at` | Expected expiration timestamp |

**Important:** `issued_tokens` tracks lifecycle only. `tenant_id` and `user_id` are **not** stored in this table — they live exclusively in JWT claims to avoid drift.

On each protected request, `requireAuth()`:

1. Extracts `Bearer` token from `Authorization` header
2. Verifies JWT signature and expiry (`jose`)
3. Looks up `token_jti` in `issued_tokens` via anon key + caller JWT (RLS: own `jti` only)
4. Confirms `status === ACTIVE`
5. Marks token `EXPIRED` if past `expires_at` (RLS-scoped update)
6. Returns `{ tenant_id, user_id, jti }` claims

Bootstrap `INSERT` into `issued_tokens` uses direct Postgres (`DATABASE_URL`) because no JWT exists yet.

## Protected Route Usage

API routes call `requireAuth(request)` at the top of the handler:

```typescript
const claims = await requireAuth(request);
// claims.tenant_id and claims.user_id are the only trusted identity
```

On failure, routes return `401` with `{ "error": "<message>" }`.

## JWT Secret Alignment

`JWT_SECRET` in `.env` **must match** the Supabase project JWT secret:

**Supabase Dashboard → Project Settings → API → JWT Secret**

This alignment is required for:

- Application JWT signing/verification
- Supabase RLS policies reading `auth.jwt() ->> 'tenant_id'`

## RLS-Scoped API Access

Protected audit routes use `createAuthenticatedClient()` (`src/lib/supabase-user.ts`): the anon key plus the caller's `Authorization: Bearer` JWT. Supabase evaluates RLS on every audit read/write. Bootstrap tokens include `role: authenticated` for this to work.

## Related Docs

- [API](api.md) — bootstrap endpoint details
- [Database](database.md) — `issued_tokens` schema
- [E2E Walkthrough](e2e-walkthrough.md) — hands-on auth flow
