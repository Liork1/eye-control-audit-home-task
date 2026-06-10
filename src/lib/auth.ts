import { NextRequest, NextResponse } from "next/server";
import { verifyToken, type TokenClaims } from "./jwt";
import { findTokenByJti, markExpired } from "./token-store";

export type AuthClaims = TokenClaims;

export class AuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AuthError";
  }
}

function parseBearerToken(authorizationHeader: string | null): string {
  if (!authorizationHeader) {
    throw new AuthError("Missing Authorization header");
  }

  const [scheme, token] = authorizationHeader.split(" ");
  if (scheme !== "Bearer" || !token) {
    throw new AuthError("Authorization header must use Bearer scheme");
  }

  return token;
}

/**
 * Validates JWT signature, expiry, and issued_tokens lifecycle.
 * Call from protected route handlers via requireAuth().
 */
export async function authenticateRequest(
  authorizationHeader: string | null
): Promise<AuthClaims> {
  const token = parseBearerToken(authorizationHeader);
  const bearerHeader = authorizationHeader as string;

  let claims: AuthClaims;
  try {
    claims = await verifyToken(token);
  } catch {
    throw new AuthError("Invalid or expired token");
  }

  const record = await findTokenByJti(bearerHeader);
  if (!record) {
    throw new AuthError("Token is not recognized");
  }

  if (record.status !== "ACTIVE") {
    throw new AuthError("Token is not active");
  }

  if (new Date(record.expires_at).getTime() <= Date.now()) {
    await markExpired(bearerHeader);
    throw new AuthError("Token has expired");
  }

  return claims;
}

/** Next.js route helper — extract and validate auth from the incoming request. */
export async function requireAuth(request: NextRequest): Promise<AuthClaims> {
  return authenticateRequest(request.headers.get("authorization"));
}

/** Standard 401 response for protected API routes. */
export function unauthorizedResponse(error: AuthError): NextResponse {
  return NextResponse.json({ error: error.message }, { status: 401 });
}
