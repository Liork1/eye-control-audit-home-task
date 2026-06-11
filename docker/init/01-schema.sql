-- Phase 2: initial schema for audit log service

CREATE TABLE IF NOT EXISTS audit_log (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id  TEXT NOT NULL,
    user_id    TEXT NOT NULL,
    action     TEXT NOT NULL,
    resource   TEXT,
    payload    JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_log_tenant_created
    ON audit_log (tenant_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_audit_log_tenant_action
    ON audit_log (tenant_id, action);

CREATE TABLE IF NOT EXISTS issued_tokens (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    token_jti  TEXT UNIQUE NOT NULL,
    status     TEXT NOT NULL DEFAULT 'ACTIVE',
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_issued_tokens_jti
    ON issued_tokens (token_jti);

ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS audit_log_select ON audit_log;
CREATE POLICY audit_log_select ON audit_log
    FOR SELECT
    USING (tenant_id = (auth.jwt() ->> 'tenant_id'));

DROP POLICY IF EXISTS audit_log_insert ON audit_log;
CREATE POLICY audit_log_insert ON audit_log
    FOR INSERT
    WITH CHECK (tenant_id = (auth.jwt() ->> 'tenant_id'));

-- Phase B: RLS on issued_tokens — token lookup/update scoped to JWT jti claim

ALTER TABLE issued_tokens ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS issued_tokens_select ON issued_tokens;
CREATE POLICY issued_tokens_select ON issued_tokens
    FOR SELECT
    USING (token_jti = (auth.jwt() ->> 'jti'));

DROP POLICY IF EXISTS issued_tokens_update ON issued_tokens;
CREATE POLICY issued_tokens_update ON issued_tokens
    FOR UPDATE
    USING (token_jti = (auth.jwt() ->> 'jti'))
    WITH CHECK (token_jti = (auth.jwt() ->> 'jti'));
