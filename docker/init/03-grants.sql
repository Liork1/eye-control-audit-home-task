GRANT SELECT, INSERT ON audit_log TO anon, authenticated;
GRANT SELECT, UPDATE ON issued_tokens TO anon, authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;

-- PostgREST connects as the DB owner and SET ROLE from JWT claims
DO $$ BEGIN
  EXECUTE format('GRANT anon TO %I', current_user);
  EXECUTE format('GRANT authenticated TO %I', current_user);
END $$;
