import {
  ImageGenerationOptions,
  ImageGenerationResult,
  ImageModelDefinition,
  ImageProviderCapabilities,
  ImageConnectionTestResult,
  ImageGenerationError,
  ImageAspectRatio,
} from "./image-generation.types";

export class PollinationsImageProvider {
  readonly id = "pollinations";
  readonly name = "Pollinations.ai";
  readonly defaultBaseUrl = "https://gen.pollinations.ai";

  getCapabilities(): ImageProviderCapabilities {
    return {
      supportsReferenceImages: true,
      supportsImageEditing: false,
      supportsNegativePrompt: true,
      supportsMultipleImages: false,
      supportedAspectRatios: ["1:1", "16:9", "9:16", "4:3", "3:4", "21:9"],
      supportedResolutions: [
        "1024x1024",
        "1280x720",
        "720x1280",
        "1024x768",
        "768x1024",
        "1344x576",
        "576x1344",
      ],
    };
  }

  /**
   * Converte proporção e resolução em width e height numéricos.
   */
  private resolveDimensions(aspectRatio?: ImageAspectRatio, resolution?: string): { width: number; height: number; size: string } {
    if (resolution && resolution.includes("x")) {
      const [w, h] = resolution.split("x").map(Number);
      if (!isNaN(w) && !isNaN(h) && w > 0 && h > 0) {
        return { width: w, height: h, size: `${w}x${h}` };
      }
    }

    switch (aspectRatio) {
      case "16:9":
        return { width: 1280, height: 720, size: "1280x720" };
      case "9:16":
        return { width: 720, height: 1280, size: "720x1280" };
      case "4:3":
        return { width: 1024, height: 768, size: "1024x768" };
      case "3:4":
        return { width: 768, height: 1024, size: "768x1024" };
      case "21:9":
        return { width: 1344, height: 576, size: "1344x576" };
      case "1:1":
      default:
        return { width: 1024, height: 1024, size: "1024x1024" };
    }
  }

  /**
   * Consulta o catálogo dinâmico de modelos da Pollinations.
   */
  async listModels(apiKey?: string, baseUrl?: string): Promise<ImageModelDefinition[]> {
    const url = `${baseUrl || this.defaultBaseUrl}/image/models`;
    const headers: Record<string, string> = {
      "Accept": "application/json",
    };

    if (apiKey && apiKey.trim().length > 0) {
      headers["Authorization"] = `Bearer ${apiKey.trim()}`;
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);

    try {
      let response = await fetch(url, {
        method: "GET",
        headers,
        signal: controller.signal,
      });

      // Fallback para endpoint alternativo /models se /image/models retornar 404
      if (response.status === 404) {
        const altUrl = `${baseUrl || this.defaultBaseUrl}/models`;
        response = await fetch(altUrl, {
          method: "GET",
          headers,
          signal: controller.signal,
        });
      }

      if (!response.ok) {
        const errorText = await response.text().catch(() => "");
        this.handleHttpErrors(response.status, errorText, "listModels");
      }

      const data = await response.json();
      return this.normalizeModelsData(data);
    } catch (error: any) {
      if (error instanceof ImageGenerationError) {
        throw error;
      }
      if (error.name === "AbortError") {
        throw new ImageGenerationError("Tempo limite ao consultar modelos da Pollinations.", "TIMEOUT", 504, true);
      }
      throw new ImageGenerationError(
        `Falha ao conectar com o catálogo de modelos da Pollinations: ${error.message}`,
        "CATALOG_UNREACHABLE",
        503,
        true
      );
    } finally {
      clearTimeout(timeout);
    }
  }

  /**
   * Testa a conectividade e autenticação com a Pollinations sem gerar imagem nem gastar créditos.
   */
  async testConnection(apiKey: string, baseUrl?: string): Promise<ImageConnectionTestResult> {
    if (!apiKey || apiKey.trim().length === 0) {
      return {
        success: false,
        status: "UNCONFIGURED",
        message: "API Key da Pollinations não configurada.",
      };
    }

    try {
      const models = await this.listModels(apiKey, baseUrl);
      const eligibleModels = models.filter((m) => m.isAvailable).map((m) => m.modelId);

      if (eligibleModels.length === 0) {
        return {
          success: false,
          status: "ERROR",
          message: "Conexão estabelecida, mas nenhum modelo de imagem elegível foi encontrado.",
          modelsCount: 0,
        };
      }

      return {
        success: true,
        status: "CONNECTED",
        message: `Conexão validada com sucesso! ${eligibleModels.length} modelos disponíveis na Pollinations.`,
        modelsCount: eligibleModels.length,
        eligibleModels,
      };
    } catch (error: any) {
      if (error instanceof ImageGenerationError) {
        if (error.code === "INVALID_API_KEY") {
          return {
            success: false,
            status: "INVALID_KEY",
            message: "A API Key fornecida é inválida ou não autorizada pela Pollinations.",
            rawError: error.message,
          };
        }
        if (error.code === "INSUFFICIENT_PROVIDER_BALANCE") {
          return {
            success: false,
            status: "INSUFFICIENT_BALANCE",
            message: "Saldo ou orçamento insuficiente na conta da Pollinations.",
            rawError: error.message,
          };
        }
        if (error.code === "TIMEOUT" || error.code === "PROVIDER_UNAVAILABLE") {
          return {
            success: false,
            status: "UNREACHABLE",
            message: "Serviço da Pollinations indisponível ou inacessível no momento.",
            rawError: error.message,
          };
        }
      }

      return {
        success: false,
        status: "ERROR",
        message: `Erro ao testar conexão: ${error?.message || "Falha de comunicação"}`,
        rawError: error?.message,
      };
    }
  }

  /**
   * Resolve aliases legados e adapta prompts para modelos suportados oficialmente na Pollinations.
   */
  private resolveEffectiveModel(requestedModel?: string, rawPrompt = ""): { model: string; prompt: string } {
    const raw = (requestedModel || "flux").trim();
    const lower = raw.toLowerCase();

    if (lower === "flux-realism") {
      return {
        model: "flux",
        prompt: `${rawPrompt}, photorealistic, ultra-detailed skin texture, realistic natural lighting, cinematic composition`,
      };
    }

    if (lower === "flux-anime") {
      return {
        model: "flux",
        prompt: `${rawPrompt}, anime aesthetic, stylized digital art, clean linework, vibrant animation style`,
      };
    }

    if (lower === "turbo" || lower === "sdxl-turbo") {
      return {
        model: "tongyi-mai/z-image-turbo",
        prompt: rawPrompt,
      };
    }

    return { model: raw, prompt: rawPrompt };
  }

  /**
   * Executa a geração de imagem via Pollinations API.
   * Prioriza o endpoint OpenAI POST /v1/images/generations com fallback seguro.
   */
  async generateImage(
    options: ImageGenerationOptions,
    apiKey: string,
    baseUrl?: string
  ): Promise<ImageGenerationResult> {
    const { prompt: rawPrompt, model: rawModel, aspectRatio, resolution, negativePrompt, referenceImageUrl, seed } = options;

    if (!rawPrompt || rawPrompt.trim().length === 0) {
      throw new ImageGenerationError("O prompt textual é obrigatório para geração da imagem.", "INVALID_PROMPT", 400);
    }

    if (!apiKey || apiKey.trim().length === 0) {
      throw new ImageGenerationError("API Key da Pollinations não está configurada no backend.", "UNCONFIGURED_KEY", 500);
    }

    const { model: effectiveModel, prompt: effectivePrompt } = this.resolveEffectiveModel(rawModel, rawPrompt);

    const startTime = Date.now();
    const effectiveBaseUrl = baseUrl || this.defaultBaseUrl;
    const { width, height, size } = this.resolveDimensions(aspectRatio, resolution);

    // Preparar payload compatível OpenAI
    const payload: Record<string, any> = {
      model: effectiveModel || "flux",
      prompt: effectivePrompt.trim(),
      n: 1,
      size,
      response_format: options.responseFormat || "b64_json",
    };

    if (seed !== undefined && seed !== null) {
      payload.seed = seed;
    }
    if (negativePrompt) {
      payload.negative_prompt = negativePrompt.trim();
    }
    if (referenceImageUrl) {
      payload.image = referenceImageUrl;
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 90000); // 90s timeout

    try {
      const endpoint = `${effectiveBaseUrl}/v1/images/generations`;
      let response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey.trim()}`,
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      // Se a Pollinations rejeitar o modelo como inválido (HTTP 400), tentar fallback imediato para "flux"
      if (!response.ok && response.status === 400) {
        const errorPeek = await response.clone().text().catch(() => "");
        if (errorPeek.includes("Invalid model or alias") && payload.model !== "flux") {
          console.warn(
            `[PollinationsImageProvider] Modelo "${payload.model}" não aceito pela Pollinations. Acionando fallback automático transparente para "flux"...`
          );
          payload.model = "flux";
          response = await fetch(endpoint, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${apiKey.trim()}`,
            },
            body: JSON.stringify(payload),
            signal: controller.signal,
          });
        }
      }

      const durationMs = Date.now() - startTime;

      // Extração de custos externos se disponibilizados em headers
      const externalCostHeader = response.headers.get("x-pollen-cost") || response.headers.get("x-credit-cost");
      const externalCost = externalCostHeader ? parseFloat(externalCostHeader) : undefined;
      const externalCostUnit = externalCost ? "pollen" : undefined;

      if (!response.ok) {
        const errorText = await response.text().catch(() => "");
        this.handleHttpErrors(response.status, errorText, "generateImage");
      }

      const json = await response.json();

      if (!json || !Array.isArray(json.data) || json.data.length === 0) {
        throw new ImageGenerationError("A API da Pollinations retornou uma resposta sem dados de imagem válidos.", "EMPTY_RESPONSE", 502);
      }

      const item = json.data[0];
      const revisedPrompt = item.revised_prompt || undefined;

      if (item.b64_json) {
        const b64Data = item.b64_json.startsWith("data:") ? item.b64_json : `data:image/jpeg;base64,${item.b64_json}`;
        return {
          imageUrl: b64Data,
          b64Json: item.b64_json,
          model: rawModel || payload.model || "flux",
          prompt: rawPrompt,
          revisedPrompt,
          durationMs,
          externalCost,
          externalCostUnit,
          width,
          height,
          seed,
        };
      }

      if (item.url) {
        return {
          imageUrl: item.url,
          model: rawModel || payload.model || "flux",
          prompt: rawPrompt,
          revisedPrompt,
          durationMs,
          externalCost,
          externalCostUnit,
          width,
          height,
          seed,
        };
      }

      throw new ImageGenerationError("Formato de imagem desconhecido retornado pela Pollinations.", "INVALID_IMAGE_PAYLOAD", 502);
    } catch (error: any) {
      if (error instanceof ImageGenerationError) {
        throw error;
      }
      if (error.name === "AbortError") {
        throw new ImageGenerationError(
          "A requisição de geração de imagem excedeu o tempo limite da Pollinations (timeout).",
          "TIMEOUT",
          504,
          true
        );
      }
      throw new ImageGenerationError(
        `Falha na comunicação com a Pollinations: ${error?.message || "Erro desconhecido"}`,
        "PROVIDER_COMMUNICATION_ERROR",
        502,
        true
      );
    } finally {
      clearTimeout(timeout);
    }
  }

  /**
   * Converte retornos variados de APIs de modelos em ImageModelDefinition[] normalizados.
   */
  private normalizeModelsData(data: any): ImageModelDefinition[] {
    const list: ImageModelDefinition[] = [];

    // Se vier como array simples de strings ["flux", "turbo", ...]
    if (Array.isArray(data)) {
      data.forEach((item, index) => {
        if (typeof item === "string") {
          list.push({
            modelId: item,
            name: this.formatModelName(item),
            publisher: "Pollinations.ai",
            description: this.getDefaultDescription(item),
            capabilities: ["TEXT_TO_IMAGE"],
            supportedSizes: ["1024x1024", "1280x720", "720x1280"],
            supportsReferenceImage: item.toLowerCase().includes("flux"),
            supportsImageEditing: false,
            isAvailable: true,
            isEnabled: true,
            isDefault: item === "flux" || index === 0,
            displayOrder: index,
          });
        } else if (typeof item === "object" && item !== null) {
          const modelId = item.id || item.name || item.model || `model-${index}`;
          const publisher = item.publisher || item.provider || this.extractPublisher(modelId);
          const name = (item.title && typeof item.title === "string" && item.title.trim().length > 0)
            ? item.title.trim()
            : this.cleanModelName(item.name, modelId, item.description);
          const description = item.description || item.details || this.getDefaultDescription(modelId);

          list.push({
            modelId,
            name,
            publisher,
            description,
            capabilities: Array.isArray(item.capabilities) ? item.capabilities : ["TEXT_TO_IMAGE"],
            supportedSizes: Array.isArray(item.sizes) ? item.sizes : ["1024x1024", "1280x720", "720x1280"],
            supportsReferenceImage: Boolean(item.supportsReferenceImage ?? modelId.includes("flux")),
            supportsImageEditing: Boolean(item.supportsImageEditing),
            pricingInfo: item.pricing || item.costs || {},
            isAvailable: item.available !== false,
            isEnabled: true,
            isDefault: item.isDefault || modelId === "flux" || modelId.includes("flux-1-image"),
            displayOrder: index,
          });
        }
      });
    } else if (typeof data === "object" && data !== null) {
      const modelsArray = data.models || data.data || [];
      if (Array.isArray(modelsArray)) {
        return this.normalizeModelsData(modelsArray);
      }
    }

    // Se o catálogo retornado estiver vazio, prover modelos oficiais mínimos padrão da Pollinations
    if (list.length === 0) {
      return this.getFallbackModels();
    }

    return list;
  }

  /**
   * Catálogo de fallback oficial caso o endpoint remoto esteja inacessível no momento.
   * Contém exclusivamente modelos oficiais reais e aceitos pela API da Pollinations.
   */
  getFallbackModels(): ImageModelDefinition[] {
    return [
      {
        modelId: "flux",
        name: "FLUX.1 Schnell (Recomendado)",
        publisher: "Black Forest Labs",
        description: "Modelo cinematográfico principal de alta fidelidade e aderência detalhada ao prompt.",
        capabilities: ["TEXT_TO_IMAGE", "REFERENCE_IMAGE"],
        supportedSizes: ["1024x1024", "1280x720", "720x1280", "1344x576", "1024x768"],
        supportsReferenceImage: true,
        supportsImageEditing: false,
        pricingInfo: { costPerImage: "1 pollen" },
        isAvailable: true,
        isEnabled: true,
        isDefault: true,
        defaultCreditCost: 10,
        displayOrder: 1,
      },
      {
        modelId: "black-forest-labs/flux.1.1-pro",
        name: "FLUX 1.1 Pro",
        publisher: "Black Forest Labs",
        description: "Qualidade profissional máxima, iluminação volumétrica e fidelidade fotográfica cinematográfica.",
        capabilities: ["TEXT_TO_IMAGE", "REFERENCE_IMAGE"],
        supportedSizes: ["1024x1024", "1280x720", "720x1280"],
        supportsReferenceImage: true,
        supportsImageEditing: false,
        pricingInfo: { costPerImage: "4 pollen" },
        isAvailable: true,
        isEnabled: true,
        isDefault: false,
        defaultCreditCost: 12,
        displayOrder: 2,
      },
      {
        modelId: "tongyi-mai/z-image-turbo",
        name: "Z-Image Turbo",
        publisher: "Alibaba",
        description: "Geração ultrarrápida e econômica com imagens nítidas e renderização rápida.",
        capabilities: ["TEXT_TO_IMAGE"],
        supportedSizes: ["1024x1024", "1280x720", "720x1280"],
        supportsReferenceImage: false,
        supportsImageEditing: false,
        pricingInfo: { costPerImage: "0.004 pollen" },
        isAvailable: true,
        isEnabled: true,
        isDefault: false,
        defaultCreditCost: 5,
        displayOrder: 3,
      },
      {
        modelId: "bytedance/seedream-5.0-flash",
        name: "Seedream 5.0 Flash",
        publisher: "ByteDance",
        description: "Geração de imagem de alta velocidade em 1K ou 2K com composição balanceada.",
        capabilities: ["TEXT_TO_IMAGE", "REFERENCE_IMAGE"],
        supportedSizes: ["1024x1024", "1280x720", "720x1280"],
        supportsReferenceImage: true,
        supportsImageEditing: false,
        pricingInfo: { costPerImage: "0.03 pollen" },
        isAvailable: true,
        isEnabled: true,
        isDefault: false,
        defaultCreditCost: 8,
        displayOrder: 4,
      },
      {
        modelId: "recraft/recraft-v4.1-flash",
        name: "Recraft v4.1 Flash",
        publisher: "Recraft",
        description: "Estilos visuais flexíveis com geração rápida e refinamento estético.",
        capabilities: ["TEXT_TO_IMAGE"],
        supportedSizes: ["1024x1024", "1280x720", "720x1280"],
        supportsReferenceImage: false,
        supportsImageEditing: false,
        pricingInfo: { costPerImage: "0.02 pollen" },
        isAvailable: true,
        isEnabled: true,
        isDefault: false,
        defaultCreditCost: 7,
        displayOrder: 5,
      },
    ];
  }

  private extractPublisher(modelId: string): string {
    if (modelId.includes("/")) {
      const parts = modelId.split("/");
      return this.formatModelName(parts[0]);
    }
    return "Pollinations.ai";
  }

  private cleanModelName(rawName?: string, modelId = "", description = ""): string {
    // Se vier um nome válido e não for uma frase longa de descrição nem o próprio ID com barras
    if (
      rawName &&
      rawName.trim().length > 0 &&
      rawName !== description &&
      rawName !== modelId &&
      !rawName.includes("/") &&
      rawName.length <= 40
    ) {
      return rawName.trim();
    }

    // Se o modelId tiver barra (ex: black-forest-labs/flux-1-image)
    const baseId = modelId.includes("/") ? modelId.split("/")[1] : modelId;
    return this.formatModelName(baseId);
  }

  private formatModelName(modelId: string): string {
    return modelId
      .split(/[-_]/)
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ");
  }

  private getDefaultDescription(modelId: string): string {
    const id = modelId.toLowerCase();
    if (id.includes("flux")) return "Modelo de geração cinematográfica com alta precisão fotográfica.";
    if (id.includes("turbo")) return "Geração rápida para pré-visualizações ágeis.";
    if (id.includes("anime")) return "Estilização visual artística e animação.";
    return "Modelo de geração de imagem compatível com Pollinations.ai.";
  }

  private handleHttpErrors(status: number, errorText: string, context: string): never {
    if (status === 401 || status === 403) {
      throw new ImageGenerationError(
        "A chave de API da Pollinations é inválida, expirou ou não possui autorização.",
        "INVALID_API_KEY",
        401
      );
    }
    if (status === 402) {
      throw new ImageGenerationError(
        "Saldo ou orçamento insuficiente na conta da Pollinations para processar a requisição.",
        "INSUFFICIENT_PROVIDER_BALANCE",
        402
      );
    }
    if (status === 429) {
      throw new ImageGenerationError(
        "Limite de requisições excedido na Pollinations (Rate Limit). Tente novamente em instantes.",
        "RATE_LIMIT_EXCEEDED",
        429,
        true
      );
    }
    if (status >= 500) {
      throw new ImageGenerationError(
        `O provedor Pollinations.ai está temporariamente indisponível (HTTP ${status}).`,
        "PROVIDER_UNAVAILABLE",
        503,
        true
      );
    }
    throw new ImageGenerationError(
      `Erro na comunicação com a Pollinations (${status}): ${errorText || "Sem detalhes"}`,
      "PROVIDER_ERROR",
      status
    );
  }
}

