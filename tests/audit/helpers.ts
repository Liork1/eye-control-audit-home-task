import "../auth/load-env";
import { NextRequest } from "next/server";
import { POST as bootstrapPost } from "@/app/api/auth/bootstrap/route";

export async function getBootstrapToken(
  tenantId: string,
  userId: string
): Promise<string> {
  const response = await bootstrapPost(
    new NextRequest("http://localhost/api/auth/bootstrap", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tenant_id: tenantId, user_id: userId }),
    })
  );

  if (response.status !== 200) {
    throw new Error(`Bootstrap failed with status ${response.status}`);
  }

  const body = (await response.json()) as { token: string };
  return body.token;
}

export function createAuditRequest(
  path: string,
  token: string | null,
  init: RequestInit = {}
): NextRequest {
  const headers = new Headers(init.headers);

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  if (init.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const { method, body, signal } = init;

  return new NextRequest(`http://localhost/api/audit${path}`, {
    method,
    body,
    headers,
    signal: signal ?? undefined,
  });
}
