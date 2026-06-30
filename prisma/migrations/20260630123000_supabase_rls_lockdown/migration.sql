-- Lock down PostgREST/Supabase access on sensitive tables without changing
-- the server-side Prisma flow used by the app.

ALTER TABLE "users" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "contracts" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "documents" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "interactions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "contract_status_history" ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE "users" FROM PUBLIC;
REVOKE ALL ON TABLE "contracts" FROM PUBLIC;
REVOKE ALL ON TABLE "documents" FROM PUBLIC;
REVOKE ALL ON TABLE "interactions" FROM PUBLIC;
REVOKE ALL ON TABLE "contract_status_history" FROM PUBLIC;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    EXECUTE 'REVOKE ALL ON TABLE "users" FROM anon';
    EXECUTE 'REVOKE ALL ON TABLE "contracts" FROM anon';
    EXECUTE 'REVOKE ALL ON TABLE "documents" FROM anon';
    EXECUTE 'REVOKE ALL ON TABLE "interactions" FROM anon';
    EXECUTE 'REVOKE ALL ON TABLE "contract_status_history" FROM anon';
  END IF;

  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    EXECUTE 'REVOKE ALL ON TABLE "users" FROM authenticated';
    EXECUTE 'REVOKE ALL ON TABLE "contracts" FROM authenticated';
    EXECUTE 'REVOKE ALL ON TABLE "documents" FROM authenticated';
    EXECUTE 'REVOKE ALL ON TABLE "interactions" FROM authenticated';
    EXECUTE 'REVOKE ALL ON TABLE "contract_status_history" FROM authenticated';
  END IF;
END
$$;
