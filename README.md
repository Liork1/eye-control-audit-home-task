# Audit Log Service

Multi-tenant audit log service and viewer built with Next.js, Supabase, and JWT authentication.

## Quick Start

```bash
npm install
cp .env.example .env   # fill in Supabase credentials and JWT secret
npm run dev
```

Open [http://localhost:3000/?tenant_id=tenant-a&user_id=user-1](http://localhost:3000/?tenant_id=tenant-a&user_id=user-1)

## Environment Variables

| Variable | Description |
|----------|-------------|
| `SUPABASE_URL` | Supabase project base URL (no `/rest/v1/` suffix) |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key for server-side DB access |
| `JWT_SECRET` | Must match Supabase JWT secret (Project Settings → API) |
| `DATABASE_URL` | Postgres connection URI (required for `db:migrate`) |

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Production build |
| `npm run db:migrate` | Apply database schema (requires `DATABASE_URL`) |
| `npm run db:seed` | Seed audit log data via service-role client |
| `npm run db:setup` | Run migrate + seed |
| `npm test` | Run Jest tests (offline by default) |
| `RUN_DB_TESTS=true npm test` | Also run live Supabase seed integration tests — see [Testing](docs/testing.md#run_db_tests) |
| `npm run test:rls` | Run RLS-specific tests |

## Documentation

- [`docs/plan.md`](docs/plan.md) — implementation plan
- [`docs/testing.md`](docs/testing.md) — test commands, `RUN_DB_TESTS`, and CI guidance

## Project Status

- [x] Phase 1: Project scaffolding
- [x] Phase 2: Database schema & seed
- [x] Phase 3: Authentication
- [ ] Phase 4: Audit API (in review)
- [ ] Phase 5: Frontend
- [ ] Phase 6: RLS tests
- [ ] Phase 7: Documentation
