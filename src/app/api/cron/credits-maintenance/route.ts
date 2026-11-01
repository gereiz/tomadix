import { NextRequest, NextResponse } from "next/server";
import { CreditDailyMaintenanceService } from "@/modules/billing/credit-daily-maintenance.service";
import { ImageRetentionCleanupService } from "@/modules/image-generation/image-retention-cleanup.service";

export async function POST(request: NextRequest) {
  try {
    // Validação de segurança via CRON_SECRET ou Authorization Bearer
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Acesso não autorizado para execução do cron." }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const customDateKey = typeof body.dateKey === "string" ? body.dateKey : undefined;

    const [creditsResult, imagesCleanupResult] = await Promise.all([
      CreditDailyMaintenanceService.executeDailyMaintenance(customDateKey),
      ImageRetentionCleanupService.cleanupExpiredImages(),
    ]);

    return NextResponse.json({
      success: true,
      message: "Rotina diária de manutenção de lotes, créditos e limpeza de retenção de imagens executada com sucesso.",
      result: {
        credits: creditsResult,
        imagesCleanup: imagesCleanupResult,
      },
    });
  } catch (error: any) {
    console.error("Erro na rota do cron de manutenção de créditos:", error);
    return NextResponse.json(
      { error: error?.message || "Falha na execução da manutenção diária de créditos." },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  return POST(request);
}

