/**
 * Phase 1 smoke test — verifies Jest is configured and project modules resolve.
 */
import { createServiceRoleClient } from "@/lib/supabase";

describe("project scaffolding", () => {
  it("resolves the supabase client factory", () => {
    expect(typeof createServiceRoleClient).toBe("function");
  });
});
