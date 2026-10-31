import { NextRequest, NextResponse } from "next/server";
import { requirePlatformAdmin, AuthorizationError, AuthenticationError } from "@/lib/auth";
import { ImageProviderRegistryService } from "@/modules/image-generation/image-provider-registry.service";
import { AdminAuditService } from "@/modules/admin/admin-audit.service";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const adminUser = await requirePlatformAdmin("settings:manage");
    const { id } = await params;

    const syncResult = await ImageProviderRegistryService.syncModels(id);
    const updatedModels = await ImageProviderRegistryService.listModelsForAdmin(id);

    await AdminAuditService.logAction({
      adminUserId: adminUser.id,
      action: "IMAGE_PROVIDER_SYNC_MODELS",
      targetType: "ImageProviderConfig",
      targetId: id,
      result: "SUCCESS",
      details: syncResult,
    });

    return NextResponse.json({
      success: true,
      message: `Catálogo sincronizado com sucesso: ${syncResult.synced} modelos verificados (${syncResult.added} novos, ${syncResult.updated} atualizados).`,
      result: syncResult,
      models: updatedModels,
    });
  } catch (error: any) {
    if (error instanceof AuthorizationError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    if (error instanceof AuthenticationError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    return NextResponse.json(
      { error: error?.message || "Erro ao sincronizar catálogo de modelos." },
      { status: 500 }
    );
  }
}

