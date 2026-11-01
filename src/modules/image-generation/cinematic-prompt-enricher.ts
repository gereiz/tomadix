import { db } from "@/lib/db";

export interface CinematicEnrichmentInput {
  userPrompt: string;
  projectId?: string | null;
  workspaceId: string;
  characterId?: string | null;
  environmentId?: string | null;
  sceneId?: string | null;
  negativePrompt?: string;
  aspectRatio?: string;
}

export interface CinematicEnrichmentResult {
  enrichedPrompt: string;
  originalPrompt: string;
  enrichedNegativePrompt?: string;
  appliedDirectives: string[];
  skippedDirectives: string[];
}

/**
 * Normaliza texto para testes de regex insensíveis a acentos.
 */
function normalizeForSearch(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

/**
 * Serviço responsável por garantir que todas as imagens geradas no sistema
 * herdem os parâmetros cinematográficos do projeto (luz, câmera, lente, ângulo,
 * color grade, gênero e estilo), exceto quando o usuário especificar explicitamente
 * essas informações em seu próprio prompt.
 */
export class CinematicPromptEnricher {
  /**
   * Verifica se o prompt do usuário já possui termos de Iluminação.
   */
  static hasUserLighting(prompt: string): boolean {
    const norm = normalizeForSearch(prompt);
    return /\b(iluminacao|lighting|luz|luzes|lights?|chiaroscuro|golden hour|hora de ouro|neon|rim light|recorte|sombras|shadows|daylight|sunlight|tungstenio|ambient light|hard light|soft light|backlight|contra-luz|luz suave|luz dura|luz natural|volumetric light|luz volumetrica|cinematic light)\b/i.test(
      norm
    );
  }

  /**
   * Verifica se o prompt do usuário já possui termos de Câmera, Lente ou Sensor.
   */
  static hasUserCamera(prompt: string): boolean {
    const norm = normalizeForSearch(prompt);
    return /\b(lente|lens|camera|focal|mm\b|grande angular|wide-angle|teleobjetiva|telephoto|anamorfica|anamorphic|bokeh|foco|focus|depth of field|profundidade de campo|sensor|imax|35mm|50mm|85mm|24mm|70mm|f\/?1\.[48]|f\/?2|f\/?4|super 35|shutter|obturador)\b/i.test(
      norm
    );
  }

  /**
   * Verifica se o prompt do usuário já possui termos de Ângulo ou Enquadramento.
   */
  static hasUserAngle(prompt: string): boolean {
    const norm = normalizeForSearch(prompt);
    return /\b(angulo|angle|enquadramento|framing|plano|shot|close-?up|wide shot|plano geral|plano medio|low angle|high angle|contra-?plongee|plongee|zenital|top-?down|bird'?s eye|dutch angle|ponto de vista|pov|vista aerea|primeiro plano|plano detalhe|plano americano)\b/i.test(
      norm
    );
  }

  /**
   * Verifica se o prompt do usuário já possui termos de Cor ou Color Grading.
   */
  static hasUserColor(prompt: string): boolean {
    const norm = normalizeForSearch(prompt);
    return /\b(color grade|color grading|cores|colors|palette|paleta|preto e branco|p&b|peb|black and white|monocromatico|monochrome|sepia|teal and orange|technicolor|kodachrome)\b/i.test(
      norm
    );
  }

  /**
   * Enriquece o prompt do usuário com os parâmetros cinematográficos do projeto.
   */
  static async enrich(input: CinematicEnrichmentInput): Promise<CinematicEnrichmentResult> {
    const { userPrompt, projectId, workspaceId, characterId, environmentId, sceneId } = input;

    let negativePrompt = input.negativePrompt || "";
    const appliedDirectives: string[] = [];
    const skippedDirectives: string[] = [];

    if (!projectId) {
      return {
        enrichedPrompt: userPrompt,
        originalPrompt: userPrompt,
        enrichedNegativePrompt: negativePrompt || undefined,
        appliedDirectives: [],
        skippedDirectives: [],
      };
    }

    // 1. Carregar metadados e parâmetros do projeto
    const project = await db.project.findUnique({
      where: { id: projectId },
      include: {
        parameterValues: {
          include: {
            definition: true,
          },
        },
      },
    });

    if (!project) {
      return {
        enrichedPrompt: userPrompt,
        originalPrompt: userPrompt,
        enrichedNegativePrompt: negativePrompt || undefined,
        appliedDirectives: [],
        skippedDirectives: [],
      };
    }

    const config = (project.configuration || {}) as Record<string, any>;
    const paramValuesMap: Record<string, any> = {};

    for (const pv of project.parameterValues) {
      const key = pv.definition.key;
      let val = pv.value;
      if (typeof val === "string") {
        try {
          const parsed = JSON.parse(val);
          val = parsed.value !== undefined ? parsed.value : parsed;
        } catch {
          // valor é string literal
        }
      } else if (typeof val === "object" && val !== null && (val as any).value !== undefined) {
        val = (val as any).value;
      }
      paramValuesMap[key] = val;
    }

    // 2. Carregar contexto de cena / personagem / ambiente se fornecido
    let sceneConfig: Record<string, any> = {};
    if (sceneId) {
      const scene = await db.scene.findUnique({
        where: { id: sceneId },
        select: { title: true, description: true, configuration: true },
      });
      if (scene && scene.configuration && typeof scene.configuration === "object") {
        sceneConfig = scene.configuration as Record<string, any>;
      }
    }

    // 3. Avaliação e Injeção de Iluminação (Lighting)
    if (this.hasUserLighting(userPrompt)) {
      skippedDirectives.push("iluminação (já declarada no prompt pelo usuário)");
    } else {
      const rawLighting = String(
        sceneConfig.lighting ||
        paramValuesMap["estilo_iluminacao"] ||
        "luz_natural_suave"
      ).toLowerCase();
      const rawTemp = paramValuesMap["temperatura_cor_iluminacao"]
        ? String(paramValuesMap["temperatura_cor_iluminacao"]).toLowerCase()
        : "";

      let lightingDirective = "";
      if (rawLighting.includes("chiaroscuro") || rawLighting.includes("noir")) {
        lightingDirective = "iluminação chiaroscuro dramática com alto contraste e sombras profundas marcadas no estilo noir";
      } else if (rawLighting.includes("golden_hour") || rawLighting.includes("dourada")) {
        lightingDirective = "iluminação cinematográfica golden hour com luz solar dourada e reflexos quentes";
      } else if (rawLighting.includes("neon") || rawLighting.includes("cyberpunk")) {
        lightingDirective = "iluminação cinematográfica neon vibrante com luzes coloridas atmosféricas";
      } else if (rawLighting.includes("rim_light") || rawLighting.includes("recorte")) {
        lightingDirective = "iluminação de recorte (rim light) destacando a silhueta com separação do fundo";
      } else if (rawLighting.includes("hard_sunlight") || rawLighting.includes("sol")) {
        lightingDirective = "iluminação de luz solar direta a pino com sombras duras dramáticas";
      } else {
        lightingDirective = "iluminação cinematográfica suave e volumétrica com luz difusa de estúdio";
      }

      if (rawTemp) {
        if (rawTemp.includes("3200k") || rawTemp.includes("quente")) {
          lightingDirective += ", temperatura de cor quente 3200K de tungstênio";
        } else if (rawTemp.includes("7000k") || rawTemp.includes("fria")) {
          lightingDirective += ", temperatura de cor fria azulada 7000K";
        } else if (rawTemp.includes("bicolor")) {
          lightingDirective += ", temperatura de cor bicolor contrastante (laranja quente e ciano frio)";
        }
      }

      appliedDirectives.push(lightingDirective);
    }

    // 4. Avaliação e Injeção de Câmera e Lente (Camera / Lens / Sensor)
    if (this.hasUserCamera(userPrompt)) {
      skippedDirectives.push("câmera/lente (já declarada no prompt pelo usuário)");
    } else {
      const rawLens = String(paramValuesMap["distancia_focal_lente"] || "35mm_narrativa").toLowerCase();
      const rawDOF = String(sceneConfig.focusDepth || paramValuesMap["profundidade_campo_foco"] || "foco_raso_bokeh").toLowerCase();
      const rawSensor = String(paramValuesMap["formato_sensor_camera"] || paramValuesMap["tipo_de_sensor_camera"] || "super_35").toLowerCase();

      let lensText = "lente cinematográfica 35mm anamórfica";
      if (rawLens.includes("24mm")) lensText = "lente cinematográfica 24mm grande angular";
      else if (rawLens.includes("50mm")) lensText = "lente cinematográfica 50mm perspectiva natural";
      else if (rawLens.includes("85mm")) lensText = "lente cinematográfica 85mm teleobjetiva de retrato";
      else if (rawLens.includes("135mm")) lensText = "lente cinematográfica 135mm com compressão espacial intensa";

      let dofText = "profundidade de campo rasa com bokeh elegante";
      if (rawDOF.includes("profundo") || rawDOF.includes("deep")) {
        dofText = "foco profundo (deep focus) com nitidez nítida em todos os planos";
      }

      let sensorText = "sensor Super 35mm";
      if (rawSensor.includes("imax") || rawSensor.includes("70mm")) {
        sensorText = "película IMAX 70mm com escala monumental e nitidez ultra-alta";
      } else if (rawSensor.includes("16mm")) {
        sensorText = "película 16mm vintage com textura orgânica";
      }

      const cameraDirective = `${lensText}, ${dofText}, capturado em ${sensorText}`;
      appliedDirectives.push(cameraDirective);
    }

    // 5. Avaliação e Injeção de Ângulo e Enquadramento (Angle / Framing)
    if (this.hasUserAngle(userPrompt)) {
      skippedDirectives.push("ângulo/enquadramento (já declarado no prompt pelo usuário)");
    } else {
      const rawAngle = String(paramValuesMap["angulo_camera_posicao"] || "nivel_olhos").toLowerCase();
      const rawFraming = String(sceneConfig.framing || paramValuesMap["tipo_de_plano"] || "plano_medio").toLowerCase();

      let angleText = "ângulo ao nível dos olhos (eye-level)";
      if (rawAngle.includes("contra_plongee") || rawAngle.includes("low")) {
        angleText = "ângulo em contra-plongée (low angle shot de baixo para cima conferindo imponência)";
      } else if (rawAngle.includes("plongee") || rawAngle.includes("high")) {
        angleText = "ângulo em plongée (high angle shot de cima para baixo)";
      } else if (rawAngle.includes("zenital") || rawAngle.includes("top_down")) {
        angleText = "ângulo zenital perpendicular (top-down bird's eye view)";
      } else if (rawAngle.includes("pov") || rawAngle.includes("ponto_de_vista")) {
        angleText = "ponto de vista em primeira pessoa (POV)";
      }

      let framingText = "enquadramento em plano médio cinematográfico";
      if (rawFraming.includes("extreme_close_up")) framingText = "plano detalhe extremo (extreme close-up)";
      else if (rawFraming.includes("close_up")) framingText = "primeiro plano dramático (close-up)";
      else if (rawFraming.includes("plano_americano")) framingText = "plano americano (medium long shot)";
      else if (rawFraming.includes("plano_geral") || rawFraming.includes("wide")) framingText = "plano geral cinematográfico (wide shot estabelecedor)";
      else if (rawFraming.includes("extreme_wide")) framingText = "plano muito aberto panorâmico épico";

      const angleDirective = `${angleText}, ${framingText}`;
      appliedDirectives.push(angleDirective);
    }

    // 6. Avaliação e Injeção de Color Grade & Paleta de Cores
    const colorGrade = config.colorGrade || "";
    const rawPalette = paramValuesMap["paleta_cor_dominante"] || "";

    if (this.hasUserColor(userPrompt)) {
      skippedDirectives.push("cor/color grade (já declarada no prompt pelo usuário)");
    } else if (colorGrade || rawPalette) {
      const gradeLower = (colorGrade || "").toLowerCase();
      let colorDirective = "";

      // Detecção de Preto e Branco / PeB (ex: "PeB anos 50", "Preto e Branco", "Black and White")
      if (
        gradeLower.includes("peb") ||
        gradeLower.includes("preto e branco") ||
        gradeLower.includes("black and white") ||
        gradeLower.includes("monocrom") ||
        gradeLower.includes("anos 50")
      ) {
        colorDirective =
          "estética fotográfica preto e branco monocromática vintage anos 50, escala de cinzas profunda, alto contraste clássico de filme analógico preto e branco com sombras pretas marcadas, autêntico filme PB cinematográfico, sem cores";
        // Proibir cores no negative prompt para garantir 100% de consistência
        const bwNegatives = "color, colorful, saturated colors, chromatic aberration, color accents, polychromatic, neon colors";
        negativePrompt = negativePrompt
          ? `${negativePrompt}, ${bwNegatives}`
          : bwNegatives;
      } else if (gradeLower.includes("teal") || gradeLower.includes("orange")) {
        colorDirective =
          "color grading cinematográfico teal and orange profissional, tons de pele quentes e sombras ciano contrastantes";
      } else if (gradeLower.includes("technicolor") || gradeLower.includes("70s") || gradeLower.includes("retro")) {
        colorDirective =
          "color grading technicolor cinematográfico vintage com saturação rica e estética nostálgica de película";
      } else if (gradeLower.includes("bleach") || gradeLower.includes("bypass")) {
        colorDirective =
          "color grading bleach bypass com contraste prateado desaturado e altas luzes acentuadas";
      } else if (colorGrade) {
        colorDirective = `color grading cinematográfico autoral (${colorGrade})`;
      } else if (rawPalette) {
        colorDirective = `paleta de cores dominante cinematográfica (${rawPalette})`;
      }

      if (colorDirective) {
        appliedDirectives.push(colorDirective);
      }
    }

    // 7. Avaliação e Injeção de Gênero & Estilo Visual da Obra
    const genre = project.genre || "";
    const visualStyle = paramValuesMap["estilo_cinematografico_visual"] || "";

    if (genre && !normalizeForSearch(userPrompt).includes(normalizeForSearch(genre))) {
      appliedDirectives.push(`atmosfera cinematográfica no gênero ${genre}`);
    }

    if (visualStyle) {
      let styleText = "";
      if (visualStyle.includes("cyberpunk")) styleText = "estilo cyberpunk neo-noir cinematográfico hiperestilizado";
      else if (visualStyle.includes("fantasia")) styleText = "estilo de fantasia épica cinematográfica com rica atmosfera visual";
      else if (visualStyle.includes("documentario")) styleText = "estilo documentário cru, realista e autêntico";
      else if (visualStyle.includes("retro")) styleText = "estilo retro cinematográfico com textura de filme vintage";
      else styleText = "estilo de cinema realista contemporâneo";
      appliedDirectives.push(styleText);
    }

    // 8. Granulação de Película e Acabamento de Cinema
    const grainLevel = Number(paramValuesMap["nivel_granulacao_pelicula"] ?? 25);
    let finishDirective = "fotografia de filme 35mm, visual de cinema autêntico, ultra-realista 8k, movie still frame";
    if (grainLevel > 20) {
      finishDirective += ", textura de grão de película analógica sutil e orgânica";
    }
    appliedDirectives.push(finishDirective);

    // 9. Elementos Negativos do Projeto
    const projectNegative = paramValuesMap["proibir_elementos_negativos"];
    if (projectNegative && typeof projectNegative === "string" && projectNegative.trim().length > 0) {
      if (!negativePrompt.includes(projectNegative.trim())) {
        negativePrompt = negativePrompt
          ? `${negativePrompt}, ${projectNegative.trim()}`
          : projectNegative.trim();
      }
    }

    // 10. Compor Prompt Final Enriquecido
    // O prompt original do usuário é mantido intacto como núcleo inicial
    const cleanUserPrompt = userPrompt.trim().replace(/\.+$/, "");
    const combinedDirectives = appliedDirectives.join(", ");
    const enrichedPrompt = combinedDirectives
      ? `${cleanUserPrompt}, ${combinedDirectives}`
      : cleanUserPrompt;

    return {
      enrichedPrompt,
      originalPrompt: userPrompt,
      enrichedNegativePrompt: negativePrompt || undefined,
      appliedDirectives,
      skippedDirectives,
    };
  }
}
