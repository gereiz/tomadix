import { NextRequest, NextResponse } from "next/server";
import { requirePlatformAdmin, AuthorizationError, AuthenticationError } from "@/lib/auth";
import { CreditRenewalService } from "@/modules/billing/credit-renewal.service";

export async function POST(request: NextRequest) {
  try {
    const adminUser = await requirePlatformAdmin("credits:manage");
    const body = await request.json().catch(() => ({}));

    const report = await CreditRenewalService.executeRenewalJob({
      frequency: body.frequency,
      targetWorkspaceId: body.targetWorkspaceId,
      dryRun: Boolean(body.dryRun),
      adminUserId: adminUser.id,
    });

    return NextResponse.json({
      success: true,
      message: body.dryRun
        ? "Simulação da rotina de renovação concluída."
        : `Rotina executada: ${report.renewedCount} estúdios renovados com ${report.totalCreditsGranted} créditos concedidos.`,
      report,
    });
  } catch (error: any) {
    if (error instanceof AuthorizationError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    if (error instanceof AuthenticationError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    return NextResponse.json(
      { error: error?.message || "Erro ao executar rotina de renovação de créditos." },
      { status: 400 }
    );
  }
}
