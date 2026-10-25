import { NextRequest, NextResponse } from "next/server";
import { requirePlatformAdmin, AuthorizationError, AuthenticationError } from "@/lib/auth";
import { AdminUsersService } from "@/modules/admin/admin-users.service";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const adminUser = await requirePlatformAdmin("plans:manage");
    const { id } = await params;
    const body = await request.json().catch(() => ({}));

    const clientContext = request.headers.get("x-forwarded-for") || undefined;
    const userAgent = request.headers.get("user-agent") || undefined;

    const override = await AdminUsersService.grantEntitlementOverride(
      adminUser.id,
      {
        userId: id,
        workspaceId: body.workspaceId,
        grantedPlanTier: body.grantedPlanTier,
        courtesyCredits: body.courtesyCredits ? parseInt(body.courtesyCredits, 10) : undefined,
        expiresAt: body.expiresAt,
        reason: body.reason,
      },
      { ip: clientContext, ua: userAgent }
    );

    return NextResponse.json({
      success: true,
      message: "Concessão administrativa aplicada com sucesso.",
      override,
    });
  } catch (error: any) {
    if (error instanceof AuthorizationError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    if (error instanceof AuthenticationError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    return NextResponse.json(
      { error: error?.message || "Erro ao conceder plano/recursos administrativos." },
      { status: 400 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const adminUser = await requirePlatformAdmin("plans:manage");
    const { searchParams } = new URL(request.url);
    const overrideId = searchParams.get("overrideId");

    if (!overrideId) {
      return NextResponse.json({ error: "overrideId é obrigatório." }, { status: 400 });
    }

    const clientContext = request.headers.get("x-forwarded-for") || undefined;
    const userAgent = request.headers.get("user-agent") || undefined;

    const result = await AdminUsersService.revokeEntitlementOverride(
      adminUser.id,
      overrideId,
      { ip: clientContext, ua: userAgent }
    );

    return NextResponse.json({
      success: true,
      message: "Concessão administrativa revogada com sucesso.",
      override: result,
    });
  } catch (error: any) {
    if (error instanceof AuthorizationError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    if (error instanceof AuthenticationError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    return NextResponse.json(
      { error: error?.message || "Erro ao revogar concessão administrativa." },
      { status: 400 }
    );
  }
}
