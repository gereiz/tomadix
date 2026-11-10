import { GoogleGenAI } from "@google/genai";
import { db } from "@/lib/db";
import fs from "fs";
import path from "path";
import crypto from "crypto";
import {
  CinematicAnalysisInput,
  CinematicAnalysisResult,
  TechnicalData,
  ReverseEngineeredPrompts,
  ContinuityReport,
} from "./cinematic-analysis.schema";
import {
  GeminiAuthError,
  GeminiTimeoutError,
} from "@/modules/ai/gemini-provider";
import { GeminiMultiProvider } from "@/modules/ai/gemini-multi-provider";
import { ParameterService } from "@/modules/parameters/parameter.service";

interface InlineDataPart {
  inlineData: {
    mimeType: string;
    data: string;
  };
}

function toSafeString(val: unknown, fallback: string = ""): string {
  if (val === null || val === undefined) return fallback;
  if (typeof val === "string") return val.trim() || fallback;
  if (typeof val === "number" || typeof val === "boolean") return String(val);
  if (Array.isArray(val)) {
    const joined = val.map((v) => toSafeString(v)).filter(Boolean).join(", ");
    return joined || fallback;
  }
  if (typeof val === "object") {
    const obj = val as Record<string, unknown>;
    const candidate =
      obj.value ??
      obj.label ??
      obj.name ??
      obj.scale ??
      obj.type ??
      obj.description ??
      obj.text ??
      obj.title ??
      obj.style;
    if (candidate !== undefined && candidate !== null) {
      return toSafeString(candidate, fallback);
    }
    try {
      const stringValues = Object.values(obj).filter((v) => typeof v === "string" || typeof v === "number");
      if (stringValues.length > 0) return String(stringValues[0]);
    } catch {
      // ignore
    }
  }
  return fallback;
}

// Minimal valid PNG buffer in base64 (10x10 pixel fallback for SVGs and mock paths)
const SAMPLE_CINEMATIC_PNG_BASE64 =
  "iVBORw0KGgoAAAANSUhEUgAAAAoAAAAKCAYAAACNMs+9AAAAFUlEQVR42mNk+M9Qz0AEYBxVGDUAAAnBAgGBV9JmAAAAAElFTkSuQmCC";

export class CinematicAnalysisService {
  /**
   * Converte uma imagem (dataURL, base64 ou caminho local em /public) para o formato inlineData do Gemini SDK.
   * O Gemini Vision API exige estritamente formatos raster (PNG, JPEG, WEBP) em base64.
   */
  private static resolveImagePart(imageSource: string): InlineDataPart {
    if (!imageSource || typeof imageSource !== "string") {
      throw new Error("Fonte de imagem inválida fornecida.");
    }

    // Caso 1: Data URL (ex: data:image/png;base64,iVBORw0KGgo...)
    if (imageSource.startsWith("data:")) {
      const match = imageSource.match(/^data:([^;]+);base64,(.+)$/);
      if (match) {
        return {
          inlineData: {
            mimeType: match[1] || "image/jpeg",
            data: match[2],
          },
        };
      }
    }

    // Caso 2: Caminho local no servidor (ex: /studio-references/neon-noir.jpg)
    if (imageSource.startsWith("/") || imageSource.includes("visual-references") || imageSource.includes("studio-references")) {
      const sanitized = imageSource.replace(/^\/+/, "");
      const fullPath = path.join(process.cwd(), "public", sanitized);
      if (fs.existsSync(fullPath)) {
        const ext = path.extname(fullPath).toLowerCase();
        if (ext === ".png" || ext === ".jpg" || ext === ".jpeg" || ext === ".webp") {
          const fileBuffer = fs.readFileSync(fullPath);
          const mimeType = ext === ".png" ? "image/png" : ext === ".webp" ? "image/webp" : "image/jpeg";
          return {
            inlineData: {
              mimeType,
              data: fileBuffer.toString("base64"),
            },
          };
        }
      }

      // Se for SVG ou arquivo não raster, fornece representação raster PNG válida para o Gemini
      return {
        inlineData: {
          mimeType: "image/png",
          data: SAMPLE_CINEMATIC_PNG_BASE64,
        },
      };
    }

    // Caso 3: String base64 pura (verificar se é base64 válido)
    const cleanBase64 = imageSource.replace(/\s/g, "");
    const isBase64 = /^[A-Za-z0-9+/=]+$/.test(cleanBase64) && cleanBase64.length > 20;
    if (isBase64) {
      return {
        inlineData: {
          mimeType: "image/jpeg",
          data: cleanBase64,
        },
      };
    }

    // Fallback seguro com PNG raster válido
    return {
      inlineData: {
        mimeType: "image/png",
        data: SAMPLE_CINEMATIC_PNG_BASE64,
      },
    };
  }

  /**
   * Executa a Análise Cinematográfica e Engenharia Reversa Multimodal com o Gemini API.
   */
  static async analyze(
    input: CinematicAnalysisInput,
    workspaceId: string
  ): Promise<CinematicAnalysisResult> {
    const analysisId = `analysis_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`;
    const selectedModel = "gemini-2.5-flash";

    // Resolução da imagem principal
    const primaryImagePart = this.resolveImagePart(input.image);
    const contentParts: any[] = [];

    // System instruction especializada em cinematografia
    const systemInstruction = `Você é um Diretor de Fotografia (DP), Colorista Sênior e Especialista em Engenharia Reversa de Prompts para Tomadix (uma plataforma SaaS cinematográfica).
Sua missão é analisar imagens cinematográficas e decompor meticulosamente todos os elementos de enquadramento, sensor, ótica de lentes, iluminação, paleta de cores e estilo visual, gerando prompts reversos de altíssima fidelidade para Midjourney v6, Flux 1.1 Pro, SDXL e geradores de vídeo.

Quando mais de uma imagem for enviada, trate a Imagem #1 como IMAGEM PRINCIPAL (base de todos os parâmetros) e extraia das imagens auxiliares EXCLUSIVAMENTE os parâmetros/aspectos indicados pelo usuário, fundindo tudo em uma única ficha técnica e conjunto de prompts coesos.

Responda ESTRITAMENTE em formato JSON compatível com a especificação solicitada. Nunca adicione blocos de texto ou markdown fora do JSON.`;

    let promptInstructions = "";
    const hasAuxImages = Boolean(input.auxiliaryImages && input.auxiliaryImages.length > 0);

    if (input.mode === "TECHNICAL_ANALYSIS") {
      promptInstructions = `Analise tecnicamente a(s) imagem(ns) fornecida(s) como um Diretor de Fotografia profissional.
Retorne um JSON com a seguinte estrutura:
{
  "technicalData": {
    "cameraSensor": "formato de sensor (ex: Full Frame 35mm, Anamórfico 65mm, Super 35, IMAX 70mm, 16mm Vintage)",
    "lensFocalLength": "distância focal estimada (ex: 28mm, 35mm, 50mm, 85mm anamórfica)",
    "aperture": "abertura estimada do diafragma (ex: f/1.4, f/2.0, f/4)",
    "framing": "enquadramento (ex: Close-Up, Plano Médio, Plano Geral, Plano Detalhe)",
    "cameraAngle": "ângulo de tomada (ex: Eye-level, Low-angle, High-angle, Dutch Angle)",
    "cameraMovement": "movimento de câmera recomendado para vídeo (ex: Handheld orgânico, Dolly In, Estático)",
    "lightingStyle": "estilo de iluminação dominante (ex: Chiaroscuro de alto contraste, Soft Daylight, Neon Noir, Golden Hour)",
    "lightingSetup": "decomposição de luzes (Key Light, Fill Light, Rim Light)",
    "colorTemperature": "temperatura de cor em Kelvin (ex: 3200K Tungstênio, 5600K Daylight, 6500K Fria)",
    "colorPalette": ["#HEX1", "#HEX2", "#HEX3", "#HEX4", "#HEX5"],
    "colorHarmony": "harmonia de cores (ex: Teal and Orange, Monocromático, Análogo)",
    "filmGrain": 25,
    "visualAesthetic": "estilo estético dominante da imagem",
    "aspectRatio": "16:9",
    "summaryDescription": "resumo cinematográfico detalhado em português brasileiro"
  },
  "prompts": {
    "midjourney": "prompt otimizado para Midjourney v6 com flags --ar 16:9 --style raw --v 6.1",
    "flux": "prompt descritivo natural para Flux 1.1 Pro",
    "sdxl": "prompt para SDXL com pesos e tags cinematográficas",
    "videoGenerators": "prompt para Kling / Runway com física e movimento",
    "negativePrompt": "prompt negativo anti-defeitos",
    "narrativeDescriptionPt": "descrição cênica em português para roteiro",
    "englishPrompt": "prompt cinematográfico em inglês clássico"
  }
}`;
    } else if (input.mode === "REVERSE_ENGINEERING") {
      promptInstructions = `Execute a engenharia reversa completa de prompt para a(s) imagem(ns) fornecida(s).
Decomponha o sujeito, iluminação, ótica, proporção e atmosfera em prompts prontos para os principais modelos de geração de imagem e vídeo do mercado (Midjourney, Flux, SDXL, Kling).
Retorne o JSON com as chaves "technicalData" e "prompts" preenchidas integralmente com riqueza de vocabulário cinematográfico.`;
    } else if (input.mode === "VISUAL_CONTINUITY" && (input.comparisonImage || hasAuxImages)) {
      if (input.comparisonImage && !hasAuxImages) {
        const comparisonImagePart = this.resolveImagePart(input.comparisonImage);
        contentParts.push(comparisonImagePart);
      }

      promptInstructions = `Compare a Imagem #1 (IMAGEM PRINCIPAL / Tomada de Referência) com as demais tomadas enviadas.
Avalie a continuidade visual e consistência de raccord cinematográfico entre elas:
1. Consistência de personagem / sujeito (rosto, proporção, roupas).
2. Continuidade de iluminação e direção das sombras (raccord luminotécnico).
3. Consistência do cenário e paleta de cores.
Retorne um JSON contendo "technicalData", "prompts" e "continuityReport" com as chaves:
- "score": número de 0 a 100 indicando consistência geral
- "characterConsistency": texto descritivo
- "lightingConsistency": texto descritivo
- "spatialConsistency": texto descritivo
- "discrepancies": lista de discrepâncias encontradas
- "alignmentRecommendations": lista de recomendações para alinhar as tomadas.`;
    } else {
      // STYLE_REPRODUCTION
      promptInstructions = `Analise a identidade visual e estilo estético da(s) imagem(ns) para reprodução de estilo em novas cenas.
Extraia parâmetros cinematográficos exatos para alimentar a 'Bíblia Visual' do Tomadix.
Retorne o JSON contendo "technicalData" e "prompts".`;
    }

    // Composição Multimodal com múltiplas imagens (Imagem Principal + Imagens Auxiliares com aspectos específicos)
    const auxImages = input.auxiliaryImages || [];
    if (auxImages.length > 0) {
      const overriddenAspects = new Set<string>();
      const auxDescriptions: string[] = [];

      auxImages.forEach((aux, idx) => {
        contentParts.push(this.resolveImagePart(aux.image));
        const imgNumber = idx + 2; // Imagem #1 é a principal
        const imgLabel = aux.label || `Imagem ${imgNumber}`;
        aux.aspects.forEach((a) => overriddenAspects.add(a));
        const aspectsText =
          aux.aspects.length > 0
            ? `extrair EXCLUSIVAMENTE os seguintes parâmetros/aspectos desta imagem: [${aux.aspects.join(", ")}]`
            : "usar como referência complementar";
        const customText = aux.customInstruction?.trim()
          ? ` (Diretiva específica do usuário para esta imagem: "${aux.customInstruction.trim()}")`
          : "";
        auxDescriptions.push(`- ${imgLabel} (Imagem #${imgNumber} anexada): ${aspectsText}${customText}.`);
      });

      const excludedFromPrimary =
        overriddenAspects.size > 0
          ? `, EXCETO [${Array.from(overriddenAspects).join(", ")}], que devem ser extraídos das imagens auxiliares correspondentes`
          : "";

      promptInstructions += `\n\nDIRETIVA DE COMPOSIÇÃO MULTIMODAL (${auxImages.length + 1} IMAGENS ENVIADAS):
Você recebeu ${auxImages.length + 1} imagens nesta análise:
- Imagem #1 (IMAGEM PRINCIPAL - "${input.referenceTitle || "Principal"}"): É a imagem principal da análise. Extraia TODOS os parâmetros base dela${excludedFromPrimary}.
${auxDescriptions.join("\n")}

Importante: Em "technicalData" e em todos os "prompts", combine os parâmetros gerais da Imagem Principal (#1) substituindo/mesclando os parâmetros específicos indicados para cada imagem auxiliar. Em "summaryDescription", mencione claramente quais elementos vieram da imagem principal e quais vieram das imagens auxiliares.`;
    }

    if (input.userNotes) {
      promptInstructions += `\nNotas adicionais do diretor: ${input.userNotes}`;
    }

    contentParts.unshift(primaryImagePart);
    contentParts.unshift(promptInstructions);

    let rawJsonText = "";
    let effectiveModel = selectedModel;
    let tokensUsage: { inputTokens?: number; outputTokens?: number } = {};

    try {
      const failoverResult = await GeminiMultiProvider.executeWithFailover<{
        text: string;
        model: string;
      }>(
        {
          feature: "CINEMATIC_ANALYSIS",
          model: selectedModel,
          operationId: analysisId,
          workspaceId,
          projectId: input.projectId,
          timeoutMs: 60000,
        },
        async (activeApiKey, currentSelectedModel) => {
          const ai = new GoogleGenAI({ apiKey: activeApiKey });
          const candidateModels = Array.from(
            new Set([currentSelectedModel, "gemini-2.5-flash"])
          );

          let attemptErr: any = null;
          for (let i = 0; i < candidateModels.length; i++) {
            const modelAttempt = candidateModels[i];
            try {
              const response = await ai.models.generateContent({
                model: modelAttempt,
                contents: contentParts,
                config: {
                  responseMimeType: "application/json",
                  systemInstruction,
                },
              });

              const usage = (response as any).usageMetadata;
              return {
                data: {
                  text: response.text || "",
                  model: modelAttempt,
                },
                tokens: usage
                  ? {
                      inputTokens: usage.promptTokenCount ?? 0,
                      outputTokens: usage.candidatesTokenCount ?? 0,
                    }
                  : undefined,
              };
            } catch (err: any) {
              attemptErr = err;
              console.warn(
                `[CinematicAnalysis] Modelo ${modelAttempt} retornou erro (${err?.status || err?.message || err}). Tentando próximo modelo disponível...`
              );
              if (i < candidateModels.length - 1) {
                continue;
              }
              throw err;
            }
          }
          throw attemptErr;
        }
      );

      rawJsonText = failoverResult.data.text;
      effectiveModel = failoverResult.data.model;
      if (failoverResult.tokens) {
        tokensUsage = failoverResult.tokens;
      }
    } catch (err: any) {
      console.warn(`[CinematicAnalysis] Falha no failover da Gemini API (${err?.message || err}). Ativando heurística cinematográfica de contingência.`);
    }

    // Tratamento e limpeza do JSON retornado
    let cleanJson = rawJsonText.trim();
    if (cleanJson.startsWith("```json")) {
      cleanJson = cleanJson.replace(/^```json\s*/i, "").replace(/\s*```$/, "");
    } else if (cleanJson.startsWith("```")) {
      cleanJson = cleanJson.replace(/^```\s*/, "").replace(/\s*```$/, "");
    }

    // Detecção se o contexto é Preto e Branco / Vintage
    const refHints = `${input.referenceTitle || ""} ${input.userNotes || ""}`.toLowerCase();
    const isBWHint =
      refHints.includes("peb") ||
      refHints.includes("preto e branco") ||
      refHints.includes("black and white") ||
      refHints.includes("monocrom") ||
      refHints.includes("anos 50") ||
      refHints.includes("pb");

    let parsedResult: any = {};
    let usedFallback = false;
    try {
      parsedResult = JSON.parse(cleanJson);
    } catch {
      usedFallback = true;
      console.warn("[CinematicAnalysis] Resposta da IA ausente ou inválida: devolvendo heurística de contingência marcada como isFallback.");
      // Contingência com valores genéricos coerentes com a entrada do usuário (NÃO é análise real da imagem)
      parsedResult = {
        technicalData: {
          cameraSensor: "Full Frame 35mm (Padrão Cinema)",
          lensFocalLength: "35mm Grande Angular Moderada",
          aperture: "f/1.8",
          framing: "Plano Médio / Medium Shot",
          cameraAngle: "Eye-level Nivelado",
          cameraMovement: "Handheld Orgânico Suave",
          lightingStyle: isBWHint
            ? "Chiaroscuro Preto e Branco com Alto Contraste"
            : "Chiaroscuro Cinematográfico com Luz Natural Suave",
          lightingSetup: "Key Light lateral a 45 graus, Fill Light difuso suave, Rim Light sutil",
          colorTemperature: isBWHint ? "Monocromático (Sem temperatura de cor)" : "5600K Daylight Equilibrada",
          colorPalette: isBWHint
            ? ["#121212", "#3a3a3a", "#707070", "#b8b8b8", "#f0f0f0"]
            : ["#1c1917", "#44403c", "#78716c", "#d6d3d1", "#fafaf9"],
          colorHarmony: isBWHint
            ? "Preto e Branco Monocromático Analógico"
            : "Luz Natural Cinematográfica Orgânica",
          filmGrain: isBWHint ? 45 : 25,
          visualAesthetic: isBWHint
            ? "Fotografia Preto e Branco Cinematográfica Vintage"
            : "Realismo Contemporâneo de Alto Contraste",
          aspectRatio: "16:9",
          summaryDescription: isBWHint
            ? "Tomada cinematográfica em preto e branco com alta granulação, iluminação chiaroscuro e forte textura de película analógica."
            : "Tomada cinematográfica com profundidade de campo rasa, paleta calibrada e forte expressividade dramática.",
        },
        prompts: {
          midjourney: isBWHint
            ? "Cinematic black and white photograph, 35mm film still, chiaroscuro lighting, rich monochrome tones, authentic film grain --ar 16:9 --style raw"
            : "Cinematic shot, 35mm lens, f/1.8, soft volumetric lighting, natural palette, film grain --ar 16:9 --style raw --v 6.1",
          flux: isBWHint
            ? "An authentic black and white 35mm film photograph, high contrast grayscale, deep shadows, pronounced analog film grain, vintage movie still frame."
            : "A cinematic film still captured on 35mm full frame camera with f/1.8 aperture, natural subtle lighting, rich atmospheric textures.",
          sdxl: isBWHint
            ? "black and white cinematic still, 35mm monochrome photo, deep contrast, analog film grain, 8k resolution, photorealistic"
            : "cinematic still, 35mm photo, detailed lighting, volumetric shadows, 8k resolution, photorealistic",
          videoGenerators: "Slow subtle dolly in toward the subject, steady cinematic camera motion, smooth 24fps motion blur.",
          negativePrompt: isBWHint
            ? "color, colorful, vibrant colors, saturated colors, chromatic aberration, color tint, red, green, blue, yellow, orange, deformed hands, extra limbs, bad anatomy, low quality, cartoon, CGI 3D look"
            : "deformed hands, extra limbs, bad anatomy, low quality, cartoon, oversaturated, CGI 3D look",
          narrativeDescriptionPt: isBWHint
            ? "Tomada cinematográfica em preto e branco com atmosfera nostálgica e granulação intensa."
            : "Tomada cinematográfica dramática com iluminação de alto contraste e foco seletivo.",
          englishPrompt: isBWHint
            ? "Cinematic black and white medium shot with rich contrast, moody chiaroscuro lighting and deep analog film grain."
            : "Cinematic medium shot with selective focus and moody lighting.",
        },
      };
    }

    const rawTD = (parsedResult && typeof parsedResult === "object" ? parsedResult.technicalData : null) || {};
    const rawPrompts = (parsedResult && typeof parsedResult === "object" ? parsedResult.prompts : null) || {};

    const technicalData: TechnicalData = {
      cameraSensor: toSafeString(rawTD.cameraSensor, "Full Frame 35mm"),
      lensFocalLength: toSafeString(rawTD.lensFocalLength, "35mm"),
      aperture: toSafeString(rawTD.aperture, "f/1.8"),
      framing: toSafeString(rawTD.framing, "Plano Médio"),
      cameraAngle: toSafeString(rawTD.cameraAngle, "Eye-level"),
      cameraMovement: toSafeString(rawTD.cameraMovement, "Estático com respiração orgânica"),
      lightingStyle: toSafeString(rawTD.lightingStyle, "Luz Natural Suave"),
      lightingSetup: toSafeString(rawTD.lightingSetup, "Key Light 45°, Fill sutil"),
      colorTemperature: toSafeString(rawTD.colorTemperature, "5600K"),
      colorPalette: Array.isArray(rawTD.colorPalette)
        ? rawTD.colorPalette.map((c: any) => toSafeString(c)).filter(Boolean)
        : ["#101418", "#10B981", "#E0E3E8", "#F59E0B", "#3B82F6"],
      colorHarmony: toSafeString(
        rawTD.colorHarmony,
        isBWHint ? "Preto e Branco Monocromático Analógico" : "Luz Natural Cinematográfica"
      ),
      filmGrain: typeof rawTD.filmGrain === "number" ? rawTD.filmGrain : Number(rawTD.filmGrain) || (isBWHint ? 45 : 25),
      visualAesthetic: toSafeString(
        rawTD.visualAesthetic,
        isBWHint ? "Fotografia Preto e Branco Cinematográfica Vintage" : "Cinematográfico Realista"
      ),
      aspectRatio: toSafeString(rawTD.aspectRatio, "16:9"),
      summaryDescription: toSafeString(rawTD.summaryDescription, "Tomada cinematográfica decupada."),
    };

    const prompts: ReverseEngineeredPrompts = {
      midjourney: toSafeString(rawPrompts.midjourney, "Cinematic shot --ar 16:9 --style raw --v 6.1"),
      flux: toSafeString(rawPrompts.flux, "A cinematic still with 35mm lens."),
      sdxl: toSafeString(rawPrompts.sdxl, "cinematic still, 8k, photorealistic"),
      videoGenerators: toSafeString(rawPrompts.videoGenerators, "Smooth dolly in camera movement, 24fps."),
      negativePrompt: toSafeString(rawPrompts.negativePrompt, "deformed, blurry, bad anatomy"),
      narrativeDescriptionPt: toSafeString(rawPrompts.narrativeDescriptionPt, "Cena cinematográfica."),
      englishPrompt: toSafeString(rawPrompts.englishPrompt, "Cinematic film still."),
    };

    const rawCR = (parsedResult && typeof parsedResult === "object" ? parsedResult.continuityReport : null) || {};
    const continuityReport: ContinuityReport | undefined = (input.mode === "VISUAL_CONTINUITY" || parsedResult.continuityReport)
      ? {
          score: typeof rawCR.score === "number" ? rawCR.score : 85,
          characterConsistency: toSafeString(rawCR.characterConsistency, "Consistência de figurino e feições preservada."),
          lightingConsistency: toSafeString(rawCR.lightingConsistency, "Raccord de luz compatível com a tomada anterior."),
          spatialConsistency: toSafeString(rawCR.spatialConsistency, "Geometria cênica correspondente."),
          discrepancies: Array.isArray(rawCR.discrepancies) ? rawCR.discrepancies.map((d: any) => toSafeString(d)) : [],
          alignmentRecommendations: Array.isArray(rawCR.alignmentRecommendations)
            ? rawCR.alignmentRecommendations.map((r: any) => toSafeString(r))
            : ["Manter mesma direção de luz-chave na próxima cena."],
        }
      : undefined;

    // Mapeamento automático dos parâmetros extraídos para o catálogo do Tomadix V1
    const framingLow = technicalData.framing.toLowerCase();
    const lensLow = technicalData.lensFocalLength.toLowerCase();
    const apertureStr = technicalData.aperture.toLowerCase();
    const angleLow = technicalData.cameraAngle.toLowerCase();
    const movementLow = technicalData.cameraMovement.toLowerCase();
    const lightingLow = technicalData.lightingStyle.toLowerCase();
    const tempLow = technicalData.colorTemperature.toLowerCase();
    const harmonyLow = technicalData.colorHarmony.toLowerCase();

    const mappedParameters: Record<string, unknown> = {
      formato_sensor_camera: "full_frame_35mm",
      distancia_focal_lente: lensLow.includes("50mm")
        ? "50mm_normal"
        : lensLow.includes("85mm")
        ? "85mm_teleobjetiva"
        : "35mm_grande_angular_moderada",
      profundidade_campo_foco: apertureStr.includes("1.") || apertureStr.includes("f/1") ? "foco_raso_bokeh" : "profundidade_media",
      tipo_de_plano: framingLow.includes("close")
        ? "close_up"
        : framingLow.includes("geral") || framingLow.includes("wide")
        ? "plano_geral"
        : "plano_medio",
      angulo_camera_posicao: angleLow.includes("low") || angleLow.includes("contra") ? "contra_plongee_baixo" : "nivel_olhos_neutro",
      movimento_camera: movementLow.includes("hand") ? "handheld_organico" : "estatica_tripé",
      estilo_iluminacao: lightingLow.includes("chiaroscuro") ? "chiaroscuro_dramatico" : "luz_natural_suave",
      temperatura_cor_iluminacao: tempLow.includes("3200") || tempLow.includes("quente") ? "quente_tungstenio_3200k" : "neutra_5600k",
      estilo_cinematografico_visual: "realista_contemporaneo",
      nivel_granulacao_pelicula: technicalData.filmGrain,
      paleta_cor_dominante: harmonyLow.includes("teal")
        ? "teal_and_orange"
        : harmonyLow.includes("preto e branco") || harmonyLow.includes("monocrom") || isBWHint
        ? "preto_e_branco_tonal"
        : "tons_terrosos_organicos",
      proibir_elementos_negativos: prompts.negativePrompt,
    };

    const finalResult: CinematicAnalysisResult = {
      id: analysisId,
      mode: input.mode,
      modelUsed: effectiveModel,
      referenceTitle: input.referenceTitle || "Referência Cinematográfica",
      imageUrl: input.thumbnailUrl || input.image,
      comparisonImageUrl: input.comparisonImage,
      auxiliarySummary:
        auxImages.length > 0
          ? auxImages.map((aux, idx) => ({
              label: aux.label || `Imagem ${idx + 2}`,
              imageUrl: aux.thumbnailUrl || aux.image,
              aspects: aux.aspects || [],
              customInstruction: aux.customInstruction,
            }))
          : undefined,
      createdAt: new Date().toISOString(),
      technicalData,
      prompts,
      continuityReport,
      parameterSettings: mappedParameters,
      isFavorited: false,
      isFallback: usedFallback || undefined,
    };

    // Salvar registro de auditoria / job no banco de dados se houver projeto
    if (input.projectId) {
      await db.generationJob.create({
        data: {
          projectId: input.projectId,
          status: "SUCCEEDED",
          modelName: effectiveModel,
          request: {
            mode: input.mode,
            referenceTitle: input.referenceTitle,
            modelTier: input.modelTier,
          },
          result: finalResult as any,
          inputTokens: tokensUsage.inputTokens || 0,
          outputTokens: tokensUsage.outputTokens || 0,
          startedAt: new Date(),
          finishedAt: new Date(),
        },
      }).catch((err) => {
        console.warn("[CinematicAnalysis] Não foi possível persistir GenerationJob:", err);
      });
    }

    return finalResult;
  }

  /**
   * Indica se a análise salva (GenerationJob) veio da heurística de contingência,
   * ou seja, não reflete a imagem enviada e não deve ser aplicada ao projeto.
   */
  static async isFallbackAnalysis(projectId: string, workspaceId: string, analysisId: string): Promise<boolean> {
    const saved = await db.generationJob.findFirst({
      where: {
        projectId,
        project: { workspaceId },
        result: { path: ["id"], equals: analysisId },
      },
      select: { result: true },
    });
    const savedResult = saved?.result as { isFallback?: boolean } | null;
    return Boolean(savedResult?.isFallback);
  }

  /**
   * Aplica diretamente os parâmetros extraídos da análise à configuração e aos registros
   * de parâmetros do projeto selecionado (ProjectParameterValue e Bíblia Visual).
   */
  static async applyToProject(
    projectId: string,
    workspaceId: string,
    parameterSettings: Record<string, unknown> = {},
    technicalData?: Record<string, unknown>,
    prompts?: Record<string, unknown>,
    analysisId?: string
  ): Promise<{ success: boolean; appliedCount: number; message: string }> {
    const project = await db.project.findFirst({
      where: { id: projectId, workspaceId },
      include: {
        parameterValues: {
          include: { definition: true },
        },
      },
    });

    if (!project) {
      throw new Error("Projeto não encontrado ou sem permissão de acesso.");
    }

    const tech = (technicalData || {}) as Record<string, any>;
    const pr = (prompts || {}) as Record<string, any>;

    // 1. Mapeamento semântico completo e robusto das características técnicas analisadas
    const unifiedParams: Record<string, unknown> = {
      ...parameterSettings,
    };

    if (tech.cameraSensor && !unifiedParams["formato_sensor_camera"]) {
      const s = String(tech.cameraSensor).toLowerCase();
      if (s.includes("imax") || s.includes("70mm")) unifiedParams["formato_sensor_camera"] = "imax_70mm";
      else if (s.includes("16mm")) unifiedParams["formato_sensor_camera"] = "pelicula_16mm_vintage";
      else if (s.includes("medio") || s.includes("medium")) unifiedParams["formato_sensor_camera"] = "medio_formato";
      else if (s.includes("super 35") || s.includes("super_35")) unifiedParams["formato_sensor_camera"] = "super_35";
      else unifiedParams["formato_sensor_camera"] = "full_frame_35mm";
    }

    if (tech.lensFocalLength && !unifiedParams["distancia_focal_lente"]) {
      const l = String(tech.lensFocalLength).toLowerCase();
      if (l.includes("24mm") || l.includes("grande angular")) unifiedParams["distancia_focal_lente"] = "24mm_grande_angular";
      else if (l.includes("50mm")) unifiedParams["distancia_focal_lente"] = "50mm_olho_humano";
      else if (l.includes("85mm")) unifiedParams["distancia_focal_lente"] = "85mm_retrato";
      else if (l.includes("135mm") || l.includes("tele")) unifiedParams["distancia_focal_lente"] = "135mm_teleobjetiva";
      else unifiedParams["distancia_focal_lente"] = "35mm_narrativa";
    }

    if (tech.aperture && !unifiedParams["profundidade_campo_foco"]) {
      const a = String(tech.aperture).toLowerCase();
      if (a.includes("1.") || a.includes("2.0") || a.includes("bokeh") || a.includes("raso")) {
        unifiedParams["profundidade_campo_foco"] = "foco_raso_bokeh";
      } else if (a.includes("8") || a.includes("11") || a.includes("16") || a.includes("deep") || a.includes("profundo")) {
        unifiedParams["profundidade_campo_foco"] = "foco_profundo_deep";
      } else {
        unifiedParams["profundidade_campo_foco"] = "profundidade_media";
      }
    }

    if (tech.framing && !unifiedParams["tipo_de_plano"]) {
      const f = String(tech.framing).toLowerCase();
      if (f.includes("extreme close") || f.includes("detalhe")) unifiedParams["tipo_de_plano"] = "extreme_close_up";
      else if (f.includes("close")) unifiedParams["tipo_de_plano"] = "close_up";
      else if (f.includes("americano") || f.includes("medium long")) unifiedParams["tipo_de_plano"] = "plano_americano";
      else if (f.includes("muito aberto") || f.includes("extreme wide")) unifiedParams["tipo_de_plano"] = "plano_muito_aberto";
      else if (f.includes("geral") || f.includes("wide")) unifiedParams["tipo_de_plano"] = "plano_geral";
      else unifiedParams["tipo_de_plano"] = "plano_medio";
    }

    if (tech.cameraAngle && !unifiedParams["angulo_camera_posicao"]) {
      const ang = String(tech.cameraAngle).toLowerCase();
      if (ang.includes("low") || ang.includes("contra")) unifiedParams["angulo_camera_posicao"] = "contra_plongee";
      else if (ang.includes("high") || ang.includes("plongee") || ang.includes("cima")) unifiedParams["angulo_camera_posicao"] = "plongee";
      else if (ang.includes("zenital") || ang.includes("top") || ang.includes("bird")) unifiedParams["angulo_camera_posicao"] = "zenital";
      else if (ang.includes("dutch") || ang.includes("holandes")) unifiedParams["angulo_camera_posicao"] = "dutch_angle";
      else if (ang.includes("pov") || ang.includes("primeira pessoa")) unifiedParams["angulo_camera_posicao"] = "ponto_de_vista_pov";
      else unifiedParams["angulo_camera_posicao"] = "nivel_olhos";
    }

    if (tech.cameraMovement && !unifiedParams["movimento_camera"]) {
      const m = String(tech.cameraMovement).toLowerCase();
      if (m.includes("hand") || m.includes("mao") || m.includes("organico")) unifiedParams["movimento_camera"] = "handheld_organico";
      else if (m.includes("dolly in")) unifiedParams["movimento_camera"] = "dolly_in";
      else if (m.includes("dolly out")) unifiedParams["movimento_camera"] = "dolly_out";
      else if (m.includes("travel") || m.includes("lateral")) unifiedParams["movimento_camera"] = "travelling_lateral";
      else if (m.includes("grua") || m.includes("jib")) unifiedParams["movimento_camera"] = "grua_jib";
      else unifiedParams["movimento_camera"] = "estatica_tripé";
    }

    if (tech.lightingStyle && !unifiedParams["estilo_iluminacao"]) {
      const l = String(tech.lightingStyle).toLowerCase();
      if (l.includes("chiaroscuro") || l.includes("noir")) unifiedParams["estilo_iluminacao"] = "chiaroscuro_dramatico";
      else if (l.includes("golden") || l.includes("dourad")) unifiedParams["estilo_iluminacao"] = "golden_hour";
      else if (l.includes("neon") || l.includes("cyberpunk")) unifiedParams["estilo_iluminacao"] = "neon_cyberpunk";
      else if (l.includes("dura") || l.includes("sol") || l.includes("hard")) unifiedParams["estilo_iluminacao"] = "hard_sunlight";
      else if (l.includes("rim") || l.includes("recorte")) unifiedParams["estilo_iluminacao"] = "rim_light_recorte";
      else unifiedParams["estilo_iluminacao"] = "luz_natural_suave";
    }

    if (tech.colorTemperature && !unifiedParams["temperatura_cor_iluminacao"]) {
      const t = String(tech.colorTemperature).toLowerCase();
      if (t.includes("3200") || t.includes("quente") || t.includes("tungst")) unifiedParams["temperatura_cor_iluminacao"] = "quente_tungstenio_3200k";
      else if (t.includes("7000") || t.includes("fria") || t.includes("azul")) unifiedParams["temperatura_cor_iluminacao"] = "fria_azulada_7000k";
      else if (t.includes("bicolor")) unifiedParams["temperatura_cor_iluminacao"] = "bicolor_contrastante";
      else unifiedParams["temperatura_cor_iluminacao"] = "neutra_5600k";
    }

    if (tech.visualAesthetic && !unifiedParams["estilo_cinematografico_visual"]) {
      const a = String(tech.visualAesthetic).toLowerCase();
      if (a.includes("cyberpunk") || a.includes("neo-noir")) unifiedParams["estilo_cinematografico_visual"] = "cyberpunk_neonoir";
      else if (a.includes("fantasia") || a.includes("epica")) unifiedParams["estilo_cinematografico_visual"] = "fantasia_epica";
      else if (a.includes("document")) unifiedParams["estilo_cinematografico_visual"] = "documentario_cru";
      else if (a.includes("retro") || a.includes("vintage") || a.includes("technicolor") || a.includes("70s") || a.includes("nostalgico")) {
        unifiedParams["estilo_cinematografico_visual"] = "retro_technicolor_70s";
      } else {
        unifiedParams["estilo_cinematografico_visual"] = "realista_contemporaneo";
      }
    }

    if (tech.colorHarmony && !unifiedParams["paleta_cor_dominante"]) {
      const h = String(tech.colorHarmony).toLowerCase();
      if (h.includes("teal") || h.includes("orange")) unifiedParams["paleta_cor_dominante"] = "teal_and_orange";
      else if (h.includes("monocrom") || h.includes("dessaturad") || h.includes("preto e branco") || h.includes("peb")) {
        unifiedParams["paleta_cor_dominante"] = "monocromatico_dessaturado";
      } else if (h.includes("terros") || h.includes("ocre") || h.includes("warm") || h.includes("analogo")) {
        unifiedParams["paleta_cor_dominante"] = "tons_terrosos_organicos";
      } else if (h.includes("vivid") || h.includes("saturad") || h.includes("colorid")) {
        unifiedParams["paleta_cor_dominante"] = "cores_vividas_saturadas";
      } else {
        unifiedParams["paleta_cor_dominante"] = "tons_terrosos_organicos";
      }
    }

    if (tech.filmGrain !== undefined && unifiedParams["nivel_granulacao_pelicula"] === undefined) {
      unifiedParams["nivel_granulacao_pelicula"] = Number(tech.filmGrain) || 25;
    }

    if (tech.aspectRatio && !unifiedParams["proporcao_tela_aspect_ratio"]) {
      unifiedParams["proporcao_tela_aspect_ratio"] = tech.aspectRatio;
    }

    if (pr.negativePrompt && !unifiedParams["proibir_elementos_negativos"]) {
      unifiedParams["proibir_elementos_negativos"] = pr.negativePrompt;
    }

    // 2. Garantir parâmetros padrão no workspace e sincronizar definições
    await ParameterService.ensureDefaultParameters(workspaceId);
    const allDefs = await ParameterService.listParameters(workspaceId, { enabled: true });
    const defsByKey = new Map(allDefs.map((d: any) => [d.key, d]));

    // 3. Salvar valores diretamente no banco relacional (ParameterValue)
    const valuesToSave: Array<{
      parameterDefinitionId: string;
      targetType: "PROJECT";
      targetId: null;
      value: unknown;
    }> = [];

    for (const [key, val] of Object.entries(unifiedParams)) {
      const def = defsByKey.get(key);
      if (def && val !== undefined && val !== null) {
        valuesToSave.push({
          parameterDefinitionId: def.id,
          targetType: "PROJECT",
          targetId: null,
          value: val,
        });
      }
    }

    if (valuesToSave.length > 0) {
      await ParameterService.saveValues(projectId, workspaceId, valuesToSave);
    }

    // 4. Atualizar a configuração global, Bíblia Visual e metadados do projeto
    const currentConfig = (project.configuration as any) || {};
    const updatedConfig = {
      ...currentConfig,
      colorGrade: tech.colorHarmony || tech.visualAesthetic || currentConfig.colorGrade,
      aspectRatio: tech.aspectRatio || currentConfig.aspectRatio,
      colorPalette: tech.colorPalette || currentConfig.colorPalette,
      filmGrain: tech.filmGrain !== undefined ? Number(tech.filmGrain) : currentConfig.filmGrain,
      parameterSettings: {
        ...(currentConfig.parameterSettings || {}),
        values: {
          ...((currentConfig.parameterSettings as any)?.values || {}),
          ...unifiedParams,
        },
        enabledParameterKeys: Array.from(
          new Set([
            ...(((currentConfig.parameterSettings as any)?.enabledParameterKeys) || []),
            ...Object.keys(unifiedParams),
          ])
        ),
        appliedFromAnalysisAt: new Date().toISOString(),
        analysisId,
      },
      visualBible: {
        ...(currentConfig.visualBible || {}),
        source: "CINEMATIC_ANALYSIS",
        appliedAt: new Date().toISOString(),
        analysisId,
        technicalData: tech,
        reversePrompts: pr,
        summaryDescription: tech.summaryDescription,
        aesthetic: tech.visualAesthetic,
        lighting: tech.lightingStyle,
        lightingSetup: tech.lightingSetup,
        colorTemperature: tech.colorTemperature,
        camera: tech.cameraSensor,
        lens: tech.lensFocalLength,
        aperture: tech.aperture,
        framing: tech.framing,
        angle: tech.cameraAngle,
        movement: tech.cameraMovement,
        colorGrade: tech.colorHarmony,
        palette: tech.colorPalette,
        filmGrain: tech.filmGrain,
        aspectRatio: tech.aspectRatio,
        negativePrompt: pr.negativePrompt,
      },
    };

    const updateData: any = {
      configuration: updatedConfig,
      visualBible: updatedConfig.visualBible,
      updatedAt: new Date(),
    };

    if ((!project.description || project.description.trim() === "") && tech.summaryDescription) {
      updateData.description = String(tech.summaryDescription).slice(0, 500);
    }

    await db.project.update({
      where: { id: projectId },
      data: updateData,
    });

    const appliedCount = Object.keys(unifiedParams).length;
    return {
      success: true,
      appliedCount,
      message: `${appliedCount} parâmetros cinematográficos aplicados com sucesso à Bíblia Visual e ao catálogo técnico do projeto!`,
    };
  }

  /**
   * Retorna referências cinematográficas padrão do estúdio com imagens reais para o seletor visual.
   */
  static getDefaultStudioReferences() {
    return [
      {
        id: "ref_main_vibe",
        title: "Neon Noir • Rua chuvosa à noite",
        badge: "NEON",
        category: "Estética & Iluminação",
        imageUrl: "/studio-references/neon-noir.webp",
        description: "Close-up sob letreiros neon magenta e ciano, reflexos molhados e fundo desfocado.",
        technicalTag: "85mm • f/1.4 • Neon Noir",
      },
      {
        id: "ref_portrait_motion",
        title: "Câmera na mão • Movimento",
        badge: "MOVIMENTO",
        category: "Movimento & Câmera",
        imageUrl: "/studio-references/motion-blur.webp",
        description: "Plataforma de metrô com borrão de movimento e rastros de luz — sensação documental.",
        technicalTag: "35mm • 1/15s • Handheld",
      },
      {
        id: "ref_high_fashion",
        title: "Chiaroscuro • Luz dura lateral",
        badge: "CONTRASTE",
        category: "Iluminação Cinematográfica",
        imageUrl: "/studio-references/chiaroscuro.webp",
        description: "Retrato com uma única luz lateral: metade do rosto em sombra profunda.",
        technicalTag: "85mm • f/2.0 • Low Key",
      },
      {
        id: "ref_golden_dusk",
        title: "Golden Hour • Pôr do sol anamórfico",
        badge: "GOLDEN HOUR",
        category: "Color Grading & Tom",
        imageUrl: "/studio-references/golden-hour.webp",
        description: "Contraluz dourado no fim de tarde com flare horizontal de lente anamórfica.",
        technicalTag: "Anamórfico 40mm • 2.39:1 • 3200K",
      },
      {
        id: "ref_monochrome_film",
        title: "Preto e branco • Grão de película",
        badge: "P&B 35MM",
        category: "Película & Textura",
        imageUrl: "/studio-references/black-white-grain.webp",
        description: "Fotografia analógica P&B com grão marcante e halation nas altas luzes.",
        technicalTag: "35mm • Grão 60% • Tri-X 400",
      },
      {
        id: "ref_natural_soft",
        title: "Luz de janela • Natural e suave",
        badge: "LUZ NATURAL",
        category: "Iluminação Cinematográfica",
        imageUrl: "/studio-references/soft-window-light.webp",
        description: "Luz difusa de dia nublado entrando pela janela, sombras suaves e paleta nórdica.",
        technicalTag: "50mm • f/2.8 • 5600K",
      },
    ];
  }
}
