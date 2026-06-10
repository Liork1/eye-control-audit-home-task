import "./load-env";
import { NextRequest } from "next/server";
import { POST } from "@/app/api/auth/bootstrap/route";
import { verifyToken } from "@/lib/jwt";
import { findTokenByJti } from "@/lib/token-store";

const RUN_DB_TESTS = process.env.RUN_DB_TESTS === "true";

function createBootstrapRequest(body: unknown): NextRequest {
  return new NextRequest("http://localhost/api/auth/bootstrap", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/auth/bootstrap", () => {
  it("returns 400 when tenant_id is missing", async () => {
    const response = await POST(createBootstrapRequest({ user_id: "user-1" }));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: "tenant_id and user_id are required",
    });
  });

  it("returns 400 when user_id is missing", async () => {
    const response = await POST(createBootstrapRequest({ tenant_id: "tenant-a" }));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: "tenant_id and user_id are required",
    });
  });

  it("returns 400 for invalid JSON", async () => {
    const request = new NextRequest("http://localhost/api/auth/bootstrap", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{",
    });

    const response = await POST(request);
    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: "Invalid JSON body" });
  });
});

(RUN_DB_TESTS ? describe : describe.skip)(
  "POST /api/auth/bootstrap (integration)",
  () => {
    it("returns a token with expected claims and records ACTIVE status", async () => {
      const response = await POST(
        createBootstrapRequest({
          tenant_id: "tenant-a",
          user_id: "user-1",
        })
      );

      expect(response.status).toBe(200);

      const body = (await response.json()) as { token: string };
      expect(body.token).toBeTruthy();

      const claims = await verifyToken(body.token);
      expect(claims.tenant_id).toBe("tenant-a");
      expect(claims.user_id).toBe("user-1");
      expect(claims.jti).toBeTruthy();

      const record = await findTokenByJti(claims.jti);
      expect(record).not.toBeNull();
      expect(record?.status).toBe("ACTIVE");
    });
  }
);
