import { NextRequest, NextResponse } from "next/server";
import { getTokenExpirationDate, signToken } from "@/lib/jwt";
import { recordToken } from "@/lib/token-store";

interface BootstrapBody {
  tenant_id?: string;
  user_id?: string;
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  let body: BootstrapBody;

  try {
    body = (await request.json()) as BootstrapBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { tenant_id, user_id } = body;

  if (!tenant_id || !user_id) {
    return NextResponse.json(
      { error: "tenant_id and user_id are required" },
      { status: 400 }
    );
  }

  const jti = crypto.randomUUID();
  const expiresAt = getTokenExpirationDate();
  const token = await signToken({ tenant_id, user_id, jti });

  await recordToken(jti, expiresAt);

  return NextResponse.json({ token });
}
