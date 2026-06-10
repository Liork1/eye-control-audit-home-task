import "./load-env";
import { getTokenExpirationDate, signToken, verifyToken } from "@/lib/jwt";

describe("jwt service", () => {
  it("signs and verifies token claims", async () => {
    const claims = {
      tenant_id: "tenant-a",
      user_id: "user-1",
      jti: "test-jti-123",
    };

    const token = await signToken(claims);
    const verified = await verifyToken(token);

    expect(verified).toEqual(claims);
  });

  it("sets token expiration roughly 24 hours ahead", () => {
    const expiresAt = getTokenExpirationDate();
    const diffHours = (expiresAt.getTime() - Date.now()) / (1000 * 60 * 60);

    expect(diffHours).toBeGreaterThan(23.9);
    expect(diffHours).toBeLessThan(24.1);
  });
});
