import { NextRequest, NextResponse } from "next/server";
import { requirePlatformAdmin, AuthorizationError, AuthenticationError } from "@/lib/auth";
import { db } from "@/lib/db";
import { ImageProviderRegistryService } from "@/modules/image-generation/image-provider-registry.service";
import { AdminAuditService } from "@/modules/admin/admin-audit.service";

export async function GET() {
  try {
    await requirePlatformAdmin("settings:manage");

    const providerConfig = await ImageProviderRegistryService.getProviderConfig("pollinations");
    const models = await ImageProviderRegistryService.listModelsForAdmin("pollinations");

    // Obter custo padrão configurado na operação GEN_IMAGE_DIRECT ou no customConfig
    const customConfig = (providerConfig.customConfig as Record<string, any>) || {};
    let defaultCreditCost = customConfig.defaultCreditCost;
    if (defaultCreditCost === undefined || defaultCreditCost === null) {
      const op = await db.creditOperation.findUnique({
        where: { code: "GEN_IMAGE_DIRECT" },
        select: { defaultCreditCost: true },
      }).catch(() => null);
      defaultCreditCost = op?.defaultCreditCost ?? 10;
    }

    // Garantir que a apiKey bruta NUNCA seja retornada no frontend
    const safeConfig = {
      id: providerConfig.id,
      providerId: providerConfig.providerId,
      name: providerConfig.name,
      maskedKey: providerConfig.maskedKey,
      hasApiKey: Boolean(providerConfig.apiKey && providerConfig.apiKey.trim().length > 0),
      baseUrl: providerConfig.baseUrl,
      isActive: providerConfig.isActive,
      defaultModel: providerConfig.defaultModel,
      defaultCreditCost: Number(defaultCreditCost),
      connectionStatus: providerConfig.connectionStatus,
      lastTestedAt: providerConfig.lastTestedAt,
      lastTestMessage: providerConfig.lastTestMessage,
      lastUsedAt: providerConfig.lastUsedAt,
      requestsCount: providerConfig.requestsCount,
      successCount: providerConfig.successCount,
      failuresCount: providerConfig.failuresCount,
      createdAt: providerConfig.createdAt,
      updatedAt: providerConfig.updatedAt,
      modelsCount: models.length,
      activeModelsCount: models.filter((m) => m.isEnabled && m.isAvailable).length,
    };

    return NextResponse.json({
      success: true,
      provider: safeConfig,
      models,
    });
  } catch (error: any) {
    if (error instanceof AuthorizationError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    if (error instanceof AuthenticationError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    return NextResponse.json(
      { error: error?.message || "Erro ao consultar provedores de imagem." },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const adminUser = await requirePlatformAdmin("settings:manage");
    const body = await request.json().catch(() => ({}));

    const { providerId = "pollinations", name, apiKey, baseUrl, isActive, defaultModel, defaultCreditCost } = body;

    const updated = await ImageProviderRegistryService.saveProviderConfig({
      providerId,
      name,
      apiKey,
      baseUrl,
      isActive,
      defaultModel,
      defaultCreditCost: defaultCreditCost !== undefined ? Number(defaultCreditCost) : undefined,
    });

    await AdminAuditService.logAction({
      adminUserId: adminUser.id,
      action: "IMAGE_PROVIDER_CONFIG_UPDATE",
      targetType: "ImageProviderConfig",
      targetId: providerId,
      result: "SUCCESS",
      details: {
        providerId,
        name: updated.name,
        baseUrl: updated.baseUrl,
        isActive: updated.isActive,
        defaultModel: updated.defaultModel,
        hasKey: Boolean(apiKey && apiKey.trim().length > 0),
      },
    });

    return NextResponse.json({
      success: true,
      message: `Configurações do provedor ${updated.name} salvas com sucesso.`,
      provider: {
        id: updated.id,
        providerId: updated.providerId,
        name: updated.name,
        maskedKey: updated.maskedKey,
        baseUrl: updated.baseUrl,
        isActive: updated.isActive,
        defaultModel: updated.defaultModel,
        connectionStatus: updated.connectionStatus,
      },
    });
  } catch (error: any) {
    if (error instanceof AuthorizationError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    if (error instanceof AuthenticationError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    return NextResponse.json(
      { error: error?.message || "Erro ao salvar configurações do provedor." },
      { status: 500 }
    );
  }
}

