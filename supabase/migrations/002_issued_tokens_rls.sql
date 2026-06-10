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
