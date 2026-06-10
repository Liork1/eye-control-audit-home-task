# End-to-End Walkthrough

This guide walks through the full application flow: setup, authentication, viewing audit logs, creating entries, and verifying tenant isolation.

Estimated time: **15 minutes** (including Supabase setup). If `.env` and database are already configured, the app runs in under 5 minutes — see [README](../README.md).

---

## 1. Prerequisites

- Node.js 18+
- A Supabase project
- `.env` filled from `.env.example`

Required values:

```env
SUPABASE_URL=https://<ref>.supabase.co
SUPABASE_ANON_KEY=<anon-key>
JWT_SECRET=<same as Supabase JWT secret>
DATABASE_URL=postgresql://...
```

---

## 2. Install and Set Up Database

```bash
npm install
npm run db:setup
```

Expected: migration applies schema, seed inserts 16 rows across `tenant-a`, `tenant-b`, `tenant-c`.

Verify seed (optional):

```bash
RUN_DB_TESTS=true npm test -- --testPathPattern=tests/db
```

---

## 3. Start the App

```bash
npm run dev
```

Open:

[http://localhost:3000/?tenant_id=tenant-a&user_id=user-1](http://localhost:3000/?tenant_id=tenant-a&user_id=user-1)

**What happens:**

1. Frontend reads `tenant_id` and `user_id` from URL
2. Calls `POST /api/auth/bootstrap`
3. Stores JWT in memory
4. Fetches `GET /api/audit` and renders the table

You should see audit log rows for **tenant-a only**.

---

## 4. Test Filters

In the UI:

1. **Action filter** — select an action (e.g. `LOGIN`); table updates
2. **Date range** — set From/To dates; table shows matching entries

These map to `GET /api/audit?action=...&from=...&to=...`.

---

## 5. Switch Tenants

Open a different tenant:

[http://localhost:3000/?tenant_id=tenant-b&user_id=user-2](http://localhost:3000/?tenant_id=tenant-b&user_id=user-2)

The table should show **different rows** — only tenant-b data.

---

## 6. Create an Audit Entry (API)

Bootstrap a token:

```bash
TOKEN=$(curl -s -X POST http://localhost:3000/api/auth/bootstrap \
  -H "Content-Type: application/json" \
  -d '{"tenant_id":"tenant-a","user_id":"user-1"}' \
  | jq -r '.token')
```

Create an entry:

```bash
curl -X POST http://localhost:3000/api/audit \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"action":"MANUAL_TEST","resource":"walkthrough/1","payload":{"step":6}}'
```

Refresh the browser — the new row appears in the tenant-a table.

---

## 7. Verify Tenant Isolation (API)

Attempt to bypass tenant filter via query param:

```bash
curl -s "http://localhost:3000/api/audit?tenant_id=tenant-b" \
  -H "Authorization: Bearer $TOKEN" \
  | jq '.data[].tenant_id' | sort -u
```

**Expected:** Only `tenant-a` appears — the query param is ignored.

Run the full integration test suite:

```bash
RUN_DB_TESTS=true npm test -- --testPathPattern=tests/audit
```

Tests cover query, header, and body bypass attempts.

---

## 8. Verify RLS (Database Layer)

RLS tests prove isolation at the database level, independent of the API:

```bash
RUN_DB_TESTS=true npm run test:rls
```

**Expected:** 3 tests pass:

- tenant-a can read tenant-a rows
- tenant-a cannot read tenant-b rows (filtered query)
- tenant-a unfiltered select has no tenant-b/c rows

---

## 9. Run All Tests

```bash
npm test                                    # offline tests
RUN_DB_TESTS=true npm test                  # + live DB integration
RUN_DB_TESTS=true npm run test:rls          # + RLS tests
npm run build                               # production build
```

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| `401` on API calls | Check `JWT_SECRET` matches Supabase JWT secret |
| Empty audit table | Run `npm run db:seed` |
| DB test failures | Run `npm run db:setup` |
| `404` on localhost | Ensure `npm run dev` is running on port 3000; check terminal for alternate port |
| RLS tests fail | Confirm `JWT_SECRET` alignment; run seed first |

## Related Docs

- [API Reference](api.md)
- [Authentication](authentication.md)
- [Testing](testing.md)
