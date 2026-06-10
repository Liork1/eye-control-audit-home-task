import { withPgClient } from "./pg";
import { createAuthenticatedClient } from "./supabase-user";

export type TokenStatus = "ACTIVE" | "EXPIRED" | "REVOKED";

export interface IssuedTokenRecord {
  id: string;
  token_jti: string;
  status: TokenStatus;
  expires_at: string;
  created_at: string;
}

/** Bootstrap only — inserts before caller has a JWT; uses direct Postgres. */
export async function recordToken(
  jti: string,
  expiresAt: Date
): Promise<void> {
  await withPgClient(async (client) => {
    const { rowCount } = await client.query(
      `INSERT INTO issued_tokens (token_jti, status, expires_at)
       VALUES ($1, 'ACTIVE', $2)`,
      [jti, expiresAt.toISOString()]
    );

    if ((rowCount ?? 0) < 1) {
      throw new Error("Failed to record issued token");
    }
  });
}

/** RLS-scoped — caller can only read their own jti row. */
export async function findTokenByJti(
  authorizationHeader: string
): Promise<IssuedTokenRecord | null> {
  const supabase = createAuthenticatedClient(authorizationHeader);
  const { data, error } = await supabase
    .from("issued_tokens")
    .select("id, token_jti, status, expires_at, created_at")
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to look up issued token: ${error.message}`);
  }

  return data;
}

/** RLS-scoped — caller can only update their own jti row. */
export async function markExpired(
  authorizationHeader: string
): Promise<void> {
  const supabase = createAuthenticatedClient(authorizationHeader);
  const { error } = await supabase
    .from("issued_tokens")
    .update({ status: "EXPIRED" });

  if (error) {
    throw new Error(`Failed to mark token expired: ${error.message}`);
  }
}
