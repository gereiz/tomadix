import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { PrivacyService } from "@/modules/privacy/privacy.service";

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser().catch(() => null);
    const body = await request.json().catch(() => ({}));

    const email = body.email || user?.email;
    const requestType = body.requestType;
    const details = body.details;

    const validTypes = ["ACCESS", "RECTIFICATION", "DELETION", "REVOCATION", "PORTABILITY"];
    if (!email || !requestType || !validTypes.includes(requestType)) {
      return NextResponse.json(
        { error: "Dados inválidos. Informe e-mail e tipo de solicitação válido (ACCESS, RECTIFICATION, DELETION, REVOCATION, PORTABILITY)." },
        { status: 400 }
      );
    }

    const dsr = await PrivacyService.createDataSubjectRequest({
      userId: user?.id,
      email,
      requestType,
      details,
    });

    return NextResponse.json({
      success: true,
      message: "Sua solicitação de titular de dados (LGPD) foi registrada com sucesso sob protocolo. O prazo de resposta legal é de até 15 dias.",
      protocol: dsr.id,
      status: dsr.status,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Erro ao registrar solicitação de dados." },
      { status: 500 }
    );
  }
}
