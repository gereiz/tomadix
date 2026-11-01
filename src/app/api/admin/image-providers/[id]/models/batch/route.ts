import { NextRequest, NextResponse } from "next/server";
import { requirePlatformAdmin, AuthorizationError, AuthenticationError } from "@/lib/auth";
import { db } from "@/lib/db";
import { ImageProviderRegistryService } from "@/modules/image-generation/image-provider-registry.service";
import { AdminAuditService } from "@/modules/admin/admin-audit.service";
import { z } from "zod";

const batchActionSchema = z.object({
  action: z.enum(["ENABLE_ALL", "DISABLE_ALL", "DISABLE_PAID", "ENABLE_FREE", "SET_STATE"]),
  isEnabled: z.boolean().optional(),
  modelIds: z.array(z.string()).optional(),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const adminUser = await requirePlatformAdmin("settings:manage");
    const { id: providerId } = await params;
    const body = await request.json();
    const validated = batchActionSchema.parse(body);

    const providerConfig = await ImageProviderRegistryService.getProviderConfig(providerId);

    const allModels = await db.imageModelConfig.findMany({
      where: { providerConfigId: providerConfig.id },
    });

    let updatedCount = 0;

    const isModelPaid = (m: any) => {
      const pricing = (m.pricingInfo as any) || {};
      const tokens = parseFloat(pricing.completionImageTokens || pricing.promptImageTokens || "0");
      if (tokens > 0) return true;
      if (pricing.paidOnly === true || pricing.costType === "PAID") return true;
      if (pricing.costPollen && !pricing.costPollen.toLowerCase().includes("gratuito") && !pricing.costPollen.toLowerCase().includes("0 pollen")) {
        return true;
      }
      const lowerId = (m.modelId || "").toLowerCase();
      if (
        lowerId.includes("flux.2") ||
        lowerId.includes("flux-2") ||
        lowerId.includes("flux.3") ||
        lowerId.includes("flux-3") ||
        lowerId.includes("flux.1.1") ||
        lowerId.includes("flux-1.1") ||
        lowerId.includes("seedream-5.0-pro") ||
        lowerId.includes("qwen-image-2.1-pro") ||
        lowerId.includes("recraft-v4.1-flash") ||
        lowerId.includes("mai-image-2.6") ||
        (lowerId.includes("max") && !lowerId.includes("schnell")) ||
        (lowerId.includes("flex") && !lowerId.includes("schnell")) ||
        (lowerId.includes("pro") && !lowerId.includes("schnell"))
      ) {
        return true;
      }
      return false;
    };

    if (validated.action === "ENABLE_ALL") {
      const res = await db.imageModelConfig.updateMany({
        where: { providerConfigId: providerConfig.id },
        data: { isEnabled: true },
      });
      updatedCount = res.count;
    } else if (validated.action === "DISABLE_ALL") {
      const res = await db.imageModelConfig.updateMany({
        where: {
          providerConfigId: providerConfig.id,
          isDefault: false, // Preserva o modelo padrão ativo
        },
        data: { isEnabled: false },
      });
      updatedCount = res.count;
    } else if (validated.action === "DISABLE_PAID") {
      // Identificar modelos pagos
      const paidIds = allModels
        .filter((m) => isModelPaid(m))
        .map((m) => m.id);

      if (paidIds.length > 0) {
        const res = await db.imageModelConfig.updateMany({
          where: {
            id: { in: paidIds },
            isDefault: false,
          },
          data: { isEnabled: false },
        });
        updatedCount = res.count;
      }
    } else if (validated.action === "ENABLE_FREE") {
      // Identificar modelos gratuitos
      const freeIds = allModels
        .filter((m) => !isModelPaid(m))
        .map((m) => m.id);

      if (freeIds.length > 0) {
        const res = await db.imageModelConfig.updateMany({
          where: { id: { in: freeIds } },
          data: { isEnabled: true },
        });
        updatedCount = res.count;
      }
    } else if (validated.action === "SET_STATE" && validated.modelIds && validated.isEnabled !== undefined) {
      const res = await db.imageModelConfig.updateMany({
        where: {
          providerConfigId: providerConfig.id,
          modelId: { in: validated.modelIds },
        },
        data: { isEnabled: validated.isEnabled },
      });
      updatedCount = res.count;
    }

    const updatedList = await ImageProviderRegistryService.listModelsForAdmin(providerId);

    await AdminAuditService.logAction({
      adminUserId: adminUser.id,
      action: "IMAGE_MODELS_BATCH_UPDATE",
      targetType: "ImageProviderConfig",
      targetId: providerId,
      result: "SUCCESS",
      details: { action: validated.action, affected: updatedCount },
    });

    return NextResponse.json({
      success: true,
      message: `Ação em lote aplicada com sucesso (${updatedCount} modelos atualizados).`,
      models: updatedList,
    });
  } catch (error: any) {
    if (error instanceof AuthorizationError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    if (error instanceof AuthenticationError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Payload inválido.", details: error.flatten() }, { status: 400 });
    }
    return NextResponse.json(
      { error: error?.message || "Erro ao processar alteração em lote de modelos." },
      { status: 500 }
    );
  }
}

