import { NextRequest, NextResponse } from "next/server";
import { requirePlatformAdmin, AuthorizationError, AuthenticationError } from "@/lib/auth";
import { AdminUsersService } from "@/modules/admin/admin-users.service";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const adminUser = await requirePlatformAdmin("users:manage");
    const { id } = await params;
    const body = await request.json().catch(() => ({}));

    if (!Array.isArray(body.permissions)) {
      return NextResponse.json(
        { error: "A lista de permissões deve ser um array." },
        { status: 400 }
      );
    }

    const clientContext = request.headers.get("x-forwarded-for") || undefined;
    const userAgent = request.headers.get("user-agent") || undefined;

    const updatedUser = await AdminUsersService.updateCustomPermissions(
      adminUser.id,
      id,
      body.permissions,
      { ip: clientContext, ua: userAgent }
    );

    return NextResponse.json({
      success: true,
      message: "Permissões atualizadas com sucesso.",
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        preferences: updatedUser.preferences,
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
      { error: error?.message || "Erro ao atualizar permissões." },
      { status: 400 }
    );
  }
}
