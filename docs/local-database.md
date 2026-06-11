# Local Database (Docker)

Run the full audit-log stack locally without a hosted Supabase project. Docker Compose starts:

- **PostgreSQL 16** — schema, seed data, RLS policies
- **PostgREST** — REST API over the `public` schema
- **nginx gateway** — exposes `/rest/v1/` for `@supabase/supabase-js` compatibility

## Prerequisites

- Docker Desktop (or Docker Engine + Compose v2)
- Node.js 18+

## Quick Start

```bash
# 1. Configure Docker credentials
cp docker/.env.example docker/.env

# 2. Start the stack (detached)
npm run db:up

# 3. Generate a local anon key
node docker/generate-anon-key.mjs

# 4. Configure the app
cp .env.local.example .env
# Paste the anon key from step 3; ensure JWT_SECRET matches docker/.env

# 5. Start the app
npm install
npm run dev
```

Open [http://localhost:3000/?tenant_id=tenant-a&user_id=user-1](http://localhost:3000/?tenant_id=tenant-a&user_id=user-1).

## Architecture

```text
Next.js app (:3000)
  ├── DATABASE_URL  → PostgreSQL (:5432)   — bootstrap token insert, migrations
  └── SUPABASE_URL  → nginx (:54321)       — audit API via PostgREST + RLS
                        └── /rest/v1/ → PostgREST → PostgreSQL
```

## Environment Variables

### Docker (`docker/.env`)

| Variable | Default | Description |
|----------|---------|-------------|
| `DB_USER` | `audit_admin` | PostgreSQL superuser |
| `DB_PASSWORD` | `audit_local_dev_password` | PostgreSQL password |
| `DB_NAME` | `audit_log_db` | Database name |
| `JWT_SECRET` | (see example) | Shared secret for PostgREST and app JWT signing |

### App (`.env` for local Docker)

| Variable | Local value |
|----------|-------------|
| `SUPABASE_URL` | `http://localhost:54321` |
| `SUPABASE_ANON_KEY` | Output of `node docker/generate-anon-key.mjs` |
| `JWT_SECRET` | Must match `docker/.env` |
| `DATABASE_URL` | `postgresql://audit_admin:audit_local_dev_password@localhost:5432/audit_log_db?sslmode=disable` |

## Operational Commands

| Action | Command |
|--------|---------|
| Start (background) | `npm run db:up` |
| View logs | `npm run db:logs` |
| Stop (keep data) | `npm run db:down` |
| Stop + wipe data | `docker compose --env-file docker/.env down -v` |
| Re-init from scratch | `npm run db:reset` |

Init SQL in `docker/init/` runs **once** on first volume creation. Use `db:reset` to wipe and re-seed.

## Connecting from Tools

### DBeaver / pgAdmin / psql

| Field | Value |
|-------|-------|
| Host | `localhost` |
| Port | `5432` |
| Database | `audit_log_db` |
| Username | `audit_admin` |
| Password | `audit_local_dev_password` |
| SSL | Disabled |

```bash
psql "postgresql://audit_admin:audit_local_dev_password@localhost:5432/audit_log_db?sslmode=disable"
```

### PostgREST smoke test

After bootstrapping a token via the app:

```bash
curl "http://localhost:54321/rest/v1/audit_log?select=*&limit=5" \
  -H "apikey: $SUPABASE_ANON_KEY" \
  -H "Authorization: Bearer <your-jwt>"
```

## Schema Changes

Init SQL mirrors `supabase/migrations/`. When migrations change:

1. Update `docker/init/01-schema.sql` to match, **or**
2. Re-apply via npm after the container is running:

```bash
npm run db:migrate
npm run db:seed
```

## Live Tests

```bash
RUN_DB_TESTS=true npm test
RUN_DB_TESTS=true npm run test:rls
```

## Production

This stack is for **local development only**. Production uses hosted Supabase — see [deployment.md](deployment.md).
