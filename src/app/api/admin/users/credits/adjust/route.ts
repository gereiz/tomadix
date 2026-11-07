import { parseJsonBody, adjustCreditsBodySchema } from "@/lib/api-validation";
import { NextRequest, NextResponse } from "next/server";
import { requirePlatformAdmin, AuthorizationError, AuthenticationError, getClientContext } from "@/lib/auth";
import { AdminUsersService } from "@/modules/admin/admin-users.service";

export async function POST(request: NextRequest) {
  try {
    const adminUser = await requirePlatformAdmin("credits:manage");
    const parsed = await parseJsonBody(request, adjustCreditsBodySchema);
    if (parsed.response) return parsed.response;
    const clientContext = await getClientContext();

    const { workspaceId, amount, reason } = parsed.data;

    const result = await AdminUsersService.adjustCredits(
      adminUser.id,
      workspaceId,
      amount,
      reason,
      {
        ip: clientContext.ipAddress,
        ua: clientContext.userAgent,
      }
    );

    return NextResponse.json({
      success: true,
      message: `Ajuste de créditos efetuado: ${amount > 0 ? "+" : ""}${amount} créditos.`,
      result,
    });
  } catch (error: any) {
    if (error instanceof AuthorizationError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    if (error instanceof AuthenticationError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    return NextResponse.json(
      { error: error?.message || "Erro ao ajustar créditos." },
      { status: 400 }
    );
  }
}
