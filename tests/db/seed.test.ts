import "./load-env";
import { createServiceRoleClient } from "@/lib/supabase";
import { SEED_ROWS } from "../../scripts/seed-data";

const REQUIRED_TENANTS = ["tenant-a", "tenant-b", "tenant-c"] as const;
const RUN_DB_TESTS = process.env.RUN_DB_TESTS === "true";

describe("seed definition", () => {
  it("defines at least 14 rows across three tenants", () => {
    expect(SEED_ROWS.length).toBeGreaterThanOrEqual(14);
    expect(new Set(SEED_ROWS.map((row) => row.tenant_id)).size).toBe(3);

    const actions = new Set(SEED_ROWS.map((row) => row.action));
    expect(actions.size).toBeGreaterThanOrEqual(5);
  });
});

(RUN_DB_TESTS ? describe : describe.skip)(
  "seed in database (integration)",
  () => {
    it("has at least 14 rows across three tenants in Supabase", async () => {
      const supabase = createServiceRoleClient();

      const { data, error } = await supabase
        .from("audit_log")
        .select("tenant_id, action");

      if (error) {
        throw new Error(
          `${error.message}. Run: npm run db:migrate && npm run db:seed`
        );
      }

      expect(data?.length).toBeGreaterThanOrEqual(14);

      const tenantCounts = REQUIRED_TENANTS.reduce<Record<string, number>>(
        (acc, tenant) => {
          acc[tenant] =
            data?.filter((row) => row.tenant_id === tenant).length ?? 0;
          return acc;
        },
        {}
      );

      for (const tenant of REQUIRED_TENANTS) {
        expect(tenantCounts[tenant]).toBeGreaterThanOrEqual(1);
      }

      const actions = new Set(data?.map((row) => row.action));
      expect(actions.size).toBeGreaterThanOrEqual(5);
    });
  }
);
