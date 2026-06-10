import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { signToken } from "./jwt";

function normalizeSupabaseUrl(url: string): string {
  return url.replace(/\/rest\/v1\/?$/, "").replace(/\/$/, "");
}

export class SupabaseConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SupabaseConfigError";
  }
}

function getEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new SupabaseConfigError(`Missing required environment variable: ${name}`);
  }
  return value;
}

/**
 * Supabase client that forwards the caller's JWT — RLS policies apply.
 * Requires SUPABASE_ANON_KEY (not service role).
 */
export function createAuthenticatedClient(
  authorizationHeader: string
): SupabaseClient {
  const url = normalizeSupabaseUrl(getEnv("SUPABASE_URL"));
  const apiKey = getEnv("SUPABASE_ANON_KEY");
  const authorization = authorizationHeader.startsWith("Bearer ")
    ? authorizationHeader
    : `Bearer ${authorizationHeader}`;

  return createClient(url, apiKey, {
    global: {
      headers: {
        Authorization: authorization,
      },
    },
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

/** Test helper — signs a tenant JWT and returns an RLS-scoped client. */
export async function createUserScopedClient(
  tenantId: string,
  userId: string
): Promise<SupabaseClient> {
  const token = await signToken({
    tenant_id: tenantId,
    user_id: userId,
    jti: crypto.randomUUID(),
  });

  return createAuthenticatedClient(`Bearer ${token}`);
}
