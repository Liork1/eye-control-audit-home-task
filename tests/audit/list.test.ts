import "./helpers";
import { GET } from "@/app/api/audit/route";
import { createAuditRequest, getBootstrapToken } from "./helpers";

const RUN_DB_TESTS = process.env.RUN_DB_TESTS === "true";

describe("GET /api/audit", () => {
  it("returns 401 without Authorization header", async () => {
    const response = await GET(createAuditRequest("", null));
    expect(response.status).toBe(401);
  });
});

(RUN_DB_TESTS ? describe : describe.skip)(
  "GET /api/audit (integration)",
  () => {
    it("returns only tenant-a rows for a tenant-a token", async () => {
      const token = await getBootstrapToken("tenant-a", "user-1");
      const response = await GET(createAuditRequest("", token));

      expect(response.status).toBe(200);

      const body = (await response.json()) as {
        data: Array<{ tenant_id: string }>;
      };

      expect(body.data.length).toBeGreaterThan(0);
      expect(body.data.every((row) => row.tenant_id === "tenant-a")).toBe(true);
    });

    it("filters by action", async () => {
      const token = await getBootstrapToken("tenant-a", "user-1");
      const response = await GET(
        createAuditRequest("?action=PATIENT_VIEWED", token)
      );

      expect(response.status).toBe(200);

      const body = (await response.json()) as {
        data: Array<{ action: string; tenant_id: string }>;
      };

      expect(body.data.length).toBeGreaterThan(0);
      expect(
        body.data.every(
          (row) => row.action === "PATIENT_VIEWED" && row.tenant_id === "tenant-a"
        )
      ).toBe(true);
    });

    it("filters by date range", async () => {
      const token = await getBootstrapToken("tenant-a", "user-1");
      const response = await GET(
        createAuditRequest(
          "?from=2025-06-01T00:00:00Z&to=2025-06-02T23:59:59Z",
          token
        )
      );

      expect(response.status).toBe(200);

      const body = (await response.json()) as {
        data: Array<{ created_at: string; tenant_id: string }>;
      };

      expect(body.data.length).toBeGreaterThan(0);
      for (const row of body.data) {
        expect(row.tenant_id).toBe("tenant-a");
        expect(new Date(row.created_at).getTime()).toBeGreaterThanOrEqual(
          new Date("2025-06-01T00:00:00Z").getTime()
        );
        expect(new Date(row.created_at).getTime()).toBeLessThanOrEqual(
          new Date("2025-06-02T23:59:59Z").getTime()
        );
      }
    });
  }
);
