# Architecture

## Overview

A single **Next.js 15** application (App Router) serves both the React frontend and API routes. **Supabase PostgreSQL** is the sole data store. Tenant isolation is enforced in two independent layers:

1. **Application layer** — `tenant_id` and `user_id` come exclusively from validated JWT claims. Query params, headers, and request body values for `tenant_id` are ignored for authorization.
2. **Database layer** — Supabase Row Level Security (RLS) restricts `audit_log` rows by `tenant_id` extracted from the JWT via `auth.jwt()`.

```
┌─────────────────────────────────────────────────────────────┐
│                        Browser                              │
│  URL: ?tenant_id=...&user_id=...                            │
│  Token stored in memory (React state)                       │
└──────────────────────────┬──────────────────────────────────┘
                           │ Authorization: Bearer <jwt>
                           ▼
┌─────────────────────────────────────────────────────────────┐
│              Next.js App (single process)                   │
│  ┌──────────────┐    ┌──────────────────────────────────┐  │
│  │  Frontend    │    │  API Routes                      │  │
│  │  / (page)    │───▶│  POST /api/auth/bootstrap        │  │
│  │  Audit table │    │  POST /api/audit                 │  │
│  │  + filters   │    │  GET  /api/audit                 │  │
│  └──────────────┘    └──────────────┬───────────────────┘  │
│                                     │ service-role client    │
└─────────────────────────────────────┼────────────────────────┘
                                      ▼
┌─────────────────────────────────────────────────────────────┐
│                    Supabase PostgreSQL                      │
│  Tables: audit_log, issued_tokens                           │
│  RLS: tenant_id = (auth.jwt() ->> 'tenant_id')            │
└─────────────────────────────────────────────────────────────┘
```

## Key Components

| Layer | Path | Responsibility |
|-------|------|----------------|
| Frontend | `src/app/page.tsx` | Bootstrap auth from URL, render audit table + filters |
| Hooks | `src/hooks/useAuth.ts`, `src/hooks/useAuditLogs.ts` | Token lifecycle and API calls |
| Auth API | `src/app/api/auth/bootstrap/route.ts` | Issue JWT, record in `issued_tokens` |
| Audit API | `src/app/api/audit/route.ts` | Create and list audit entries (tenant-scoped) |
| Auth lib | `src/lib/auth.ts`, `src/lib/jwt.ts`, `src/lib/token-store.ts` | JWT sign/verify, token lifecycle |
| DB client | `src/lib/supabase.ts` | Service-role Supabase client (server-side) |
| RLS testing | `src/lib/supabase-user.ts` | User-scoped client for RLS integration tests |

## Design Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Framework | Next.js 15 App Router | Unified frontend + API in one deployable unit |
| Server DB access | Service-role Supabase client | Full server-side control; tenant filter applied in route handlers |
| JWT library | `jose` (HS256) | Lightweight, works in Next.js and Jest |
| JWT secret | `JWT_SECRET` env var | Must match Supabase project JWT secret for RLS |
| Token tracking | `issued_tokens` table | Lifecycle only (`ACTIVE` / `EXPIRED`); identity stays in JWT claims |
| Test runner | Jest | Standard for Next.js; integration tests call route handlers directly |

## Security Model

**Authorization source of truth:** decoded JWT claims after signature, expiry, and `issued_tokens` lifecycle checks.

**Never trusted for authorization:**

- `tenant_id` query parameter
- `X-Tenant-Id` or similar headers
- `tenant_id` in request body

**Defense in depth:**

- API routes filter by JWT `tenant_id` before querying
- RLS policies block cross-tenant reads/inserts at the database level (verified in `tests/rls/`)

## Related Docs

- [Authentication](authentication.md)
- [Database](database.md)
- [API](api.md)
- [Testing](testing.md)
