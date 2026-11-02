import {
  VideoGenerationOptions,
  VideoGenerationResult,
  VideoModelDefinition,
  VideoGenerationError,
} from "./video-generation.types";

export class PollinationsVideoProvider {
  readonly id = "pollinations";
  readonly name = "Pollinations.ai Video";
  readonly defaultBaseUrl = "https://gen.pollinations.ai";

  /**
   * Catálogo de modelos oficiais de vídeo da Pollinations.
   */
  async listModels(apiKey?: string, baseUrl?: string): Promise<VideoModelDefinition[]> {
    const rootUrl = baseUrl || this.defaultBaseUrl;
    const headers: Record<string, string> = {
      Accept: "application/json",
    };

    if (apiKey && apiKey.trim().length > 0) {
      headers["Authorization"] = `Bearer ${apiKey.trim()}`;
    }

    try {
      let rawModels: any[] = [];

      // 1. Tenta endpoint moderno com filtro por categoria de vídeo
      try {
        const response = await fetch(`${rootUrl}/models?category=video`, {
          method: "GET",
          headers,
          signal: AbortSignal.timeout(12000),
        });

        if (response.ok) {
          const data = await response.json();
          if (Array.isArray(data) && data.length > 0) {
            rawModels = data;
          }
        }
      } catch {
        // Prossegue para o próximo método de descoberta
      }

      // 2. Se vazio, consulta /models geral e filtra por categoria ou suporte a vídeo
      if (rawModels.length === 0) {
        try {
          const generalRes = await fetch(`${rootUrl}/models`, {
            method: "GET",
            headers,
            signal: AbortSignal.timeout(12000),
          });
          if (generalRes.ok) {
            const data = await generalRes.json();
            if (Array.isArray(data)) {
              rawModels = data.filter(
                (m: any) =>
                  m.category === "video" ||
                  (m.output_modalities && m.output_modalities.includes("video")) ||
                  Boolean(m.pricing?.completionVideoSeconds)
              );
            }
          }
        } catch {
          // Prossegue
        }
      }

      // 3. Se ainda vazio, tenta /video/models legado
      if (rawModels.length === 0) {
        try {
          const legacyRes = await fetch(`${rootUrl}/video/models`, {
            method: "GET",
            headers,
            signal: AbortSignal.timeout(8000),
          });
          if (legacyRes.ok) {
            const data = await legacyRes.json();
            if (Array.isArray(data) && data.length > 0) {
              rawModels = data;
            }
          }
        } catch {
          // Prossegue
        }
      }

      // 4. Se nenhum modelo remoto foi retornado, usa os modelos de fallback certificados
      if (rawModels.length === 0) {
        return this.getFallbackModels();
      }

      return rawModels.map((item: any, index: number) => {
        const modelId = item.name || item.id || `video-${index}`;
        const publisher = item.publisher || "Pollinations";
        const title = item.title || item.name;

        // Custo em créditos proporcional ao custo em pollen
        const pollenPerSec = item.pricing?.completionVideoSeconds
          ? parseFloat(item.pricing.completionVideoSeconds)
          : 0.05;
        const creditCost = Math.max(15, Math.round(pollenPerSec * 400));

        return {
          modelId,
          name: title,
          publisher,
          description: item.description || `Modelo de geração de vídeo cinemático (${publisher}).`,
          creditCost,
          isDefault: modelId.includes("seedance-2.0-fast") || modelId.includes("veo-3.1-fast"),
          isEnabled: true,
          isAvailable: true,
          supportedDurations: [4, 5, 8, 10],
          supportedAspectRatios: ["16:9", "9:16", "1:1"],
          pricing: item.pricing,
        };
      });
    } catch {
      return this.getFallbackModels();
    }
  }

  /**
   * Modelos essenciais de fallback caso a listagem remota falhe.
   */
  getFallbackModels(): VideoModelDefinition[] {
    return [
      {
        modelId: "bytedance/seedance-2.0-fast",
        name: "ByteDance Seedance 2.0 Fast",
        publisher: "ByteDance",
        description: "Geração rápida de vídeo com áudio integrado, movimentos fluidos e alta resolução.",
        creditCost: 25,
        isDefault: true,
        isEnabled: true,
        isAvailable: true,
        supportedDurations: [4, 5, 8],
        supportedAspectRatios: ["16:9", "9:16", "1:1"],
      },
      {
        modelId: "google/veo-3.1-fast",
        name: "Google Veo 3.1 Fast",
        publisher: "Google",
        description: "Qualidade cinematográfica de alta fidelidade visual, iluminação realista e suporte a áudio.",
        creditCost: 35,
        isDefault: false,
        isEnabled: true,
        isAvailable: true,
        supportedDurations: [4, 6, 8],
        supportedAspectRatios: ["16:9", "9:16"],
      },
      {
        modelId: "alibaba/wan-2.2-fast",
        name: "Alibaba Wan 2.2 Fast",
        publisher: "Alibaba",
        description: "Geração econômica com movimentos cinematográficos estáveis e áudio integrado.",
        creditCost: 20,
        isDefault: false,
        isEnabled: true,
        isAvailable: true,
        supportedDurations: [4, 5],
        supportedAspectRatios: ["16:9", "9:16"],
      },
      {
        modelId: "kwaivgi/kling-v3.0-std",
        name: "Kling v3.0 Standard",
        publisher: "Kuaishou",
        description: "Consistência física de ponta com movimentos realistas de câmera e personagens.",
        creditCost: 35,
        isDefault: false,
        isEnabled: true,
        isAvailable: true,
        supportedDurations: [5, 10],
        supportedAspectRatios: ["16:9", "9:16", "1:1"],
      },
      {
        modelId: "x-ai/grok-imagine-video-1.5-lite",
        name: "Grok Imagine Video 1.5 Lite",
        publisher: "xAI",
        description: "Modelo ágil e versátil de vídeo da xAI para animação rápida e cinematográfica.",
        creditCost: 25,
        isDefault: false,
        isEnabled: true,
        isAvailable: true,
        supportedDurations: [4, 6],
        supportedAspectRatios: ["16:9", "9:16", "1:1"],
      },
    ];
  }

  /**
   * Executa a geração direta de vídeo via Pollinations.
   */
  async generateVideo(
    options: VideoGenerationOptions,
    apiKey: string,
    baseUrl?: string
  ): Promise<VideoGenerationResult & { buffer?: Buffer }> {
    const { prompt, model, durationSeconds = 5, aspectRatio = "16:9", resolution, audio = true, startFrameUrl, seed } = options;

    if (!prompt || prompt.trim().length === 0) {
      throw new VideoGenerationError("O prompt do vídeo é obrigatório.", "INVALID_PROMPT", 400);
    }

    if (!apiKey || apiKey.trim().length === 0) {
      throw new VideoGenerationError("API Key da Pollinations não configurada.", "UNCONFIGURED_KEY", 500);
    }

    const effectiveBaseUrl = baseUrl || this.defaultBaseUrl;
    const effectiveModel = model || "bytedance/seedance-2.0-fast";

    const startTime = Date.now();
    const queryParams = new URLSearchParams();
    queryParams.set("model", effectiveModel);
    queryParams.set("duration", String(durationSeconds));
    queryParams.set("aspectRatio", aspectRatio);
    queryParams.set("audio", String(audio));

    if (resolution) {
      queryParams.set("resolution", resolution);
    }
    if (seed !== undefined && seed !== null) {
      queryParams.set("seed", String(seed));
    }
    if (startFrameUrl && startFrameUrl.startsWith("http")) {
      queryParams.set("image", startFrameUrl);
    }

    const cleanPrompt = prompt.trim();
    const endpoint = `${effectiveBaseUrl}/video/${encodeURIComponent(cleanPrompt)}?${queryParams.toString()}`;

    try {
      const response = await fetch(endpoint, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${apiKey.trim()}`,
        },
        // Vídeos podem levar até 180 segundos para renderizar completamente
        signal: AbortSignal.timeout(180000),
      });

      const durationMs = Date.now() - startTime;

      if (!response.ok) {
        const errorText = await response.text().catch(() => "");
        let jsonError: any = {};
        try {
          jsonError = JSON.parse(errorText);
        } catch {
          // não é JSON
        }

        const msg = jsonError?.error?.message || errorText || `Erro HTTP ${response.status} na geração do vídeo.`;

        if (response.status === 402) {
          throw new VideoGenerationError(
            "Saldo de Pollen insuficiente na conta da Pollinations para gerar este vídeo.",
            "INSUFFICIENT_POLLEN",
            402
          );
        }

        if (response.status === 401) {
          throw new VideoGenerationError(
            "A API Key da Pollinations é inválida ou expirou.",
            "INVALID_API_KEY",
            401
          );
        }

        throw new VideoGenerationError(
          `Falha na Pollinations (${response.status}): ${msg}`,
          "GENERATION_FAILED",
          response.status
        );
      }

      // Extração de custos externos
      const costHeader = response.headers.get("x-pollen-cost") || response.headers.get("x-credit-cost");
      const externalCost = costHeader ? parseFloat(costHeader) : undefined;

      // Link persistente retornado pela Pollinations no header Link
      const linkHeader = response.headers.get("link") || "";
      let mediaEnclosureUrl = "";
      const match = linkHeader.match(/<([^>]+)>;\s*rel="enclosure"/);
      if (match) {
        mediaEnclosureUrl = match[1];
      }

      // Lê o stream de vídeo MP4 retornado
      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      return {
        videoUrl: mediaEnclosureUrl || "",
        durationSeconds,
        model: effectiveModel,
        prompt: cleanPrompt,
        externalCost,
        externalCostUnit: "pollen",
        durationMs,
        seed,
        buffer,
      };
    } catch (error: any) {
      if (error instanceof VideoGenerationError) {
        throw error;
      }
      if (error.name === "TimeoutError" || error.name === "AbortError") {
        throw new VideoGenerationError(
          "A geração do vídeo excedeu o tempo limite da Pollinations (180s). Tente um modelo mais rápido ou duração menor.",
          "TIMEOUT",
          504,
          true
        );
      }
      throw new VideoGenerationError(
        `Erro de conexão ao gerar vídeo: ${error?.message || "Falha desconhecida"}`,
        "CONNECTION_ERROR",
        502,
        true
      );
    }
  }
}

