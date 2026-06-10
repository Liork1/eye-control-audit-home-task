export interface AuthClaims {
  tenant_id: string;
  user_id: string;
  jti: string;
}

/**
 * Validates the Authorization header and returns JWT claims.
 * Implementation will be completed in Phase 3 (Authentication).
 */
export async function authenticateRequest(
  authorizationHeader: string | null
): Promise<AuthClaims> {
  void authorizationHeader;
  throw new Error("authenticateRequest is not implemented yet");
}
