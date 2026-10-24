import { NextRequest, NextResponse } from "next/server";
import { requireCurrentUser, getClientContext, AuthenticationError } from "@/lib/auth";
import { PrivacyService } from "@/modules/privacy/privacy.service";

export async function GET() {
  try {
    const user = await requireCurrentUser();
    const consents = await PrivacyService.listUserConsents(user.id);
    return NextResponse.json({ consents });
  } catch (error: any) {
    if (error instanceof AuthenticationError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    return NextResponse.json({ error: error?.message || "Erro ao consultar consentimentos." }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireCurrentUser();
    const body = await request.json().catch(() => ({}));
    const clientContext = await getClientContext();

    const { consentType, version, granted } = body;

    if (!consentType || !version || typeof granted !== "boolean") {
      return NextResponse.json(
        { error: "Dados inválidos. Informe consentType, version e granted (boolean)." },
        { status: 400 }
      );
    }

    const record = await PrivacyService.recordConsent({
      userId: user.id,
      consentType,
      version,
      granted,
      ipAddress: clientContext.ipAddress,
      userAgent: clientContext.userAgent,
    });

    return NextResponse.json({
      success: true,
      message: "Consentimento registrado com sucesso.",
      consent: record,
    });
  } catch (error: any) {
    if (error instanceof AuthenticationError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    return NextResponse.json({ error: error?.message || "Erro ao registrar consentimento." }, { status: 500 });
  }
}
