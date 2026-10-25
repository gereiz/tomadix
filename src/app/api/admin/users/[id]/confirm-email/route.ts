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

    if (!body.justification || body.justification.trim().length < 5) {
      return NextResponse.json(
        { error: "É obrigatório fornecer justificativa formal para a verificação manual de e-mail." },
        { status: 400 }
      );
    }

    const clientContext = request.headers.get("x-forwarded-for") || undefined;
    const userAgent = request.headers.get("user-agent") || undefined;

    const user = await AdminUsersService.confirmEmailManually(
      adminUser.id,
      id,
      body.justification,
      { ip: clientContext, ua: userAgent }
    );

    return NextResponse.json({
      success: true,
      message: "E-mail confirmado manualmente pelo administrador com registro de auditoria.",
      user: {
        id: user.id,
        email: user.email,
        emailConfirmed: user.emailConfirmed,
      },
    });
  } catch (error: any) {
    if (error instanceof AuthorizationError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    if (error instanceof AuthenticationError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    return NextResponse.json(
      { error: error?.message || "Erro ao confirmar e-mail do usuário." },
      { status: 400 }
    );
  }
}
