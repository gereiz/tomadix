import fs from "fs";
import path from "path";
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
        "1344x768",
        "768x1344",
        "1024x768",
        "768x1024",
        "1344x576",
        "576x1344",
      ],
    };
  }

  /**
   * Garante que uma dimensão seja estritamente múltiplo de 32 (exigência do FLUX e SDXL).
   */
  private alignTo32(val: number): number {
    return Math.max(32, Math.round(val / 32) * 32);
  }

  /**
   * Converte proporção e resolução em width e height numéricos em múltiplos estritos de 32.
   */
  private resolveDimensions(aspectRatio?: ImageAspectRatio, resolution?: string): { width: number; height: number; size: string } {
    if (resolution && resolution.includes("x")) {
      const [rawW, rawH] = resolution.split("x").map(Number);
      if (!isNaN(rawW) && !isNaN(rawH) && rawW > 0 && rawH > 0) {
        const w = this.alignTo32(rawW);
        const h = this.alignTo32(rawH);
        return { width: w, height: h, size: `${w}x${h}` };
      }
    }

    switch (aspectRatio) {
      case "16:9":
        // 1344 e 768 são múltiplos exatos de 32 (1344/32=42, 768/32=24), proporção widescreen cinema 1.75
        return { width: 1344, height: 768, size: "1344x768" };
      case "9:16":
        // 768 e 1344 são múltiplos exatos de 32 (768/32=24, 1344/32=42)
        return { width: 768, height: 1344, size: "768x1344" };
      case "4:3":
        // 1024 e 768 são múltiplos exatos de 32 (1024/32=32, 768/32=24)
        return { width: 1024, height: 768, size: "1024x768" };
      case "3:4":
        // 768 e 1024 são múltiplos exatos de 32 (768/32=24, 1024/32=32)
        return { width: 768, height: 1024, size: "768x1024" };
      case "21:9":
        // 1344 e 576 são múltiplos exatos de 32 (1344/32=42, 576/32=18)
        return { width: 1344, height: 576, size: "1344x576" };
      case "1:1":
      default:
        // 1024 e 1024 são múltiplos exatos de 32 (1024/32=32)
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
    const rawDim = this.resolveDimensions(aspectRatio, resolution);
    const finalWidth = this.alignTo32(rawDim.width);
    const finalHeight = this.alignTo32(rawDim.height);
    const finalSize = `${finalWidth}x${finalHeight}`;

    // Preparar payload compatível OpenAI com dimensões em múltiplos estritos de 32
    const payload: Record<string, any> = {
      model: effectiveModel || "flux",
      prompt: effectivePrompt.trim(),
      n: 1,
      size: finalSize,
      width: finalWidth,
      height: finalHeight,
      response_format: options.responseFormat || "b64_json",
    };

    if (seed !== undefined && seed !== null) {
      payload.seed = seed;
    }
    if (negativePrompt) {
      payload.negative_prompt = negativePrompt.trim();
    }
    if (referenceImageUrl) {
      payload.image = await this.resolveImageReference(referenceImageUrl);
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

      // Se a Pollinations rejeitar com HTTP 400, verificar motivos recuperáveis
      if (!response.ok && response.status === 400) {
        const errorPeek = await response.clone().text().catch(() => "");
        let retryNeeded = false;

        // Caso 1: Dimensões não aceitas como múltiplos de 32 pelo modelo (ex: FLUX 1.1 Pro)
        if (errorPeek.includes("multiples of 32") || errorPeek.includes("multiple of 32")) {
          console.warn("[PollinationsImageProvider] Dimensões ajustadas para múltiplos estritos de 32 (1024x1024 / 1344x768)...");
          payload.width = 1024;
          payload.height = 1024;
          payload.size = "1024x1024";
          retryNeeded = true;
        }

        // Caso 2: Modelo rejeitado pela rota
        if (errorPeek.includes("Invalid model or alias") && payload.model !== "flux") {
          console.warn(
            `[PollinationsImageProvider] Modelo "${payload.model}" não aceito pela Pollinations. Acionando fallback automático para "flux"...`
          );
          payload.model = "flux";
          retryNeeded = true;
        }

        if (retryNeeded) {
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
          width: finalWidth,
          height: finalHeight,
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
          width: finalWidth,
          height: finalHeight,
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
   * Converte caminhos locais ou URLs relativas em Base64 Data URI antes de enviar para a Pollinations API.
   */
  private async resolveImageReference(ref: string): Promise<string> {
    if (!ref || ref.trim().length === 0) return "";
    const trimmed = ref.trim();

    // Se já for data-uri
    if (trimmed.startsWith("data:image/")) {
      return trimmed;
    }

    // Se for URL HTTP/HTTPS externa real (não localhost)
    if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
      if (!trimmed.includes("localhost") && !trimmed.includes("127.0.0.1")) {
        return trimmed;
      }
    }

    // Se for caminho relativo ou arquivo servido localmente (/generated-images/... ou /uploads/...)
    try {
      const cleanPath = trimmed.replace(/^\/+/, "");
      const relativeSegments = cleanPath.split("/").filter((s) => s !== ".." && s !== ".");

      const candidateDirs = [
        process.env.STORAGE_DIR?.trim() || "",
        path.join(process.cwd(), "public"),
        path.join(process.cwd(), "uploads"),
        process.cwd(),
      ].filter(Boolean);

      for (const dir of candidateDirs) {
        const fullCandidate = path.join(dir, ...relativeSegments);
        if (fs.existsSync(fullCandidate) && fs.statSync(fullCandidate).isFile()) {
          const buffer = fs.readFileSync(fullCandidate);
          const ext = path.extname(fullCandidate).toLowerCase().replace(".", "") || "jpeg";
          const mime = ext === "png" ? "image/png" : ext === "webp" ? "image/webp" : "image/jpeg";
          return `data:${mime};base64,${buffer.toString("base64")}`;
        }
      }
    } catch (err) {
      console.warn("[PollinationsImageProvider] Falha ao resolver referência local de imagem:", err);
    }

    return trimmed;
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
            supportedSizes: ["1024x1024", "1344x768", "768x1344", "1024x768", "1344x576"],
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

          const hasImageInput = Array.isArray(item.input_modalities) && item.input_modalities.includes("image");
          const hasMaxRef = typeof item.max_reference_images === "number" && item.max_reference_images > 0;
          const hasEditEndpoint = Array.isArray(item.supported_endpoints) && item.supported_endpoints.some((e: string) => e.includes("/edits"));
          const supportsReferenceImage = Boolean(
            item.supportsReferenceImage ||
            hasImageInput ||
            hasMaxRef ||
            hasEditEndpoint ||
            modelId.toLowerCase().includes("image") ||
            modelId.toLowerCase().includes("flux")
          );

          const supportsImageEditing = Boolean(item.supportsImageEditing || hasEditEndpoint);

          const rawTokens = item.pricing?.completionImageTokens || item.pricing?.promptImageTokens;
          const tokenNum = rawTokens ? parseFloat(rawTokens) : 0;
          const hasTokenCost = tokenNum > 0;

          const modelIdLower = modelId.toLowerCase();
          const isExplicitPaidLine =
            modelIdLower.includes("flux.2") ||
            modelIdLower.includes("flux-2") ||
            modelIdLower.includes("flux.3") ||
            modelIdLower.includes("flux-3") ||
            modelIdLower.includes("flux.1.1") ||
            modelIdLower.includes("flux-1.1") ||
            (modelIdLower.includes("pro") && !modelIdLower.includes("schnell")) ||
            (modelIdLower.includes("max") && !modelIdLower.includes("schnell")) ||
            (modelIdLower.includes("flex") && !modelIdLower.includes("schnell"));

          const paidOnly = Boolean(item.paid_only || hasTokenCost || isExplicitPaidLine);
          const costPollen = hasTokenCost
            ? `${tokenNum} pollen`
            : (paidOnly ? "Pollen pago requerido" : "Gratuito (0 pollen)");

          const pricingInfo = {
            paidOnly,
            currency: item.pricing?.currency || "pollen",
            completionImageTokens: item.pricing?.completionImageTokens || null,
            promptImageTokens: item.pricing?.promptImageTokens || null,
            costPollen,
            costType: paidOnly ? "PAID" : "FREE",
            maxReferenceImages: item.max_reference_images || (hasImageInput ? 10 : 0),
            requiresReferenceImage: Boolean(hasImageInput && (!Array.isArray(item.input_modalities) || !item.input_modalities.includes("text"))),
            inputModalities: item.input_modalities || ["text"],
            rawPricing: item.pricing || {},
          };

          const isAvailable = item.available !== false;
          list.push({
            modelId,
            name,
            publisher,
            description,
            capabilities: Array.isArray(item.capabilities) ? item.capabilities : ["TEXT_TO_IMAGE"],
            supportedSizes: Array.isArray(item.sizes) ? item.sizes : ["1024x1024", "1344x768", "768x1344", "1024x768", "1344x576"],
            supportsReferenceImage,
            supportsImageEditing,
            pricingInfo,
            isAvailable,
            isEnabled: isAvailable,
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
        supportedSizes: ["1024x1024", "1344x768", "768x1344", "1344x576", "1024x768"],
        supportsReferenceImage: true,
        supportsImageEditing: false,
        pricingInfo: { paidOnly: false, costPollen: "Gratuito (0 pollen)", maxReferenceImages: 10 },
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
        supportedSizes: ["1024x1024", "1344x768", "768x1344", "1344x576", "1024x768"],
        supportsReferenceImage: true,
        supportsImageEditing: false,
        pricingInfo: { paidOnly: true, costPollen: "4 pollen", maxReferenceImages: 10 },
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
        supportedSizes: ["1024x1024", "1344x768", "768x1344", "1344x576", "1024x768"],
        supportsReferenceImage: false,
        supportsImageEditing: false,
        pricingInfo: { paidOnly: false, costPollen: "0.004 pollen (Free)", maxReferenceImages: 0 },
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
        supportedSizes: ["1024x1024", "1344x768", "768x1344", "1344x576", "1024x768"],
        supportsReferenceImage: true,
        supportsImageEditing: false,
        pricingInfo: { paidOnly: true, costPollen: "0.03 pollen", maxReferenceImages: 10 },
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
        supportedSizes: ["1024x1024", "1344x768", "768x1344", "1344x576", "1024x768"],
        supportsReferenceImage: false,
        supportsImageEditing: false,
        pricingInfo: { paidOnly: true, costPollen: "0.02 pollen", maxReferenceImages: 0 },
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
    const isDescriptiveSentence = (str: string) => {
      const lower = str.toLowerCase();
      return (
        str.length > 28 ||
        str.includes(",") ||
        lower.startsWith("instant,") ||
        lower.includes("budget friendly") ||
        lower.includes("flagship text-to-image") ||
        lower.includes("fast text to image") ||
        lower.includes("image generation and editing") ||
        lower.includes("editing at 1k")
      );
    };

    // Se vier um nome conciso válido que não seja uma sentença de marketing/descrição
    if (
      rawName &&
      rawName.trim().length > 0 &&
      rawName !== description &&
      rawName !== modelId &&
      !rawName.includes("/") &&
      !isDescriptiveSentence(rawName)
    ) {
      return rawName.trim();
    }

    // Se o modelId tiver barra (ex: black-forest-labs/flux-1-image ou tongyi-mai/z-image-turbo)
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
        "O modelo selecionado requer saldo de Pollen na conta da Pollinations (HTTP 402). Escolha um modelo gratuito (Pollen Free como o FLUX.1 Schnell) ou recarregue seu saldo de Pollen.",
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

