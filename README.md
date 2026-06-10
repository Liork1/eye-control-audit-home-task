# Audit Log Service

Multi-tenant audit log service and viewer built with Next.js, Supabase, and JWT authentication.

## Quick Start (< 5 minutes)

**Prerequisites:** Node.js 18+, a Supabase project with credentials ready.

```bash
# 1. Install dependencies
npm install

# 2. Configure environment
cp .env.example .env
# Edit .env — see Environment Variables below

# 3. Set up database (first time only)
npm run db:setup

# 4. Start the app
npm run dev
```

Open the viewer:

**[http://localhost:3000/?tenant_id=tenant-a&user_id=user-1](http://localhost:3000/?tenant_id=tenant-a&user_id=user-1)**

You should see audit log entries for tenant-a. Switch tenants by changing URL params:

```text
/?tenant_id=tenant-b&user_id=user-2
```

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `SUPABASE_URL` | Yes | Supabase project base URL (no `/rest/v1/` suffix) |
| `SUPABASE_ANON_KEY` | Yes | Anon/public key — all API DB access uses caller JWT (RLS enforced) |
| `JWT_SECRET` | Yes | Must match Supabase JWT secret (Project Settings → API) |
| `DATABASE_URL` | Yes | Postgres URI — migrations, seed, and bootstrap token insert |

> **Important:** `JWT_SECRET` must equal your Supabase project's JWT secret, or authentication and RLS will fail.

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Production build |
| `npm start` | Run production server (after build) |
| `npm run db:migrate` | Apply database schema (requires `DATABASE_URL`) |
| `npm run db:seed` | Seed audit log data via service-role client |
| `npm run db:setup` | Run migrate + seed |
| `npm test` | Run Jest tests (offline by default) |
| `RUN_DB_TESTS=true npm test` | Include live Supabase integration tests |
| `npm run test:rls` | Run RLS tenant-isolation tests |

## API Examples

Bootstrap a token:

```bash
curl -X POST http://localhost:3000/api/auth/bootstrap \
  -H "Content-Type: application/json" \
  -d '{"tenant_id":"tenant-a","user_id":"user-1"}'
```

List audit logs:

```bash
curl http://localhost:3000/api/audit \
  -H "Authorization: Bearer <token>"
```

Create an audit entry:

```bash
curl -X POST http://localhost:3000/api/audit \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"action":"PATIENT_VIEWED","resource":"patient/123"}'
```

See [docs/api.md](docs/api.md) for full API reference.

## Running Tests

```bash
# Fast offline tests (no Supabase needed)
npm test

# Live database integration (requires .env + seeded DB)
RUN_DB_TESTS=true npm test

# RLS tenant isolation at database level
RUN_DB_TESTS=true npm run test:rls
```

See [docs/testing.md](docs/testing.md) for details on `RUN_DB_TESTS` and test layout.

## Documentation

| Doc | Description |
|-----|-------------|
| [docs/plan.md](docs/plan.md) | Implementation plan |
| [docs/architecture.md](docs/architecture.md) | System design and security model |
| [docs/authentication.md](docs/authentication.md) | JWT bootstrap and token lifecycle |
| [docs/database.md](docs/database.md) | Schema, RLS, and seed data |
| [docs/api.md](docs/api.md) | API reference with examples |
| [docs/testing.md](docs/testing.md) | Test commands and CI guidance |
| [docs/deployment.md](docs/deployment.md) | Production deployment |
| [docs/e2e-walkthrough.md](docs/e2e-walkthrough.md) | Step-by-step verification guide |

## Project Status

- [x] Phase 1: Project scaffolding
- [x] Phase 2: Database schema & seed
- [x] Phase 3: Authentication
- [x] Phase 4: Audit API
- [x] Phase 5: Frontend
- [x] Phase 6: RLS tests
- [x] Phase 7: Documentation
