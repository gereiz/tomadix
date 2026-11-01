import { db } from "@/lib/db";
import { ImageProviderConfig, ImageModelConfig, ImageProviderStatus } from "@prisma/client";
import { PollinationsImageProvider } from "./pollinations-image-provider";
import { ImageGenerationProvider } from "./image-provider.interface";
import { ImageModelDefinition, ImageConnectionTestResult, ImageGenerationError } from "./image-generation.types";

export class ImageProviderRegistryService {
  private static providers: Map<string, ImageGenerationProvider> = new Map([
    ["pollinations", new PollinationsImageProvider()],
  ]);

  /**
   * Retorna a instância em tempo de execução do provedor solicitado.
   */
  static getProvider(providerId = "pollinations"): ImageGenerationProvider {
    const provider = this.providers.get(providerId.toLowerCase());
    if (!provider) {
      throw new ImageGenerationError(
        `Provedor de imagem "${providerId}" não suportado pelo sistema.`,
        "UNSUPPORTED_PROVIDER",
        400
      );
    }
    return provider;
  }

  /**
   * Mascara com segurança a API Key para exibição na interface administrativa.
   * Exemplo: "sk_live_1234567890abcdef" -> "sk_l...cdef"
   */
  static maskApiKey(key: string): string {
    if (!key || key.trim().length === 0) return "(não configurada)";
    const trimmed = key.trim();
    if (trimmed.length <= 8) return "••••••••";
    const start = trimmed.slice(0, 4);
    const end = trimmed.slice(-4);
    return `${start}...${end}`;
  }

  /**
   * Obtém as configurações do provedor persistidas no banco.
   * Auto-provisiona a configuração inicial da Pollinations caso ainda não exista.
   */
  static async getProviderConfig(providerId = "pollinations"): Promise<ImageProviderConfig> {
    let config = await db.imageProviderConfig.findUnique({
      where: { providerId },
    });

    if (!config) {
      const envKey = process.env.POLLINATIONS_API_KEY || "";
      config = await db.imageProviderConfig.create({
        data: {
          providerId,
          name: "Pollinations.ai",
          apiKey: envKey,
          maskedKey: envKey ? this.maskApiKey(envKey) : "(não configurada)",
          baseUrl: "https://gen.pollinations.ai",
          isActive: true,
          defaultModel: "flux",
          connectionStatus: envKey ? ImageProviderStatus.CONNECTED : ImageProviderStatus.UNCONFIGURED,
        },
      });

      // Popular modelos padrão de fallback
      await this.syncModels(providerId).catch((err) => {
        console.warn("[ImageProviderRegistry] Sincronização inicial de modelos adiada:", err.message);
      });
    }

    return config;
  }

  /**
   * Salva ou atualiza as configurações do provedor de imagem.
   * Nunca vaza chaves nem permite campos nulos indevidos.
   */
  static async saveProviderConfig(params: {
    providerId: string;
    name?: string;
    apiKey?: string;
    baseUrl?: string;
    isActive?: boolean;
    defaultModel?: string;
    defaultCreditCost?: number;
  }): Promise<ImageProviderConfig> {
    const { providerId, name, apiKey, baseUrl, isActive, defaultModel, defaultCreditCost } = params;

    const existing = await this.getProviderConfig(providerId);

    const updateData: any = {};
    if (name !== undefined) updateData.name = name.trim();
    if (baseUrl !== undefined) updateData.baseUrl = baseUrl.trim();
    if (isActive !== undefined) updateData.isActive = Boolean(isActive);

    // Suporte e sincronização com o custo padrão de créditos da geração de imagens
    if (defaultCreditCost !== undefined && defaultCreditCost >= 0) {
      const currentCustom = (existing.customConfig as Record<string, any>) || {};
      updateData.customConfig = {
        ...currentCustom,
        defaultCreditCost: Number(defaultCreditCost),
      };

      // Sincronizar simultaneamente com a operação GEN_IMAGE_DIRECT na Tabela de Créditos
      try {
        await db.creditOperation.upsert({
          where: { code: "GEN_IMAGE_DIRECT" },
          create: {
            code: "GEN_IMAGE_DIRECT",
            name: "Geração Direta de Imagem IA",
            description: "Geração direta de imagem através de provedores integrados (Pollinations.ai).",
            category: "IMAGES",
            defaultCreditCost: Number(defaultCreditCost),
            isActive: true,
            isFree: Number(defaultCreditCost) === 0,
          },
          update: {
            defaultCreditCost: Number(defaultCreditCost),
            isFree: Number(defaultCreditCost) === 0,
          },
        });
      } catch (err: any) {
        console.warn("[ImageProviderRegistry] Aviso ao sincronizar GEN_IMAGE_DIRECT:", err?.message);
      }
    }

    if (defaultModel !== undefined && defaultModel.trim().length > 0) {
      const trimmedModel = defaultModel.trim();
      updateData.defaultModel = trimmedModel;

      // Sincronizar simultaneamente com a tabela de modelos para garantir consistência
      await db.imageModelConfig.updateMany({
        where: { providerConfigId: existing.id },
        data: { isDefault: false },
      });

      const targetModel = await db.imageModelConfig.findFirst({
        where: {
          providerConfigId: existing.id,
          OR: [
            { modelId: trimmedModel },
            { modelId: { contains: trimmedModel } },
          ],
        },
      });

      if (targetModel) {
        await db.imageModelConfig.update({
          where: { id: targetModel.id },
          data: { isDefault: true },
        });
        updateData.defaultModel = targetModel.modelId;
      }
    }

    if (apiKey !== undefined && apiKey.trim().length > 0) {
      updateData.apiKey = apiKey.trim();
      updateData.maskedKey = this.maskApiKey(apiKey.trim());
      updateData.connectionStatus = ImageProviderStatus.UNCONFIGURED; // Requer novo teste
    }

    const updated = await db.imageProviderConfig.update({
      where: { providerId: existing.providerId },
      data: updateData,
    });

    return updated;
  }

  /**
   * Testa a conexão do provedor e atualiza seu status no banco.
   */
  static async testProviderConnection(providerId = "pollinations"): Promise<ImageConnectionTestResult> {
    const config = await this.getProviderConfig(providerId);
    const provider = this.getProvider(providerId);

    const result = await provider.testConnection(config.apiKey, config.baseUrl);

    let dbStatus: ImageProviderStatus = ImageProviderStatus.ERROR;
    if (result.status === "CONNECTED") dbStatus = ImageProviderStatus.CONNECTED;
    else if (result.status === "INVALID_KEY") dbStatus = ImageProviderStatus.INVALID_KEY;
    else if (result.status === "INSUFFICIENT_BALANCE") dbStatus = ImageProviderStatus.INSUFFICIENT_BALANCE;
    else if (result.status === "UNREACHABLE") dbStatus = ImageProviderStatus.UNREACHABLE;
    else if (result.status === "UNCONFIGURED") dbStatus = ImageProviderStatus.UNCONFIGURED;

    await db.imageProviderConfig.update({
      where: { id: config.id },
      data: {
        connectionStatus: dbStatus,
        lastTestedAt: new Date(),
        lastTestMessage: result.message,
      },
    });

    return result;
  }

  /**
   * Sincroniza o catálogo de modelos consultando a API do provedor.
   * Preserva customizações administrativas (status habilitado, custos e modelo padrão).
   * Modelos removidos da API são marcados como isAvailable = false, sem deletar histórico.
   */
  static async syncModels(providerId = "pollinations"): Promise<{ synced: number; added: number; updated: number }> {
    const config = await this.getProviderConfig(providerId);
    const provider = this.getProvider(providerId);

    let fetchedModels: ImageModelDefinition[] = [];
    let isFromRemote = false;
    try {
      fetchedModels = await provider.listModels(config.apiKey, config.baseUrl);
      isFromRemote = true;
    } catch (err: any) {
      console.warn(`[ImageProviderRegistry] Falha ao consultar catálogo remoto de ${providerId}. Usando modelos essenciais:`, err.message);
      if (provider instanceof PollinationsImageProvider) {
        fetchedModels = provider.getFallbackModels();
      }
    }

    if (fetchedModels.length === 0) {
      return { synced: 0, added: 0, updated: 0 };
    }

    const existingModels = await db.imageModelConfig.findMany({
      where: { providerConfigId: config.id },
    });

    const existingMap = new Map(existingModels.map((m) => [m.modelId, m]));
    const fetchedIds = new Set(fetchedModels.map((m) => m.modelId));

    let added = 0;
    let updated = 0;

    for (const model of fetchedModels) {
      const existing = existingMap.get(model.modelId);

      if (existing) {
        // Atualizar informações da API preservando switches do admin, desabilitando modelos indisponíveis
        await db.imageModelConfig.update({
          where: { id: existing.id },
          data: {
            name: model.name || existing.name,
            publisher: model.publisher || existing.publisher,
            description: model.description || existing.description,
            capabilities: model.capabilities || existing.capabilities,
            supportedSizes: model.supportedSizes || existing.supportedSizes,
            supportsReferenceImage: model.supportsReferenceImage,
            supportsImageEditing: model.supportsImageEditing,
            pricingInfo: (model.pricingInfo || existing.pricingInfo || {}) as any,
            isAvailable: model.isAvailable,
            isEnabled: model.isAvailable ? existing.isEnabled : false,
            lastSyncedAt: new Date(),
          },
        });
        updated++;
      } else {
        // Novo modelo descoberto
        await db.imageModelConfig.create({
          data: {
            providerConfigId: config.id,
            modelId: model.modelId,
            name: model.name,
            publisher: model.publisher,
            description: model.description,
            capabilities: model.capabilities,
            supportedSizes: model.supportedSizes,
            supportsReferenceImage: model.supportsReferenceImage,
            supportsImageEditing: model.supportsImageEditing,
            pricingInfo: model.pricingInfo || {},
            isAvailable: true,
            isEnabled: true,
            isDefault: model.isDefault || model.modelId === "flux",
            defaultCreditCost: model.defaultCreditCost || null,
            displayOrder: model.displayOrder ?? 0,
          },
        });
        added++;
      }
    }

    // Apenas marca como indisponível se a lista veio comprovadamente do catálogo remoto oficial com amplitude (> 5 modelos)
    if (isFromRemote && fetchedModels.length > 5) {
      for (const existing of existingModels) {
        if (!fetchedIds.has(existing.modelId) && existing.isAvailable) {
          await db.imageModelConfig.update({
            where: { id: existing.id },
            data: { isAvailable: false },
          });
        }
      }
    }

    return {
      synced: fetchedModels.length,
      added,
      updated,
    };
  }

  /**
   * Lista todos os modelos cadastrados para o console administrativo.
   */
  static async listModelsForAdmin(providerId = "pollinations"): Promise<ImageModelConfig[]> {
    const config = await this.getProviderConfig(providerId);

    let models = await db.imageModelConfig.findMany({
      where: { providerConfigId: config.id },
      orderBy: [{ isDefault: "desc" }, { displayOrder: "asc" }, { name: "asc" }],
    });

    if (models.length === 0) {
      await this.syncModels(providerId);
      models = await db.imageModelConfig.findMany({
        where: { providerConfigId: config.id },
        orderBy: [{ isDefault: "desc" }, { displayOrder: "asc" }, { name: "asc" }],
      });
    }

    // Se houver discrepância entre o defaultModel do provedor e a flag isDefault dos modelos, reconciliar
    if (config.defaultModel) {
      const currentDefault = models.find((m) => m.isDefault);
      if (!currentDefault || currentDefault.modelId !== config.defaultModel) {
        const matchingModel = models.find(
          (m) => m.modelId === config.defaultModel || m.modelId.includes(config.defaultModel!)
        );
        if (matchingModel) {
          await db.imageModelConfig.updateMany({
            where: { providerConfigId: config.id },
            data: { isDefault: false },
          });
          await db.imageModelConfig.update({
            where: { id: matchingModel.id },
            data: { isDefault: true },
          });
          models.forEach((m) => {
            m.isDefault = m.id === matchingModel.id;
          });
        }
      }
    }

    return models;
  }

  /**
   * Atualiza as configurações de um modelo específico.
   */
  static async updateModelConfig(
    providerId: string,
    modelId: string,
    data: {
      isEnabled?: boolean;
      isDefault?: boolean;
      defaultCreditCost?: number | null;
      displayOrder?: number;
    }
  ): Promise<ImageModelConfig> {
    const config = await this.getProviderConfig(providerId);

    let existing = await db.imageModelConfig.findUnique({
      where: {
        providerConfigId_modelId: {
          providerConfigId: config.id,
          modelId,
        },
      },
    });

    if (!existing) {
      existing = await db.imageModelConfig.findFirst({
        where: {
          providerConfigId: config.id,
          OR: [
            { modelId },
            { modelId: { contains: modelId } },
          ],
        },
      });
    }

    if (!existing) {
      throw new ImageGenerationError(`Modelo "${modelId}" não encontrado para o provedor ${providerId}.`, "MODEL_NOT_FOUND", 404);
    }

    // Se for definido como default, remover flag default dos demais
    if (data.isDefault) {
      await db.imageModelConfig.updateMany({
        where: { providerConfigId: config.id },
        data: { isDefault: false },
      });
      await db.imageProviderConfig.update({
        where: { id: config.id },
        data: { defaultModel: existing.modelId },
      });
    }

    const updated = await db.imageModelConfig.update({
      where: { id: existing.id },
      data: {
        ...(data.isEnabled !== undefined ? { isEnabled: Boolean(data.isEnabled) } : {}),
        ...(data.isDefault !== undefined ? { isDefault: Boolean(data.isDefault) } : {}),
        ...(data.defaultCreditCost !== undefined ? { defaultCreditCost: data.defaultCreditCost } : {}),
        ...(data.displayOrder !== undefined ? { displayOrder: data.displayOrder } : {}),
      },
    });

    return updated;
  }
}
