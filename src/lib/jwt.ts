import { SignJWT, jwtVerify, type JWTPayload } from "jose";

const TOKEN_TTL = "24h";

function getSecret(): Uint8Array {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("Missing required environment variable: JWT_SECRET");
  }
  return new TextEncoder().encode(secret);
}

export interface TokenClaims {
  tenant_id: string;
  user_id: string;
  jti: string;
}

function toTokenClaims(payload: JWTPayload): TokenClaims {
  const tenant_id = payload.tenant_id;
  const user_id = payload.user_id;
  const jti = payload.jti;

  if (typeof tenant_id !== "string" || typeof user_id !== "string") {
    throw new Error("Token is missing tenant_id or user_id claims");
  }

  if (typeof jti !== "string") {
    throw new Error("Token is missing jti claim");
  }

  return { tenant_id, user_id, jti };
}

export function getTokenExpirationDate(): Date {
  return new Date(Date.now() + 24 * 60 * 60 * 1000);
}

export async function signToken(claims: TokenClaims): Promise<string> {
  return new SignJWT({
    tenant_id: claims.tenant_id,
    user_id: claims.user_id,
    role: "authenticated",
  })
    .setProtectedHeader({ alg: "HS256" })
    .setJti(claims.jti)
    .setIssuedAt()
    .setExpirationTime(TOKEN_TTL)
    .sign(getSecret());
}

export async function verifyToken(token: string): Promise<TokenClaims> {
  const { payload } = await jwtVerify(token, getSecret());
  return toTokenClaims(payload);
}
