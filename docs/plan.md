# Audit Log Service — Implementation Plan

## Architecture Overview

A single Next.js 15 application (App Router) serving both the React frontend and API routes. Supabase PostgreSQL is the sole data store. The backend uses the Supabase service-role client for server-side operations, with tenant isolation enforced in two layers:

1. **Application layer** — JWT claims (`tenant_id`, `user_id`) are the only source of truth for authorization. Any `tenant_id` in query params, headers, or request body is ignored.
2. **Database layer** — Supabase Row Level Security (RLS) policies restrict rows by `tenant_id` extracted from the JWT via `auth.jwt()`.

```
┌─────────────────────────────────────────────────────────────┐
│                        Browser                              │
│  URL: ?tenant_id=...&user_id=...                            │
│  Token stored in memory (React state)                       │
└──────────────────────────┬──────────────────────────────────┘
                           │ JWT in Authorization header
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
│  RLS: tenant_id = (auth.jwt() ->> 'tenant_id')              │
└─────────────────────────────────────────────────────────────┘
```

### Key Design Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Framework | Next.js 15 App Router | Required; unified frontend + API |
| DB client | `@supabase/supabase-js` (service role on server) | Required by spec; bypasses RLS for admin ops, RLS tested separately |
| JWT library | `jose` | Lightweight, edge-compatible, standard HS256 signing |
| JWT secret | `JWT_SECRET` env var (added) | Required for signing; not in spec but necessary |
| Token storage | `issued_tokens` table | Required by spec; logical delete only |
| Test runner | Jest + Supertest | Jest is the standard choice for Next.js projects |
| RLS testing | Direct Supabase client with user-scoped JWT | Proves DB-level isolation independently of API |

### Environment Variables

```env
SUPABASE_URL=              # Base URL (no /rest/v1/ suffix)
SUPABASE_SERVICE_ROLE_KEY=
JWT_SECRET=                # Added for JWT signing
```

> **Note:** The current `.env` has `SUPABASE_URL` ending in `/rest/v1/`. This will be normalized to the project base URL (`https://<ref>.supabase.co`) during setup.

---

## Database Design

### Tables

#### `audit_log`

```sql
CREATE TABLE audit_log (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id  TEXT NOT NULL,
    user_id    TEXT NOT NULL,
    action     TEXT NOT NULL,
    resource   TEXT,
    payload    JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_audit_log_tenant_created ON audit_log (tenant_id, created_at DESC);
CREATE INDEX idx_audit_log_tenant_action  ON audit_log (tenant_id, action);
```

#### `issued_tokens`

Tracks token **lifecycle only** — not identity. `tenant_id` and `user_id` live exclusively in the JWT claims; duplicating them in this table would be redundant and risk drift if claims and DB ever disagree.

```sql
CREATE TABLE issued_tokens (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    token_jti  TEXT UNIQUE NOT NULL,
    status     TEXT NOT NULL DEFAULT 'ACTIVE',  -- ACTIVE | EXPIRED | REVOKED
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_issued_tokens_jti ON issued_tokens (token_jti);
```

On validation: verify JWT signature + expiry, then look up `token_jti` and confirm `status = ACTIVE`. Identity (`tenant_id`, `user_id`) is read from the decoded JWT — never from this table.

### Row Level Security

RLS enabled on `audit_log`. `issued_tokens` is server-only (no RLS; accessed exclusively via service-role key).

**Chosen approach:** Custom JWT signed with `JWT_SECRET`, passed to Supabase via `Authorization: Bearer <jwt>`. Supabase reads claims via `auth.jwt() ->> 'tenant_id'`.

> Supabase must be configured to accept custom JWTs signed with the same secret (Project Settings → API → JWT Secret). We will align `JWT_SECRET` with the Supabase JWT secret.

```sql
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

-- SELECT: tenant can only read own rows
CREATE POLICY audit_log_select ON audit_log
    FOR SELECT
    USING (tenant_id = (auth.jwt() ->> 'tenant_id'));

-- INSERT: tenant can only insert with matching tenant_id
CREATE POLICY audit_log_insert ON audit_log
    FOR INSERT
    WITH CHECK (tenant_id = (auth.jwt() ->> 'tenant_id'));
```

### Seed Data

Minimum 14 rows across three tenants (`tenant-a`, `tenant-b`, `tenant-c`) with varied actions, resources, and timestamps spanning multiple days. Delivered as `supabase/seed.sql` and runnable via `npm run db:seed`.

---

## Authentication Flow

```
1. User opens:  /?tenant_id=tenant-a&user_id=user-1
2. Frontend reads tenant_id + user_id from URL search params
3. Frontend calls POST /api/auth/bootstrap  { tenant_id, user_id }
4. Backend:
   a. Generates JWT (HS256, 24h TTL) with claims { tenant_id, user_id, jti }
   b. Inserts row into issued_tokens (token_jti, status=ACTIVE, expires_at=now+24h)
   c. Returns { token }
5. Frontend stores token in React state (memory only, no localStorage)
6. All subsequent API calls include:  Authorization: Bearer <token>
```

### Token Lifecycle

| Event | Behavior |
|-------|----------|
| Bootstrap | New token issued, `issued_tokens.status = ACTIVE` |
| API request | Validate JWT signature, expiry, and `jti` exists with `status = ACTIVE` |
| Expiry (lazy) | On validation failure or scheduled check, set `status = EXPIRED` (never DELETE) |
| Re-bootstrap | New token issued; old tokens remain with EXPIRED status |

### MVP Constraints

- No password, no user approval gate — auto-approved on bootstrap.
- `tenant_id` and `user_id` from bootstrap body are trusted for MVP (no user registry).

---

## Authorization Model

### Source of Truth

```
tenant_id  ←  JWT claim only
user_id    ←  JWT claim only
```

### Ignored Inputs (bypass attempts)

| Vector | Example | Result |
|--------|---------|--------|
| Query param | `?tenant_id=tenant-b` | Ignored |
| Header | `X-Tenant-Id: tenant-b` | Ignored |
| Request body | `{ "tenant_id": "tenant-b" }` | Ignored |

### Enforcement Points

1. **API middleware/helper** (`lib/auth.ts`) — extracts and validates JWT, returns `{ tenant_id, user_id }`.
2. **API route handlers** — use claims for all DB queries; never merge client-supplied tenant.
3. **Supabase RLS** — second line of defense at the database level.

---

## API Design

### `POST /api/auth/bootstrap`

| | |
|---|---|
| Auth | None |
| Body | `{ "tenant_id": string, "user_id": string }` |
| Response | `{ "token": string }` |
| Errors | `400` missing fields |

### `POST /api/audit`

| | |
|---|---|
| Auth | Bearer JWT (required) |
| Body | `{ "action": string, "resource"?: string, "payload"?: object }` |
| Behavior | Insert row with `tenant_id` + `user_id` from JWT |
| Response | `201` `{ "id": uuid, ... }` |
| Errors | `401` no/invalid token, `400` missing action |

### `GET /api/audit`

| | |
|---|---|
| Auth | Bearer JWT (required) |
| Query filters | `action`, `resource`, `from` (ISO date), `to` (ISO date) |
| Behavior | Return rows where `tenant_id` = JWT claim; apply optional filters |
| Response | `200` `{ "data": [...] }` |
| Errors | `401` no/invalid token |

All list/create operations scope by JWT `tenant_id` in the WHERE clause regardless of any client-supplied tenant hints.

---

## Frontend Design

Single page at `/` (App Router).

### Layout

```
┌─────────────────────────────────────────────┐
│  Audit Log Viewer          tenant-a / user-1│
├─────────────────────────────────────────────┤
│  Action: [dropdown]   From: [date] To: [date]│
├─────────────────────────────────────────────┤
│  Timestamp │ User │ Action │ Resource        │
│  ...      │ ...  │ ...    │ ...             │
└─────────────────────────────────────────────┘
```

### Flow

1. On mount, parse `tenant_id` + `user_id` from `window.location.search`.
2. If missing, show error state with instructions.
3. Call bootstrap → store token in `useState`.
4. Fetch `GET /api/audit` with filters; re-fetch on filter change.
5. Minimal styling with Tailwind CSS (included with Next.js setup).

### State

- `token` — in-memory React state only
- `filters` — `{ action, from, to }`
- `logs` — fetched audit entries
- `loading` / `error` — UI feedback

---

## Testing Strategy

### Test Stack

- **Jest** — unit and integration tests
- **Supertest** — HTTP-level API tests against Next.js route handlers
- Direct **Supabase client** — RLS positive/negative tests

### Mandatory Tests

#### Integration: Tenant Isolation (API layer)

Authenticate as `tenant-a` / `user-1`, then attempt:

| Test | Request | Expected |
|------|---------|----------|
| Baseline | `GET /api/audit` | Only tenant-a rows |
| Query bypass | `GET /api/audit?tenant_id=tenant-b` | Still only tenant-a rows |
| Header bypass | `GET /api/audit` + `X-Tenant-Id: tenant-b` | Still only tenant-a rows |
| Body bypass | `POST /api/audit` with `{ tenant_id: "tenant-b", ... }` | Insert uses tenant-a from JWT |

#### RLS Tests (Database layer)

| Test | Setup | Expected |
|------|-------|----------|
| Positive | Supabase client with tenant-a JWT | Can SELECT tenant-a rows |
| Negative | Supabase client with tenant-a JWT | Cannot SELECT tenant-b rows (empty/error) |

#### Additional Tests

- JWT validation (missing, expired, invalid signature)
- Audit creation (POST returns 201, correct fields)
- Action filter (`?action=PATIENT_VIEWED`)
- Date range filter (`?from=...&to=...`)
- Bootstrap returns valid token

### Running Tests

```bash
npm test          # all tests
npm run test:rls  # RLS-specific (requires Supabase connection)
```

---

## Execution Phases

Each phase follows the approval workflow: describe → wait → implement → test → summarize → wait.

---

### Phase 1: Project Scaffolding

**What:** Initialize Next.js project with TypeScript, Tailwind, Jest, and project structure.

**Files created:**
- `package.json`, `tsconfig.json`, `next.config.ts`, `tailwind.config.ts`
- `jest.config.js`
- `src/app/layout.tsx`, `src/app/page.tsx` (placeholder)
- `src/lib/supabase.ts`, `src/lib/auth.ts` (stubs)
- `.env.example`
- `README.md` (skeleton)

**Files modified:**
- `.env` — normalize `SUPABASE_URL`, add `JWT_SECRET`

**Tests:** Smoke test that project builds (`npm run build`).

---

### Phase 2: Database Schema & Seed

**What:** Create SQL migrations, apply to Supabase, seed 14+ rows.

**Files created:**
- `supabase/migrations/001_initial_schema.sql`
- `supabase/seed.sql`
- `scripts/seed.ts` (or `npm run db:seed` script)

**Tests:** Verify seed data count and tenant distribution via script assertion.

---

### Phase 3: Authentication

**What:** JWT bootstrap endpoint, token tracking, validation middleware.

**Files created:**
- `src/app/api/auth/bootstrap/route.ts`
- `src/lib/jwt.ts`
- `src/lib/token-store.ts`

**Files modified:**
- `src/lib/auth.ts` — full implementation

**Tests:**
- Bootstrap returns token with correct claims
- Expired/invalid tokens rejected
- Token recorded in `issued_tokens`

---

### Phase 4: Audit API

**What:** POST and GET `/api/audit` with tenant-scoped queries and filters.

**Files created:**
- `src/app/api/audit/route.ts`

**Tests:**
- Create audit entry
- List with action/date filters
- Tenant isolation bypass attempts (mandatory)

---

### Phase 5: Frontend

**What:** Single-page audit viewer with bootstrap flow, table, and filters.

**Files modified:**
- `src/app/page.tsx`
- `src/components/AuditTable.tsx`
- `src/components/AuditFilters.tsx`
- `src/hooks/useAuth.ts`, `src/hooks/useAuditLogs.ts`

**Tests:** Manual verification checklist; optional Playwright smoke test.

---

### Phase 6: RLS Tests

**What:** Direct Supabase client tests proving DB-level tenant isolation.

**Files created:**
- `tests/rls/tenant-isolation.test.ts`

**Tests:** Positive and negative RLS cases.

---

### Phase 7: Documentation & README

**What:** Complete documentation set and 5-minute startup README.

**Files created:**
- `docs/architecture.md`
- `docs/authentication.md`
- `docs/database.md`
- `docs/api.md`
- `docs/testing.md`
- `docs/deployment.md`
- `docs/e2e-walkthrough.md`

**Files modified:**
- `README.md` — full quickstart

**Tests:** Follow README from scratch to verify < 5 min startup.

---

## Known Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Supabase JWT secret mismatch | Document alignment step; validate in bootstrap test |
| `.env` URL has `/rest/v1/` suffix | Normalize in `supabase.ts` client factory |
| RLS requires Supabase to trust custom JWT | Use Supabase project JWT secret as `JWT_SECRET` |
| Service role bypasses RLS in API tests | RLS tested separately with user-scoped client |

---

## Success Criteria Checklist

- [ ] JWT authentication works (bootstrap + validation)
- [ ] Tenant isolation in backend authorization
- [ ] Tenant isolation in Supabase RLS
- [ ] Seed data: 14+ rows across 3 tenants
- [ ] Frontend displays audit logs with filters
- [ ] Integration security tests pass
- [ ] RLS tests pass
- [ ] Documentation complete under `/docs`
- [ ] README enables startup in under 5 minutes
