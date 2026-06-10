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
│                                     │ anon key + caller JWT │
│                                     │ (pg for bootstrap insert)│
└─────────────────────────────────────┼────────────────────────┘
                                      ▼
┌─────────────────────────────────────────────────────────────┐
│                    Supabase PostgreSQL                      │
│  Tables: audit_log, issued_tokens                           │
│  RLS: audit_log by tenant_id; issued_tokens by jti        │
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
| DB client | `src/lib/supabase-user.ts` | Anon key + caller JWT (RLS enforced) |
| Admin / bootstrap | `src/lib/pg.ts` | Direct Postgres for bootstrap insert, seed, migrate |

## Design Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Framework | Next.js 15 App Router | Unified frontend + API in one deployable unit |
| API DB access | Anon key + caller JWT | RLS enforced on `audit_log` and `issued_tokens` |
| Bootstrap token insert | Direct Postgres (`DATABASE_URL`) | Unauthenticated — no JWT exists yet at insert time |
| Seed / migrate | Direct Postgres (`DATABASE_URL`) | Offline scripts only |
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

- Audit API connects with anon key + caller JWT — RLS enforces tenant isolation at the database
- API routes also filter by JWT `tenant_id` in query code (belt-and-suspenders)
- RLS behavior verified in `tests/rls/` and live audit integration tests

## Related Docs

- [Authentication](authentication.md)
- [Database](database.md)
- [API](api.md)
- [Testing](testing.md)
