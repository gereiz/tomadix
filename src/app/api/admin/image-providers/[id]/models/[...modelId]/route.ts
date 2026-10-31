import { NextRequest, NextResponse } from "next/server";
import { requirePlatformAdmin, AuthorizationError, AuthenticationError } from "@/lib/auth";
import { ImageProviderRegistryService } from "@/modules/image-generation/image-provider-registry.service";
import { AdminAuditService } from "@/modules/admin/admin-audit.service";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; modelId: string | string[] }> }
) {
  try {
    const adminUser = await requirePlatformAdmin("settings:manage");
    const resolvedParams = await params;
    const id = resolvedParams.id;
    const rawModelId = Array.isArray(resolvedParams.modelId)
      ? resolvedParams.modelId.join("/")
      : resolvedParams.modelId;
    const modelId = decodeURIComponent(rawModelId);
    const body = await request.json().catch(() => ({}));

    const { isEnabled, isDefault, defaultCreditCost, displayOrder } = body;

    const updated = await ImageProviderRegistryService.updateModelConfig(id, modelId, {
      isEnabled,
      isDefault,
      defaultCreditCost: defaultCreditCost !== undefined ? (defaultCreditCost === null ? null : Number(defaultCreditCost)) : undefined,
      displayOrder: displayOrder !== undefined ? Number(displayOrder) : undefined,
    });

    await AdminAuditService.logAction({
      adminUserId: adminUser.id,
      action: "IMAGE_MODEL_CONFIG_UPDATE",
      targetType: "ImageModelConfig",
      targetId: modelId,
      result: "SUCCESS",
      details: {
        providerId: id,
        modelId,
        isEnabled: updated.isEnabled,
        isDefault: updated.isDefault,
        defaultCreditCost: updated.defaultCreditCost,
      },
    });

    return NextResponse.json({
      success: true,
      message: `Configurações do modelo "${updated.name}" atualizadas.`,
      model: updated,
    });
  } catch (error: any) {
    if (error instanceof AuthorizationError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    if (error instanceof AuthenticationError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    return NextResponse.json(
      { error: error?.message || "Erro ao atualizar modelo de imagem." },
      { status: 500 }
    );
  }
}

