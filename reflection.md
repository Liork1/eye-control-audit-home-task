# Reflection

## 1. Three things the AI got wrong — how you noticed, and how you fixed them

**`issued_tokens` included redundant identity fields**

The AI initially suggested an `issued_tokens` table that stored the token, `user_id`, and `tenant_id`. I pushed back because those identity fields already live in the JWT — duplicating them in the table risks drift if claims and DB ever disagree. I asked the AI to update the plan and keep `issued_tokens` as lifecycle-only (`token_jti`, `status`, `expires_at`).

**Premature push without approval**

I asked the AI to include a workflow in the plan: create a feature branch, implement, leave changes uncommitted, and only commit/push after my explicit approval. On the first phase it pushed anyway. I noticed via git status / GitHub and asked for a rollback. We reset the workflow so I could review diffs in the IDE before anything went remote.

**RLS was not enforced on the live API path**

The app used `SUPABASE_SERVICE_ROLE_KEY` for audit queries. Service role has `BYPASSRLS` in Postgres, so RLS policies existed in the database but were never consulted on production requests — tenant isolation relied entirely on `.eq("tenant_id", ...)` in the route handler. I did not catch this from the existing tests alone; another LLM (Opus) reviewed the implementation against the requirements and flagged the gap. I fixed it over 2–3 prompts: Phase A routed audit API through anon key + caller JWT, Phase B removed service role from runtime entirely (direct Postgres for bootstrap/seed, RLS for token lookup).

---

## 2. One thing the AI suggested that you instinctively pushed back on but ended up accepting

Nothing I can think of.

---

## 3. One thing you'd do differently with another 4 hours. Why not now?

**Create the GitHub repo before prompting.**

I hit some git login / detached-HEAD friction early in the session. Having the remote repo and a clean `main` branch set up first would have made branch workflow and rollbacks smoother from the start. Not blocking for delivery — the project is complete — but it would reduce setup friction on a future take-home.

---

## 4. The hardest bug in those 3–4 hours

Same as item 1.3: **service role silently bypassing RLS.**

The policies in Supabase looked correct, multi-tenant API tests passed, and RLS integration tests passed — but they exercised different connection types. The API never used the user-scoped client, so defense-in-depth was illusory. Finding it required a second opinion (Opus), not just re-running tests. Fix took roughly 2–3 prompt cycles (Phase A + Phase B) plus new e2e tests to cover the full tenant story across all three seed tenants.

---

## 5. How long it actually took, and which AI tools you used

- **Time:** ~4.5 hours total (planning, 9 implementation phases, reviews, test runs, git workflow corrections).
- **Tools:** Cursor with Auto agent for implementation, planning, tests, and docs. Opus (separate review) for the RLS / service-role architecture catch.
