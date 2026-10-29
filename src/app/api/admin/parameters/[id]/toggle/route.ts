import { NextRequest, NextResponse } from "next/server";
import { requirePlatformAdmin, AuthorizationError, AuthenticationError } from "@/lib/auth";
import { AdminParametersService } from "@/modules/admin/admin-parameters.service";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const adminUser = await requirePlatformAdmin();
    const { id } = await params;

    let enabled: boolean | undefined = undefined;
    try {
      const body = await request.json();
      if (typeof body.enabled === "boolean") {
        enabled = body.enabled;
      }
    } catch {
      // Nenhum body enviado, alternará automaticamente
    }

    const ipAddress =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || undefined;
    const userAgent = request.headers.get("user-agent") || undefined;

    const result = await AdminParametersService.toggleGlobalParameter(
      id,
      enabled,
      adminUser.id,
      { ipAddress, userAgent }
    );

    return NextResponse.json({
      success: true,
      ...result,
      message: `Parâmetro ${result.enabled ? "ativado" : "desativado"} globalmente.`,
    });
  } catch (error: any) {
    if (error instanceof AuthorizationError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    if (error instanceof AuthenticationError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    return NextResponse.json(
      { error: error?.message || "Erro interno ao alternar parâmetro." },
      { status: 400 }
    );
  }
}
