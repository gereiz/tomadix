import { NextRequest, NextResponse } from "next/server";
import { requirePlatformAdmin, AuthorizationError, AuthenticationError, getClientContext } from "@/lib/auth";
import { AdminUsersService } from "@/modules/admin/admin-users.service";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const adminUser = await requirePlatformAdmin();
    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const clientContext = await getClientContext();

    const reason = body.reason || "";
    const updated = await AdminUsersService.reactivateUser(adminUser.id, id, reason, {
      ip: clientContext.ipAddress,
      ua: clientContext.userAgent,
    });

    return NextResponse.json({
      success: true,
      message: "Usuário reativado com sucesso.",
      user: {
        id: updated.id,
        email: updated.email,
        isSuspended: updated.isSuspended,
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
      { error: error?.message || "Erro ao reativar usuário." },
      { status: 400 }
    );
  }
}
