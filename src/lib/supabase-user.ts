import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { SignJWT } from "jose";

function normalizeSupabaseUrl(url: string): string {
  return url.replace(/\/rest\/v1\/?$/, "").replace(/\/$/, "");
}

function getEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function getJwtSecret(): Uint8Array {
  return new TextEncoder().encode(getEnv("JWT_SECRET"));
}

/**
 * Signs a JWT for Supabase RLS evaluation (includes role=authenticated).
 */
export async function signRlsTestToken(
  tenantId: string,
  userId: string
): Promise<string> {
  return new SignJWT({
    tenant_id: tenantId,
    user_id: userId,
    role: "authenticated",
  })
    .setProtectedHeader({ alg: "HS256" })
    .setJti(crypto.randomUUID())
    .setIssuedAt()
    .setExpirationTime("1h")
    .sign(getJwtSecret());
}

/**
 * Supabase client scoped to a tenant JWT — RLS policies apply.
 */
export async function createUserScopedClient(
  tenantId: string,
  userId: string
): Promise<SupabaseClient> {
  const url = normalizeSupabaseUrl(getEnv("SUPABASE_URL"));
  // Prefer anon key; service role apikey also works when Authorization carries the tenant JWT.
  const apiKey =
    process.env.SUPABASE_ANON_KEY ?? getEnv("SUPABASE_SERVICE_ROLE_KEY");
  const token = await signRlsTestToken(tenantId, userId);

  return createClient(url, apiKey, {
    global: {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
