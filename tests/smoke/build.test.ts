/**
 * Phase 1 smoke test — verifies Jest is configured and project modules resolve.
 */
import { createAuthenticatedClient } from "@/lib/supabase-user";
import { withPgClient } from "@/lib/pg";

describe("project scaffolding", () => {
  it("resolves the authenticated supabase client factory", () => {
    expect(typeof createAuthenticatedClient).toBe("function");
  });

  it("resolves the pg client helper", () => {
    expect(typeof withPgClient).toBe("function");
  });
});
