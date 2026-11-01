import { NextRequest, NextResponse } from "next/server";
import { requirePlatformAdmin, AuthorizationError, AuthenticationError } from "@/lib/auth";
import { ImageRetentionCleanupService } from "@/modules/image-generation/image-retention-cleanup.service";
import { AdminAuditService } from "@/modules/admin/admin-audit.service";

export async function POST(request: NextRequest) {
  try {
    const adminUser = await requirePlatformAdmin("settings:manage");
    const result = await ImageRetentionCleanupService.cleanupExpiredImages();

    await AdminAuditService.logAction({
      adminUserId: adminUser.id,
      action: "IMAGE_RETENTION_CLEANUP",
      targetType: "GeneratedImage",
      result: "SUCCESS",
      details: result,
    });

    return NextResponse.json({
      success: true,
      message: `Limpeza de retenção concluída: ${result.totalDeleted} imagens expiradas removidas de ${result.workspacesScanned} workspaces escaneados.`,
      result,
    });
  } catch (error: any) {
    if (error instanceof AuthorizationError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    if (error instanceof AuthenticationError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    return NextResponse.json(
      { error: error?.message || "Erro ao executar limpeza de retenção." },
      { status: 500 }
    );
  }
}

