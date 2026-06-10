import "./load-env";
import { NextRequest } from "next/server";
import {
  AuthError,
  authenticateRequest,
  requireAuth,
  unauthorizedResponse,
} from "@/lib/auth";
import { POST as bootstrapPost } from "@/app/api/auth/bootstrap/route";

const RUN_DB_TESTS = process.env.RUN_DB_TESTS === "true";

describe("authenticateRequest", () => {
  it("rejects missing Authorization header", async () => {
    await expect(authenticateRequest(null)).rejects.toThrow(AuthError);
    await expect(authenticateRequest(null)).rejects.toThrow(
      "Missing Authorization header"
    );
  });

  it("rejects non-Bearer Authorization header", async () => {
    await expect(authenticateRequest("Token abc")).rejects.toThrow(
      "Authorization header must use Bearer scheme"
    );
  });

  it("rejects invalid JWT", async () => {
    await expect(
      authenticateRequest("Bearer not-a-valid-jwt")
    ).rejects.toThrow("Invalid or expired token");
  });
});

describe("requireAuth", () => {
  it("reads Authorization from a NextRequest", async () => {
    const request = new NextRequest("http://localhost/api/protected");

    await expect(requireAuth(request)).rejects.toThrow(
      "Missing Authorization header"
    );
  });
});

describe("unauthorizedResponse", () => {
  it("returns a 401 JSON response", async () => {
    const response = unauthorizedResponse(new AuthError("Token is not active"));

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({
      error: "Token is not active",
    });
  });
});

(RUN_DB_TESTS ? describe : describe.skip)(
  "authenticateRequest (integration)",
  () => {
    it("accepts a bootstrapped token via requireAuth", async () => {
      const bootstrapResponse = await bootstrapPost(
        new NextRequest("http://localhost/api/auth/bootstrap", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            tenant_id: "tenant-b",
            user_id: "user-4",
          }),
        })
      );

      const { token } = (await bootstrapResponse.json()) as { token: string };

      const request = new NextRequest("http://localhost/api/protected", {
        headers: { Authorization: `Bearer ${token}` },
      });

      const claims = await requireAuth(request);

      expect(claims).toMatchObject({
        tenant_id: "tenant-b",
        user_id: "user-4",
      });
      expect(claims.jti).toBeTruthy();
    });

    it("rejects a token that is not recorded in issued_tokens", async () => {
      const { signToken } = await import("@/lib/jwt");
      const orphanToken = await signToken({
        tenant_id: "tenant-a",
        user_id: "user-1",
        jti: crypto.randomUUID(),
      });

      await expect(
        authenticateRequest(`Bearer ${orphanToken}`)
      ).rejects.toThrow("Token is not recognized");
    });
  }
);
