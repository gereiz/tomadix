import { NextRequest, NextResponse } from "next/server";
import { requirePlatformAdmin, AuthorizationError, AuthenticationError } from "@/lib/auth";
import { EmailService } from "@/modules/email/email.service";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    await requirePlatformAdmin("settings:manage");
    const body = await request.json().catch(() => ({}));

    const result = await EmailService.testConnection(body);

    return NextResponse.json(result);
  } catch (error: any) {
    if (error instanceof AuthorizationError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    if (error instanceof AuthenticationError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    return NextResponse.json(
      { success: false, message: error?.message || "Falha ao testar conexão." },
      { status: 500 }
    );
  }
}

