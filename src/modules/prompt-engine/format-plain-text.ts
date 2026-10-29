import { PromptEngineOutput, TemplateKey } from "./prompt-engine.schema";

/**
 * Converte qualquer saída estruturada do Prompt Engine em um texto plano / markdown cinematográfico,
 * pronto para leitura humana ou para copiar e colar diretamente em geradores visuais (Midjourney, Runway, Sora, etc.).
 *
 * Suporta assinatura polimórfica: formatPromptToPlainText(data, templateKey) ou formatPromptToPlainText(templateKey, data).
 */
export function formatPromptToPlainText(arg1: any, arg2?: any): string {
  let data: any;
  let templateKey: string;

  if (typeof arg1 === "string") {
    templateKey = arg1;
    data = arg2;
  } else if (typeof arg2 === "string") {
    templateKey = arg2;
    data = arg1;
  } else {
    data = arg1;
    templateKey = (data?.type as string) || "video_prompt";
  }

  if (!data) return "";
  const anyData = data as any;

  switch (templateKey) {
    case "video_prompt": {
      const parts: string[] = [];
      parts.push(`🎬 PROMPT DE VÍDEO CINEMATOGRÁFICO`);
      if (anyData.sceneIdentifier) parts.push(`📌 Identificador: ${anyData.sceneIdentifier}`);
      if (anyData.targetTool) parts.push(`🎯 Ferramenta Alvo: ${String(anyData.targetTool).toUpperCase()}`);
      if (anyData.narrativeObjective) parts.push(`📖 Objetivo Narrativo: ${anyData.narrativeObjective}`);
      parts.push("--------------------------------------------------");

      const mainPrompt =
        anyData.compiledPromptText ||
        anyData.compiledProductionPrompt ||
        anyData.promptText;
      if (mainPrompt) {
        parts.push(`PROMPT DE PRODUÇÃO COMPILADO:\n${mainPrompt}`);
      }

      if (anyData.action) parts.push(`\n▶️ AÇÃO:\n${anyData.action}`);

      const cam = anyData.camera;
      if (cam) {
        const camStr =
          typeof cam === "string"
            ? cam
            : `Enquadramento: ${cam.framing || "N/A"} | Movimento: ${cam.movement || "N/A"} | Lente: ${cam.lens || "N/A"}`;
        parts.push(`\n🎥 CÂMERA & ÓPTICA:\n${camStr}`);
      }

      if (anyData.lighting) parts.push(`\n💡 ILUMINAÇÃO:\n${anyData.lighting}`);
      if (anyData.style) parts.push(`\n🎨 ESTILO VISUAL:\n${anyData.style}`);

      const snd = anyData.sound;
      if (snd) {
        const sndStr =
          typeof snd === "string"
            ? snd
            : `Ambiência: ${snd.ambience || "N/A"} | Diálogo: ${snd.dialogue || "N/A"} | Música: ${snd.music || "N/A"}`;
        parts.push(`\n🎧 ÁUDIO & SOM:\n${sndStr}`);
      }

      const neg = anyData.compiledNegativePrompt || anyData.negativePrompt;
      if (neg) {
        const negStr = Array.isArray(neg) ? neg.join(", ") : String(neg);
        parts.push(`\n🚫 PROMPT NEGATIVO (Restrições):\n${negStr}`);
      }

      return parts.join("\n");
    }

    case "individual_scene": {
      const parts: string[] = [];
      parts.push(`🎥 CENA INDIVIDUAL #${anyData.order || 1}: ${anyData.title || anyData.sceneTitle || "Sem Título"}`);
      if (anyData.narrativeFunction) parts.push(`📖 Função Narrativa: ${anyData.narrativeFunction}`);
      parts.push("--------------------------------------------------");

      const mainPrompt =
        anyData.compiledProductionPrompt ||
        anyData.compiledPromptText ||
        anyData.promptText;
      if (mainPrompt) {
        parts.push(`PROMPT CONSOLIDADO DE PRODUÇÃO:\n${mainPrompt}\n`);
      }

      if (anyData.productionBreakdown) {
        const pb = anyData.productionBreakdown;
        parts.push(
          `📋 PRODUÇÃO:\n- Personagens: ${(pb.charactersPresent || []).join(", ") || "Nenhum"}\n- Locação: ${pb.location || "N/A"}\n- Duração Estimada: ${pb.durationEstimate || "N/A"}`
        );
      }

      if (anyData.visualDirectives) {
        const vd = anyData.visualDirectives;
        parts.push(
          `\n🎬 DIRETRIZES VISUAIS:\n- Ação Principal: ${vd.mainAction || "N/A"}\n- Enquadramento: ${vd.framing || "N/A"}\n- Movimento de Câmera: ${vd.cameraMotion || "N/A"}\n- Iluminação: ${vd.lighting || "N/A"}`
        );
      }

      if (anyData.audioDirectives) {
        const ad = anyData.audioDirectives;
        parts.push(
          `\n🎧 ÁUDIO:\n- Falas / Diálogo: ${ad.dialogueText || "Sem diálogo"}\n- Ambiência: ${ad.ambience || "N/A"}\n- Trilha Sonora: ${ad.music || "N/A"}`
        );
      }

      if (anyData.negativePrompt && anyData.negativePrompt.length > 0) {
        parts.push(`\n🚫 ELEMENTOS PROIBIDOS:\n${anyData.negativePrompt.join(", ")}`);
      }

      return parts.join("\n");
    }

    case "character_definition": {
      const parts: string[] = [];
      parts.push(`👤 DEFINIÇÃO CINEMATOGRÁFICA DE PERSONAGEM: ${anyData.name || "Sem Nome"}`);
      parts.push("--------------------------------------------------");

      const basePrompt =
        anyData.compiledBasePrompt ||
        anyData.compiledPromptText ||
        anyData.promptText;
      if (basePrompt) {
        parts.push(`PROMPT BASE DO PERSONAGEM:\n${basePrompt}\n`);
      }

      if (anyData.visualIdentity) parts.push(`✨ Identidade Visual: ${anyData.visualIdentity}`);

      if (anyData.physicalAttributes) {
        const pa = anyData.physicalAttributes;
        parts.push(
          `🧬 Fisiologia:\n- Idade Aparente: ${pa.age || "N/A"}\n- Estrutura Corporal: ${pa.bodyType || "N/A"}\n- Rosto & Expressão: ${pa.facialFeatures || "N/A"}\n- Cabelo: ${pa.hair || "N/A"}`
        );
      }

      if (anyData.permanentWardrobe) parts.push(`👔 Figurino Permanente: ${anyData.permanentWardrobe}`);
      if (anyData.behaviorAndExpression) parts.push(`🎭 Comportamento & Atuação: ${anyData.behaviorAndExpression}`);

      if (anyData.negativePrompt && anyData.negativePrompt.length > 0) {
        parts.push(`\n🚫 Restrições de Representação:\n${anyData.negativePrompt.join(", ")}`);
      }

      return parts.join("\n");
    }

    case "environment_definition": {
      const parts: string[] = [];
      parts.push(`🏙️ DEFINIÇÃO DE AMBIENTE / LOCAÇÃO: ${anyData.name || "Sem Nome"}`);
      parts.push("--------------------------------------------------");

      const basePrompt =
        anyData.compiledBasePrompt ||
        anyData.compiledPromptText ||
        anyData.promptText;
      if (basePrompt) {
        parts.push(`PROMPT BASE DA LOCAÇÃO:\n${basePrompt}\n`);
      }

      if (anyData.locationContext) parts.push(`📍 Contexto da Locação: ${anyData.locationContext}`);
      if (anyData.architecture) parts.push(`🏛️ Arquitetura & Materiais: ${anyData.architecture}`);
      if (anyData.spatialLayoutAndProps) parts.push(`📦 Objetos de Cena & Espaço: ${anyData.spatialLayoutAndProps}`);
      if (anyData.lightingScheme) parts.push(`💡 Esquema de Iluminação: ${anyData.lightingScheme}`);
      if (anyData.colorGrading) parts.push(`🎨 Color Grading & Paleta: ${anyData.colorGrading}`);
      if (anyData.atmosphereAndWeather) parts.push(`🌫️ Clima & Atmosfera: ${anyData.atmosphereAndWeather}`);

      if (anyData.negativePrompt && anyData.negativePrompt.length > 0) {
        parts.push(`\n🚫 Elementos Proibidos no Cenário:\n${anyData.negativePrompt.join(", ")}`);
      }

      return parts.join("\n");
    }

    case "image_prompt": {
      const parts: string[] = [];
      parts.push(`🖼️ PROMPT DE IMAGEM ESTÁTICA / KEYFRAME: ${anyData.title || ""}`);
      parts.push(`Proporção: ${anyData.aspectRatio || "16:9"} | Ferramenta: ${anyData.targetTool || "Geral"}`);
      parts.push("--------------------------------------------------");

      const promptText =
        anyData.promptText ||
        anyData.compiledPromptText ||
        anyData.compiledProductionPrompt;
      if (promptText) {
        parts.push(`PROMPT COMPILADO:\n${promptText}\n`);
      }

      const negPrompt = anyData.negativePromptText || anyData.negativePrompt;
      if (negPrompt) {
        const negStr = Array.isArray(negPrompt) ? negPrompt.join(", ") : String(negPrompt);
        parts.push(`PROMPT NEGATIVO:\n${negStr}\n`);
      }

      if (anyData.subject) parts.push(`Assunto: ${anyData.subject}`);
      if (anyData.framing) parts.push(`Enquadramento: ${anyData.framing}`);
      if (anyData.composition) parts.push(`Composição: ${anyData.composition}`);
      if (anyData.lighting) parts.push(`Iluminação: ${anyData.lighting}`);
      if (anyData.style) parts.push(`Estilo: ${anyData.style}`);

      if (anyData.cinematography) {
        const c = anyData.cinematography;
        parts.push(`FOTOGRAFIA: Plano: ${c.shotType || "N/A"} | Lente: ${c.lens || "N/A"} | Luz: ${c.lighting || "N/A"}`);
      }

      if (anyData.artisticStyle) parts.push(`Estilo Artístico: ${anyData.artisticStyle}`);
      if (anyData.compositionDetails) parts.push(`Composição: ${anyData.compositionDetails}`);

      return parts.join("\n");
    }

    case "scene_sequence": {
      const parts: string[] = [];
      parts.push(`🎞️ SEQUÊNCIA DE CENAS: ${anyData.sequenceTitle || "Linha do Tempo"}`);
      if (anyData.narrativePacing) parts.push(`Ritmo Narrativo: ${anyData.narrativePacing}`);
      if (anyData.globalAtmosphere) parts.push(`Atmosfera Global: ${anyData.globalAtmosphere}`);
      parts.push("==================================================");

      const scenes = anyData.scenes || [];
      scenes.forEach((s: any, idx: number) => {
        parts.push(`\nCENA #${s.order || idx + 1}: ${s.title || "Tomada"}`);
        if (s.durationSeconds) parts.push(`Duração: ${s.durationSeconds}s`);
        if (s.shotPrompt) parts.push(`Prompt da Tomada:\n${s.shotPrompt}`);
        if (s.transition) parts.push(`Transição: ${s.transition}`);
        if (s.continuityNotes) parts.push(`Continuidade: ${s.continuityNotes}`);
        parts.push("--------------------------------------------------");
      });

      return parts.join("\n");
    }

    case "visual_bible": {
      const parts: string[] = [];
      parts.push(`📖 BÍBLIA VISUAL DO PROJETO: ${anyData.title || ""}`);
      if (anyData.logline) parts.push(`Logline: ${anyData.logline}`);
      if (anyData.visualIdentity) parts.push(`Identidade Visual: ${anyData.visualIdentity}`);
      parts.push("--------------------------------------------------");

      if (anyData.cinematographyPhilosophy) {
        const cp = anyData.cinematographyPhilosophy;
        parts.push(`DIREÇÃO DE FOTOGRAFIA:\n- Lentes: ${cp.lenses || "N/A"}\n- Enquadramentos: ${cp.framingPreference || "N/A"}\n- Movimento: ${cp.cameraMotion || "N/A"}`);
      }

      if (anyData.lightingDesign) {
        const ld = anyData.lightingDesign;
        parts.push(`\nILUMINAÇÃO:\n- Setup Principal: ${ld.masterSetup || "N/A"}\n- Contraste: ${ld.contrastStyle || "N/A"}`);
      }

      if (anyData.colorPalette) {
        const cp = anyData.colorPalette;
        const primaryStr = Array.isArray(cp.primary)
          ? cp.primary.join(", ")
          : typeof cp.primary === "string"
          ? cp.primary
          : "N/A";
        parts.push(`\nPALETA DE CORES:\n- Primárias: ${primaryStr || "N/A"}\n- Mood: ${cp.mood || "N/A"}`);
      }

      if (anyData.textureAndAtmosphere) parts.push(`\nTextura & Atmosfera: ${anyData.textureAndAtmosphere}`);

      if (anyData.continuityRules) {
        const rulesList = Array.isArray(anyData.continuityRules)
          ? anyData.continuityRules
          : [String(anyData.continuityRules)];
        if (rulesList.length > 0) {
          parts.push(`\nREGRAS DE CONTINUIDADE:\n${rulesList.map((r: string) => `- ${r}`).join("\n")}`);
        }
      }

      if (anyData.globalNegativePrompts) {
        const negs = Array.isArray(anyData.globalNegativePrompts)
          ? anyData.globalNegativePrompts.join(", ")
          : String(anyData.globalNegativePrompts);
        if (negs) {
          parts.push(`\nELEMENTOS NEGATIVOS GLOBAIS:\n${negs}`);
        }
      }

      return parts.join("\n");
    }

    default:
      return JSON.stringify(data, null, 2);
  }
}
