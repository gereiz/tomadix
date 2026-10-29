import { NextRequest, NextResponse } from "next/server";
import { requirePlatformAdmin, AuthorizationError, AuthenticationError } from "@/lib/auth";
import { AdminParametersService } from "@/modules/admin/admin-parameters.service";

export async function POST(request: NextRequest) {
  try {
    const adminUser = await requirePlatformAdmin();

    const ipAddress =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || undefined;
    const userAgent = request.headers.get("user-agent") || undefined;

    const result = await AdminParametersService.syncDefaultCinematicParameters(
      adminUser.id,
      { ipAddress, userAgent }
    );

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (error: any) {
    if (error instanceof AuthorizationError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    if (error instanceof AuthenticationError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    return NextResponse.json(
      { error: error?.message || "Erro interno ao sincronizar parâmetros cinematográficos do sistema." },
      { status: 500 }
    );
  }
}
