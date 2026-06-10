import "./helpers";
import { GET, POST } from "@/app/api/audit/route";
import { createAuditRequest, getBootstrapToken } from "./helpers";

const RUN_DB_TESTS = process.env.RUN_DB_TESTS === "true";

(RUN_DB_TESTS ? describe : describe.skip)(
  "tenant isolation (mandatory)",
  () => {
    let tenantAToken: string;

    beforeAll(async () => {
      tenantAToken = await getBootstrapToken("tenant-a", "user-1");
    });

    it("baseline: returns only tenant-a records", async () => {
      const response = await GET(createAuditRequest("", tenantAToken));
      const body = (await response.json()) as {
        data: Array<{ tenant_id: string }>;
      };

      expect(body.data.length).toBeGreaterThan(0);
      expect(body.data.every((row) => row.tenant_id === "tenant-a")).toBe(true);
      expect(body.data.some((row) => row.tenant_id === "tenant-b")).toBe(false);
    });

    it("query bypass: ?tenant_id=tenant-b still returns only tenant-a", async () => {
      const response = await GET(
        createAuditRequest("?tenant_id=tenant-b", tenantAToken)
      );
      const body = (await response.json()) as {
        data: Array<{ tenant_id: string }>;
      };

      expect(body.data.every((row) => row.tenant_id === "tenant-a")).toBe(true);
      expect(body.data.some((row) => row.tenant_id === "tenant-b")).toBe(false);
    });

    it("header bypass: X-Tenant-Id: tenant-b still returns only tenant-a", async () => {
      const response = await GET(
        createAuditRequest("", tenantAToken, {
          headers: { "X-Tenant-Id": "tenant-b" },
        })
      );
      const body = (await response.json()) as {
        data: Array<{ tenant_id: string }>;
      };

      expect(body.data.every((row) => row.tenant_id === "tenant-a")).toBe(true);
      expect(body.data.some((row) => row.tenant_id === "tenant-b")).toBe(false);
    });

    it("body bypass on POST: tenant_id in body is ignored", async () => {
      const response = await POST(
        createAuditRequest("", tenantAToken, {
          method: "POST",
          body: JSON.stringify({
            tenant_id: "tenant-b",
            action: "BYPASS_TEST",
            resource: "patient/bypass",
            payload: {},
          }),
        })
      );

      expect(response.status).toBe(201);

      const created = (await response.json()) as { tenant_id: string };
      expect(created.tenant_id).toBe("tenant-a");

      const listResponse = await GET(
        createAuditRequest("?action=BYPASS_TEST", tenantAToken)
      );
      const listBody = (await listResponse.json()) as {
        data: Array<{ tenant_id: string; action: string }>;
      };

      expect(
        listBody.data.every(
          (row) => row.tenant_id === "tenant-a" && row.action === "BYPASS_TEST"
        )
      ).toBe(true);
    });
  }
);
