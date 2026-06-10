import "./helpers";
import { POST } from "@/app/api/audit/route";
import { createAuditRequest, getBootstrapToken } from "./helpers";

const RUN_DB_TESTS = process.env.RUN_DB_TESTS === "true";

describe("POST /api/audit", () => {
  it("returns 401 without Authorization header", async () => {
    const response = await POST(
      createAuditRequest("", null, {
        method: "POST",
        body: JSON.stringify({ action: "PATIENT_VIEWED" }),
      })
    );

    expect(response.status).toBe(401);
  });

});

(RUN_DB_TESTS ? describe : describe.skip)(
  "POST /api/audit (integration)",
  () => {
    it("returns 400 when action is missing", async () => {
      const token = await getBootstrapToken("tenant-a", "user-1");
      const response = await POST(
        createAuditRequest("", token, {
          method: "POST",
          body: JSON.stringify({ resource: "patient/1" }),
        })
      );

      expect(response.status).toBe(400);
      await expect(response.json()).resolves.toEqual({
        error: "action is required",
      });
    });

    it("creates an audit row scoped to JWT claims", async () => {
      const token = await getBootstrapToken("tenant-a", "user-1");
      const response = await POST(
        createAuditRequest("", token, {
          method: "POST",
          body: JSON.stringify({
            tenant_id: "tenant-b",
            action: "TEST_ACTION",
            resource: "patient/phase4-test",
            payload: { source: "integration-test" },
          }),
        })
      );

      expect(response.status).toBe(201);

      const body = (await response.json()) as {
        tenant_id: string;
        user_id: string;
        action: string;
        resource: string;
      };

      expect(body.tenant_id).toBe("tenant-a");
      expect(body.user_id).toBe("user-1");
      expect(body.action).toBe("TEST_ACTION");
      expect(body.resource).toBe("patient/phase4-test");
    });
  }
);
