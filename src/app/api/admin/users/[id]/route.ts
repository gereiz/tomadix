import { NextRequest, NextResponse } from "next/server";
import { requirePlatformAdmin, AuthorizationError, AuthenticationError } from "@/lib/auth";
import { AdminUsersService } from "@/modules/admin/admin-users.service";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requirePlatformAdmin();
    const { id } = await params;

    const details = await AdminUsersService.getUserDetails(id);
    return NextResponse.json(details);
  } catch (error: any) {
    if (error instanceof AuthorizationError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    if (error instanceof AuthenticationError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    return NextResponse.json(
      { error: error?.message || "Erro ao consultar detalhes do usuário." },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const adminUser = await requirePlatformAdmin("users:manage");
    const { id } = await params;
    const body = await request.json().catch(() => ({}));

    const clientContext = request.headers.get("x-forwarded-for") || undefined;
    const userAgent = request.headers.get("user-agent") || undefined;
    const ctx = { ip: clientContext, ua: userAgent };

    let updatedUser;

    // Se houver alteração de papel administrativo
    if (body.platformRole) {
      updatedUser = await AdminUsersService.updatePlatformRole(
        adminUser.id,
        id,
        body.platformRole,
        ctx
      );
    }

    // Se houver alteração cadastral
    if (body.displayName !== undefined || body.emailConfirmed !== undefined) {
      updatedUser = await AdminUsersService.updateUserDetails(
        adminUser.id,
        id,
        {
          displayName: body.displayName,
          emailConfirmed: body.emailConfirmed,
        },
        ctx
      );
    }

    return NextResponse.json({
      success: true,
      user: updatedUser,
    });
  } catch (error: any) {
    if (error instanceof AuthorizationError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    if (error instanceof AuthenticationError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    return NextResponse.json(
      { error: error?.message || "Erro ao atualizar usuário." },
      { status: 400 }
    );
  }
}
