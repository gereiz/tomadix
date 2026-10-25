import { NextRequest, NextResponse } from "next/server";
import { requirePlatformAdmin, AuthorizationError, AuthenticationError } from "@/lib/auth";
import { AdminProjectsService } from "@/modules/admin/admin-projects.service";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const adminUser = await requirePlatformAdmin("projects:manage");
    const { id } = await params;
    const body = await request.json().catch(() => ({}));

    const clientContext = request.headers.get("x-forwarded-for") || undefined;
    const userAgent = request.headers.get("user-agent") || undefined;

    const restored = await AdminProjectsService.restorePreviousOwnership(
      adminUser.id,
      id,
      body.reason || "Restauração de propriedade solicitada",
      { ip: clientContext, ua: userAgent }
    );

    return NextResponse.json({
      success: true,
      message: "Propriedade anterior restaurada com sucesso.",
      project: restored,
    });
  } catch (error: any) {
    if (error instanceof AuthorizationError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    if (error instanceof AuthenticationError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    return NextResponse.json(
      { error: error?.message || "Erro ao restaurar propriedade anterior." },
      { status: 400 }
    );
  }
}
