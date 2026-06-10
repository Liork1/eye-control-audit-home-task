import "./load-env";
import { createUserScopedClient } from "@/lib/supabase-user";
import { createServiceRoleClient } from "@/lib/supabase";

const RUN_DB_TESTS = process.env.RUN_DB_TESTS === "true";

(RUN_DB_TESTS ? describe : describe.skip)(
  "RLS tenant isolation",
  () => {
    beforeAll(async () => {
      const admin = createServiceRoleClient();
      const { count: tenantBCount, error } = await admin
        .from("audit_log")
        .select("*", { count: "exact", head: true })
        .eq("tenant_id", "tenant-b");

      if (error) {
        throw new Error(`Seed check failed: ${error.message}`);
      }

      if ((tenantBCount ?? 0) < 1) {
        throw new Error(
          "Expected tenant-b seed data. Run: npm run db:seed"
        );
      }
    });

    it("positive: tenant-a can read tenant-a rows", async () => {
      const client = await createUserScopedClient("tenant-a", "rls-test-user");

      const { data, error } = await client
        .from("audit_log")
        .select("tenant_id");

      expect(error).toBeNull();
      expect(data?.length).toBeGreaterThan(0);
      expect(data?.every((row) => row.tenant_id === "tenant-a")).toBe(true);
    });

    it("negative: tenant-a cannot read tenant-b rows via filter", async () => {
      const client = await createUserScopedClient("tenant-a", "rls-test-user");

      const { data, error } = await client
        .from("audit_log")
        .select("tenant_id")
        .eq("tenant_id", "tenant-b");

      expect(error).toBeNull();
      expect(data).toEqual([]);
    });

    it("negative: tenant-a unfiltered select returns no tenant-b rows", async () => {
      const client = await createUserScopedClient("tenant-a", "rls-test-user");

      const { data, error } = await client
        .from("audit_log")
        .select("tenant_id");

      expect(error).toBeNull();
      expect(data?.some((row) => row.tenant_id === "tenant-b")).toBe(false);
      expect(data?.some((row) => row.tenant_id === "tenant-c")).toBe(false);
    });
  }
);
