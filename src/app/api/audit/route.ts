import { NextRequest, NextResponse } from "next/server";
import {
  AuthError,
  requireAuth,
  unauthorizedResponse,
  type AuthClaims,
} from "@/lib/auth";
import {
  createAuthenticatedClient,
  SupabaseConfigError,
} from "@/lib/supabase-user";

interface CreateAuditBody {
  action?: string;
  resource?: string;
  payload?: Record<string, unknown>;
  tenant_id?: string;
}

async function resolveClaims(
  request: NextRequest
): Promise<AuthClaims | NextResponse> {
  try {
    return await requireAuth(request);
  } catch (error) {
    if (error instanceof AuthError) {
      return unauthorizedResponse(error);
    }
    throw error;
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const claimsOrResponse = await resolveClaims(request);
  if (claimsOrResponse instanceof NextResponse) {
    return claimsOrResponse;
  }
  const claims = claimsOrResponse;

  let body: CreateAuditBody;
  try {
    body = (await request.json()) as CreateAuditBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!body.action) {
    return NextResponse.json({ error: "action is required" }, { status: 400 });
  }

  const authHeader = request.headers.get("authorization");
  if (!authHeader) {
    return unauthorizedResponse(new AuthError("Missing Authorization header"));
  }

  let supabase;
  try {
    supabase = createAuthenticatedClient(authHeader);
  } catch (error) {
    if (error instanceof SupabaseConfigError) {
      return NextResponse.json({ error: error.message }, { status: 503 });
    }
    throw error;
  }

  const { data, error } = await supabase
    .from("audit_log")
    .insert({
      tenant_id: claims.tenant_id,
      user_id: claims.user_id,
      action: body.action,
      resource: body.resource ?? null,
      payload: body.payload ?? {},
    })
    .select("id, tenant_id, user_id, action, resource, payload, created_at")
    .single();

  if (error) {
    throw new Error(`Failed to create audit log: ${error.message}`);
  }

  return NextResponse.json(data, { status: 201 });
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const claimsOrResponse = await resolveClaims(request);
  if (claimsOrResponse instanceof NextResponse) {
    return claimsOrResponse;
  }
  const claims = claimsOrResponse;

  const { searchParams } = new URL(request.url);
  const action = searchParams.get("action");
  const resource = searchParams.get("resource");
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  const authHeader = request.headers.get("authorization");
  if (!authHeader) {
    return unauthorizedResponse(new AuthError("Missing Authorization header"));
  }

  let supabase;
  try {
    supabase = createAuthenticatedClient(authHeader);
  } catch (error) {
    if (error instanceof SupabaseConfigError) {
      return NextResponse.json({ error: error.message }, { status: 503 });
    }
    throw error;
  }

  let query = supabase
    .from("audit_log")
    .select("id, tenant_id, user_id, action, resource, payload, created_at")
    .eq("tenant_id", claims.tenant_id)
    .order("created_at", { ascending: false });

  if (action) {
    query = query.eq("action", action);
  }

  if (resource) {
    query = query.eq("resource", resource);
  }

  if (from) {
    query = query.gte("created_at", from);
  }

  if (to) {
    query = query.lte("created_at", to);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`Failed to list audit logs: ${error.message}`);
  }

  return NextResponse.json({ data: data ?? [] });
}
