import { NextRequest, NextResponse } from "next/server";
import { requirePlatformAdmin, AuthorizationError, AuthenticationError } from "@/lib/auth";
import { AdminUsersService } from "@/modules/admin/admin-users.service";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const adminUser = await requirePlatformAdmin("users:manage");
    const { id } = await params;
    const body = await request.json().catch(() => ({}));

    const clientContext = request.headers.get("x-forwarded-for") || undefined;
    const userAgent = request.headers.get("user-agent") || undefined;

    const result = await AdminUsersService.revokeUserSessions(
      adminUser.id,
      id,
      body.sessionId,
      { ip: clientContext, ua: userAgent }
    );

    return NextResponse.json({
      success: true,
      message: `${result.revokedCount} sessão(ões) revogada(s) com sucesso.`,
      revokedCount: result.revokedCount,
    });
  } catch (error: any) {
    if (error instanceof AuthorizationError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    if (error instanceof AuthenticationError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    return NextResponse.json(
      { error: error?.message || "Erro ao revogar sessões." },
      { status: 400 }
    );
  }
}
