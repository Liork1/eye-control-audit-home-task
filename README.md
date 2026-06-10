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

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Production build |
| `npm test` | Run Jest tests |
| `npm run test:rls` | Run RLS-specific tests |

## Documentation

See [`docs/plan.md`](docs/plan.md) for the implementation plan. Full documentation will be added in Phase 7.

## Project Status

- [x] Phase 1: Project scaffolding
- [ ] Phase 2: Database schema & seed
- [ ] Phase 3: Authentication
- [ ] Phase 4: Audit API
- [ ] Phase 5: Frontend
- [ ] Phase 6: RLS tests
- [ ] Phase 7: Documentation
