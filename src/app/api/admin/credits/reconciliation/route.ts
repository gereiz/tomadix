import { NextRequest, NextResponse } from "next/server";
import { requirePlatformAdmin, AuthorizationError, AuthenticationError } from "@/lib/auth";
import { CreditLotService } from "@/modules/billing/credit-lot.service";
import { db } from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    await requirePlatformAdmin("users:manage");

    const { searchParams } = new URL(request.url);
    const workspaceId = searchParams.get("workspaceId");

    if (workspaceId) {
      const report = await CreditLotService.reconcileWorkspace(workspaceId);
      return NextResponse.json({ report });
    }

    // Listar workspaces e seus status de conciliação
    const workspaces = await db.workspace.findMany({
      select: { id: true, name: true, creditsBalance: true },
      take: 50,
      orderBy: { updatedAt: "desc" },
    });

    const reports = await Promise.all(
      workspaces.map((ws) => CreditLotService.reconcileWorkspace(ws.id))
    );

    const totalWorkspaces = reports.length;
    const consistentWorkspaces = reports.filter((r) => r.isConsistent).length;
    const inconsistentWorkspaces = totalWorkspaces - consistentWorkspaces;

    return NextResponse.json({
      summary: {
        totalWorkspaces,
        consistentWorkspaces,
        inconsistentWorkspaces,
      },
      reports,
    });
  } catch (error: any) {
    if (error instanceof AuthorizationError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    if (error instanceof AuthenticationError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    return NextResponse.json(
      { error: error?.message || "Erro ao executar diagnóstico de conciliação de créditos." },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    await requirePlatformAdmin("users:manage");
    const body = await request.json().catch(() => ({}));

    if (body.action === "migrate-legacy") {
      const result = await CreditLotService.migrateLegacyBalances();
      return NextResponse.json({
        success: true,
        message: `Migração de saldos legados concluída. ${result.migratedCount} workspaces migrados, totalizando ${result.totalCreditsMigrated} créditos em lotes LEGACY.`,
        result,
      });
    }

    if (body.action === "reconcile" && body.workspaceId) {
      const report = await CreditLotService.reconcileWorkspace(body.workspaceId);
      return NextResponse.json({
        success: true,
        report,
      });
    }

    return NextResponse.json({ error: "Ação não reconhecida." }, { status: 400 });
  } catch (error: any) {
    if (error instanceof AuthorizationError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    if (error instanceof AuthenticationError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    return NextResponse.json(
      { error: error?.message || "Erro ao processar conciliação de créditos." },
      { status: 500 }
    );
  }
}

