import { createServiceRoleClient } from "./supabase";

export type TokenStatus = "ACTIVE" | "EXPIRED" | "REVOKED";

export interface IssuedTokenRecord {
  id: string;
  token_jti: string;
  status: TokenStatus;
  expires_at: string;
  created_at: string;
}

export async function recordToken(
  jti: string,
  expiresAt: Date
): Promise<void> {
  const supabase = createServiceRoleClient();
  const { error } = await supabase.from("issued_tokens").insert({
    token_jti: jti,
    status: "ACTIVE",
    expires_at: expiresAt.toISOString(),
  });

  if (error) {
    throw new Error(`Failed to record issued token: ${error.message}`);
  }
}

export async function findTokenByJti(
  jti: string
): Promise<IssuedTokenRecord | null> {
  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from("issued_tokens")
    .select("id, token_jti, status, expires_at, created_at")
    .eq("token_jti", jti)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to look up issued token: ${error.message}`);
  }

  return data;
}

export async function markExpired(jti: string): Promise<void> {
  const supabase = createServiceRoleClient();
  const { error } = await supabase
    .from("issued_tokens")
    .update({ status: "EXPIRED" })
    .eq("token_jti", jti);

  if (error) {
    throw new Error(`Failed to mark token expired: ${error.message}`);
  }
}
