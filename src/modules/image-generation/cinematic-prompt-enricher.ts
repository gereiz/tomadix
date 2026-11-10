import { db } from "@/lib/db";
import { getCaptureStyle } from "@/modules/prompt-engine/capture-styles";

export interface CinematicEnrichmentInput {
  userPrompt: string;
  projectId?: string | null;
  workspaceId: string;
  characterId?: string | null;
  environmentId?: string | null;
  sceneId?: string | null;
  negativePrompt?: string;
  aspectRatio?: string;
  /** Estilo de captura; diferente de "cinematic" desliga o enriquecimento cinematográfico. */
  captureStyle?: string;
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
    return /\b(angulo|angle|enquadramento|framing|plano|shot|close-?up|wide shot|plano geral|plano medio|plano americano|plano inteiro|corpo inteiro|corpo todo|full body|full length|full shot|head to toe|da cabeca aos pes|pes a cabeca|de pe|mostrar os pes|low angle|high angle|contra-?plongee|plongee|zenital|top-?down|bird'?s eye|dutch angle|ponto de vista|pov|vista aerea|primeiro plano|plano detalhe)\b/i.test(
      norm
    );
  }

  /**
   * Verifica se o usuário ou a configuração solicita enquadramento de corpo inteiro.
   */
  static isFullBodyRequested(prompt: string): boolean {
    const norm = normalizeForSearch(prompt);
    return /\b(corpo inteiro|corpo todo|full body|full length|full shot|plano inteiro|head to toe|da cabeca aos pes|pes a cabeca|de corpo inteiro|mostrar os pes|dos pes a cabeca)\b/i.test(
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

    // Estilo de captura (amador/celular, segurança, found footage): substitui o look cinematográfico
    const capture = getCaptureStyle(input.captureStyle);
    if (capture.key !== "cinematic") {
      const mergedNegative = [negativePrompt, ...capture.negativeHints].filter(Boolean).join(", ");
      return {
        enrichedPrompt: capture.suffixFirst ? `${capture.directPromptSuffix}. ${userPrompt}` : `${userPrompt}. ${capture.directPromptSuffix}`,
        originalPrompt: userPrompt,
        enrichedNegativePrompt: mergedNegative || undefined,
        appliedDirectives: [`estilo de captura: ${capture.label}`],
        skippedDirectives: ["enriquecimento cinematográfico (substituído pelo estilo de captura)"],
      };
    }

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
          orderBy: { createdAt: "asc" },
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

    // 1.1 Incorporar valores da Bíblia Visual e do parameterSettings do projeto (prioridade para a configuração ativa)
    const configValues = ((config.parameterSettings as any)?.values || {}) as Record<string, any>;
    const vb = ((project.visualBible || config.visualBible || {}) as Record<string, any>);
    const tech = ((vb.technicalData || {}) as Record<string, any>);

    for (const [k, v] of Object.entries(configValues)) {
      if (v !== undefined && v !== null && v !== "") {
        paramValuesMap[k] = v;
      }
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

      // Carregar parâmetros específicos da cena salvos na tabela ParameterValue
      const sceneParams = await db.parameterValue.findMany({
        where: { targetType: "SCENE", targetId: sceneId },
        include: { definition: true },
      });
      for (const sp of sceneParams) {
        let val = sp.value;
        if (typeof val === "string") {
          try {
            const parsed = JSON.parse(val);
            val = parsed.value !== undefined ? parsed.value : parsed;
          } catch {}
        } else if (typeof val === "object" && val !== null && (val as any).value !== undefined) {
          val = (val as any).value;
        }
        paramValuesMap[sp.definition.key] = val;
      }
    }

    // Se a Bíblia Visual ainda não tiver parâmetros definidos, buscar a última análise cinematográfica salva do projeto
    let latestAnalysisTech: Record<string, any> = {};
    const latestJob = await db.generationJob.findFirst({
      where: { projectId, status: "SUCCEEDED" },
      orderBy: { createdAt: "desc" },
      select: { result: true },
    });
    if (latestJob?.result && typeof latestJob.result === "object") {
      const res = latestJob.result as any;
      if (res.technicalData && typeof res.technicalData === "object") {
        latestAnalysisTech = res.technicalData;
      }
    }

    // 3. Avaliação e Injeção de Iluminação (Lighting)
    if (this.hasUserLighting(userPrompt)) {
      skippedDirectives.push("iluminação (já declarada no prompt pelo usuário)");
    } else {
      const rawLighting = String(
        sceneConfig.lighting ||
        paramValuesMap["estilo_iluminacao"] ||
        vb.lighting ||
        tech.lightingStyle ||
        "luz_natural_suave"
      ).toLowerCase();
      const rawTemp = String(
        paramValuesMap["temperatura_cor_iluminacao"] ||
        vb.colorTemperature ||
        tech.colorTemperature ||
        ""
      ).trim();
      const rawSetup = String(
        vb.lightingSetup ||
        tech.lightingSetup ||
        ""
      ).trim();

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
      } else if (rawLighting.includes("soft") || rawLighting.includes("ambient") || rawLighting.includes("suave") || rawLighting.includes("daylight")) {
        lightingDirective = "iluminação cinematográfica suave e volumétrica com luz natural difusa (Soft Ambient Daylight)";
      } else if (rawLighting !== "luz_natural_suave") {
        lightingDirective = `iluminação cinematográfica ${rawLighting}`;
      } else {
        lightingDirective = "iluminação cinematográfica suave e volumétrica com luz difusa de estúdio";
      }

      if (rawTemp) {
        const tLow = rawTemp.toLowerCase();
        if (tLow.includes("3200k") || (tLow.includes("quente") && !tLow.includes("neutral"))) {
          lightingDirective += ", temperatura de cor quente 3200K de tungstênio";
        } else if (tLow.includes("4500k") || tLow.includes("warm neutral") || tLow.includes("neutra")) {
          lightingDirective += ", temperatura de cor neutra suave 4500K";
        } else if (tLow.includes("7000k") || tLow.includes("fria") || tLow.includes("cool")) {
          lightingDirective += ", temperatura de cor fria azulada 7000K";
        } else if (tLow.includes("bicolor")) {
          lightingDirective += ", temperatura de cor bicolor contrastante (laranja quente e ciano frio)";
        } else {
          lightingDirective += `, temperatura de cor ${rawTemp}`;
        }
      }

      if (rawSetup) {
        lightingDirective += `, setup: ${rawSetup}`;
      }

      appliedDirectives.push(lightingDirective);
    }

    // 4. Avaliação e Injeção de Câmera e Lente (Camera / Lens / Sensor)
    if (this.hasUserCamera(userPrompt)) {
      skippedDirectives.push("câmera/lente (já declarada no prompt pelo usuário)");
    } else {
      const rawLens = String(
        paramValuesMap["distancia_focal_lente"] ||
        vb.lens ||
        tech.lensFocalLength ||
        "35mm_narrativa"
      ).toLowerCase();
      const rawAperture = String(
        vb.aperture ||
        tech.aperture ||
        paramValuesMap["profundidade_campo_foco"] ||
        sceneConfig.focusDepth ||
        ""
      ).trim();
      const rawSensor = String(
        paramValuesMap["formato_sensor_camera"] ||
        paramValuesMap["tipo_de_sensor_camera"] ||
        vb.camera ||
        tech.cameraSensor ||
        "super_35"
      ).toLowerCase();

      let lensText = "lente cinematográfica 35mm anamórfica";
      if (rawLens.includes("24mm")) lensText = "lente cinematográfica 24mm grande angular";
      else if (rawLens.includes("50mm")) lensText = "lente cinematográfica 50mm perspectiva natural";
      else if (rawLens.includes("85mm")) lensText = "lente cinematográfica 85mm teleobjetiva de retrato";
      else if (rawLens.includes("135mm")) lensText = "lente cinematográfica 135mm com compressão espacial intensa";

      let dofText = "profundidade de campo rasa com bokeh elegante";
      if (rawAperture.startsWith("f/") || rawAperture.startsWith("F/")) {
        dofText = `abertura ${rawAperture}, profundidade de campo cinematográfica com desfoque e bokeh cremoso`;
      } else if (rawAperture.includes("profundo") || rawAperture.includes("deep")) {
        dofText = "foco profundo (deep focus) com nitidez nítida em todos os planos";
      }

      let sensorText = "sensor Super 35mm";
      if (rawSensor.includes("full frame") || rawSensor.includes("full_frame") || rawSensor.includes("35mm")) {
        sensorText = "sensor Full Frame 35mm cinematográfico";
      } else if (rawSensor.includes("imax") || rawSensor.includes("70mm")) {
        sensorText = "película IMAX 70mm com escala monumental e nitidez ultra-alta";
      } else if (rawSensor.includes("16mm")) {
        sensorText = "película 16mm vintage com textura orgânica";
      }

      const cameraDirective = `${lensText}, ${dofText}, capturado em ${sensorText}`;
      appliedDirectives.push(cameraDirective);
    }

    // 5. Avaliação e Injeção de Ângulo e Enquadramento (Angle / Framing)
    const rawAngle = String(
      paramValuesMap["angulo_camera_posicao"] ||
      vb.angle ||
      tech.cameraAngle ||
      "nivel_olhos"
    ).toLowerCase();
    const rawFraming = String(
      sceneConfig.framing ||
      paramValuesMap["tipo_de_plano"] ||
      vb.framing ||
      tech.framing ||
      "plano_medio"
    ).toLowerCase();

    const userWantsFullBody = CinematicPromptEnricher.isFullBodyRequested(userPrompt);
    const configWantsFullBody =
      rawFraming.includes("inteiro") ||
      rawFraming.includes("corpo") ||
      rawFraming.includes("full_shot") ||
      rawFraming.includes("full_body");

    // Se o usuário ou o projeto exigirem corpo inteiro, proteger contra cortes indesejados no negative prompt
    if (userWantsFullBody || configWantsFullBody) {
      const fullBodyNegatives =
        "cropped legs, cut off feet, out of frame feet, close-up, cropped body, waist up, half body, torso shot, cut off head, truncated body";
      negativePrompt = negativePrompt
        ? `${negativePrompt}, ${fullBodyNegatives}`
        : fullBodyNegatives;
    }

    if (this.hasUserAngle(userPrompt)) {
      skippedDirectives.push("ângulo/enquadramento (já declarado no prompt pelo usuário)");
      if (userWantsFullBody) {
        appliedDirectives.push(
          "enquadramento em plano inteiro de corpo inteiro da cabeça aos pés (full-length body shot showing entire figure from head to toe, ground visible, feet completely in frame)"
        );
      }
    } else {
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
      if (configWantsFullBody) {
        framingText =
          "enquadramento em plano inteiro de corpo inteiro da cabeça aos pés (full-length body shot showing entire figure from head to toe, ground visible, feet completely in frame)";
      } else if (rawFraming.includes("extreme_close_up")) {
        framingText = "plano detalhe extremo (extreme close-up)";
      } else if (rawFraming.includes("close_up") || rawFraming.includes("close-up") || rawFraming.includes("fechado")) {
        framingText = "primeiro plano dramático (close-up)";
      } else if (rawFraming.includes("plano_americano") || rawFraming.includes("medium_long")) {
        framingText = "plano americano (medium long shot, joelhos para cima)";
      } else if (rawFraming.includes("plano_geral") || rawFraming.includes("wide")) {
        framingText = "plano geral cinematográfico (wide shot estabelecedor)";
      } else if (rawFraming.includes("extreme_wide")) {
        framingText = "plano muito aberto panorâmico épico";
      }

      const angleDirective = `${angleText}, ${framingText}`;
      appliedDirectives.push(angleDirective);
    }

    // 6. Avaliação e Injeção de Color Grade & Paleta de Cores
    const colorGrade = config.colorGrade || vb.colorGrade || tech.colorHarmony || "";
    const rawPalette = paramValuesMap["paleta_cor_dominante"] || vb.palette || tech.colorPalette || config.colorPalette || "";

    const titleLower = (project.title || "").toLowerCase();
    const configGradeLower = ((config.colorGrade || "") as string).toLowerCase();
    const vbGradeLower = String(vb.colorGrade || tech.colorHarmony || "").toLowerCase();
    const paramPaletteLower = String(paramValuesMap["paleta_cor_dominante"] || "").toLowerCase();
    const paramAestheticLower = String(paramValuesMap["estilo_cinematografico_visual"] || "").toLowerCase();

    // Detecção abrangente de Preto e Branco / Monocromático no projeto
    const isBlackAndWhite =
      titleLower.includes("peb") ||
      titleLower.includes("preto e branco") ||
      titleLower.includes("black and white") ||
      titleLower.includes("monocrom") ||
      titleLower.includes("anos 50") ||
      configGradeLower.includes("peb") ||
      configGradeLower.includes("preto e branco") ||
      configGradeLower.includes("black and white") ||
      configGradeLower.includes("monocrom") ||
      configGradeLower.includes("anos 50") ||
      vbGradeLower.includes("peb") ||
      vbGradeLower.includes("preto e branco") ||
      vbGradeLower.includes("black and white") ||
      vbGradeLower.includes("monocrom") ||
      paramPaletteLower.includes("preto_e_branco") ||
      paramPaletteLower.includes("monocrom") ||
      paramAestheticLower.includes("preto e branco") ||
      paramAestheticLower.includes("black and white");

    if (this.hasUserColor(userPrompt)) {
      skippedDirectives.push("cor/color grade (já declarada no prompt pelo usuário)");
    } else if (isBlackAndWhite) {
      const bwDirective =
        "fotografia analógica estritamente em preto e branco clássico, escala de cinzas pura e profunda, alto contraste de cinema preto e branco com sombras pretas densas, zero cores (authentic black and white monochrome 35mm film photography, rich grayscale, deep shadows, strictly no color)";
      appliedDirectives.push(bwDirective);

      // Proibir cores no negative prompt de forma rigorosa para assegurar 100% de consistência
      const bwNegatives =
        "color, colorful, vibrant colors, saturated colors, warm skin tones, orange, yellow, blue, green, red, chromatic aberration, color accents, polychromatic, neon colors, daylight color cast, sepia, color photography";
      negativePrompt = negativePrompt
        ? `${negativePrompt}, ${bwNegatives}`
        : bwNegatives;
    } else if (colorGrade || rawPalette) {
      const gradeLower = (colorGrade || "").toLowerCase();
      let colorDirective = "";

      if (gradeLower.includes("teal") || gradeLower.includes("orange")) {
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
      }

      if (rawPalette && !isBlackAndWhite) {
        const paletteStr = Array.isArray(rawPalette) ? rawPalette.slice(0, 5).join(", ") : String(rawPalette);
        if (paletteStr && paletteStr !== colorGrade) {
          if (colorDirective) {
            colorDirective += `, paleta cromática dominante (${paletteStr})`;
          } else {
            colorDirective = `paleta de cores dominante cinematográfica (${paletteStr})`;
          }
        }
      }

      if (colorDirective) {
        appliedDirectives.push(colorDirective);
      }
    }

    // 7. Avaliação e Injeção de Gênero & Estilo Visual da Obra
    const genre = project.genre || "";
    const visualStyle = String(
      paramValuesMap["estilo_cinematografico_visual"] ||
      vb.aesthetic ||
      tech.visualAesthetic ||
      ""
    ).trim();

    if (genre && !normalizeForSearch(userPrompt).includes(normalizeForSearch(genre))) {
      appliedDirectives.push(`atmosfera cinematográfica no gênero ${genre}`);
    }

    if (visualStyle) {
      const vLower = visualStyle.toLowerCase();
      let styleText = "";
      if (vLower.includes("cyberpunk")) styleText = "estilo cyberpunk neo-noir cinematográfico hiperestilizado";
      else if (vLower.includes("fantasia")) styleText = "estilo de fantasia épica cinematográfica com rica atmosfera visual";
      else if (vLower.includes("documentario")) styleText = "estilo documentário cru, realista e autêntico";
      else if (vLower.includes("retro")) styleText = "estilo retro cinematográfico com textura de filme vintage";
      else if (vLower.includes("moody") || vLower.includes("vintage") || vLower.includes("editorial")) {
        styleText = `estética cinematográfica ${visualStyle}`;
      } else {
        styleText = `estética visual cinematográfica ${visualStyle}`;
      }
      appliedDirectives.push(styleText);
    }

    // 8. Granulação de Película e Acabamento de Cinema
    const grainLevel = Number(
      sceneConfig.filmGrain ??
      paramValuesMap["nivel_granulacao_pelicula"] ??
      config.filmGrain ??
      vb.filmGrain ??
      tech.filmGrain ??
      latestAnalysisTech.filmGrain ??
      25
    );

    let finishDirective = "";
    if (grainLevel <= 5) {
      finishDirective =
        "fotografia digital de cinema cristalina e impecável, textura ultranítida sem ruído (clean digital cinema photography, zero film grain, razor-sharp pristine image, 8k movie still)";
    } else if (grainLevel >= 70) {
      finishDirective =
        `estética analógica vintage com granulação extrema e textura crua (${grainLevel}% intense heavy analog film grain, raw 16mm/8mm film stock, heavy film noise and scanline texture, vintage VHS analog noise, gritty cinema texture, authentic analog halation)`;
    } else if (grainLevel >= 35) {
      finishDirective =
        `fotografia de filme 35mm analógico com granulação pesada e marcada (${grainLevel}% heavy 35mm analog film grain, visible film noise, gritty textured film still, pronounced grain structure, authentic film stock halation)`;
    } else {
      finishDirective =
        `fotografia de filme 35mm, visual de cinema autêntico, movie still frame, textura de grão de película analógica orgânica suave (${grainLevel}% subtle organic 35mm film grain, cinematic film stock texture)`;
    }
    appliedDirectives.push(finishDirective);

    // 9. Elementos Negativos do Projeto
    const projectNegative =
      paramValuesMap["proibir_elementos_negativos"] ||
      vb.negativePrompt ||
      tech.negativePrompt ||
      ((vb.reversePrompts as any)?.negativePrompt);

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
    let enrichedPrompt = combinedDirectives
      ? `${cleanUserPrompt}, ${combinedDirectives}`
      : cleanUserPrompt;

    // Se o projeto for Preto e Branco, colocamos o prefixo estrito logo no início do prompt
    if (isBlackAndWhite) {
      enrichedPrompt = `fotografia cinematográfica estritamente em preto e branco (authentic black and white 35mm film photography): ${enrichedPrompt}`;
    }

    return {
      enrichedPrompt,
      originalPrompt: userPrompt,
      enrichedNegativePrompt: negativePrompt || undefined,
      appliedDirectives,
      skippedDirectives,
    };
  }
}
