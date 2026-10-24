import { NextRequest, NextResponse } from "next/server";
import { requirePlatformAdmin, AuthorizationError, AuthenticationError, getClientContext } from "@/lib/auth";
import { PrivacyService } from "@/modules/privacy/privacy.service";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const adminUser = await requirePlatformAdmin();
    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const clientContext = await getClientContext();

    const { resolution, status } = body;
    if (!status || !resolution) {
      return NextResponse.json(
        { error: "Informe resolution (parecer explicativo) e status (COMPLETED, REJECTED ou IN_REVIEW)." },
        { status: 400 }
      );
    }

    const updated = await PrivacyService.resolveDataSubjectRequest(
      adminUser.id,
      id,
      resolution,
      status,
      {
        ip: clientContext.ipAddress,
        ua: clientContext.userAgent,
      }
    );

    return NextResponse.json({
      success: true,
      message: "Solicitação de titular atualizada com sucesso.",
      request: updated,
    });
  } catch (error: any) {
    if (error instanceof AuthorizationError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    if (error instanceof AuthenticationError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    return NextResponse.json({ error: error?.message || "Erro ao processar solicitação." }, { status: 500 });
  }
}
