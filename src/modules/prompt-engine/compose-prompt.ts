import { ToolProfile } from "./tool-profiles";
import { SystemPromptTemplate } from "./prompt-template.catalog";

export interface CompositionContext {
  project: {
    id: string;
    title: string;
    description: string;
    genre: string | null;
    language: string;
    configuration?: any;
  };
  toolProfile: ToolProfile;
  template: SystemPromptTemplate;
  resolvedParameters: Record<string, any>;
  scene?: {
    id: string;
    order: number;
    title: string;
    description: string;
    durationSeconds: number | null;
    configuration: any;
    characters: Array<{ character: { id: string; name: string; description: string; attributes: any } }>;
    environments: Array<{ environment: { id: string; name: string; description: string; attributes: any } }>;
  };
  character?: {
    id: string;
    name: string;
    description: string;
    attributes: any;
  };
  environment?: {
    id: string;
    name: string;
    description: string;
    attributes: any;
  };
  customInstructions?: string;
}

export function composePromptInstructions(ctx: CompositionContext): {
  systemInstruction: string;
  userPrompt: string;
} {
  const { project, toolProfile, template, resolvedParameters, scene, character, environment, customInstructions } = ctx;

  const systemInstruction = [
    template.systemInstructions,
    "",
    "### REGRAS OBRIGATÓRIAS DO SISTEMA:",
    "1. Responda ESTRITAMENTE com um objeto JSON válido, sem cercas de markdown (sem ```json), sem texto preliminar ou comentários.",
    "2. O JSON DEVE obedecer com total rigor ao schema versionado v1.0 especificado para este template.",
    "3. Nunca invente personagens ou locações não fornecidos no contexto.",
    "4. Separe com total rigidez atributos permanentes (identidade visual, feições físicas, arquitetura) de ações ou estados momentâneos.",
    `5. O idioma de saída para textos e diálogos deve ser: ${project.language} (Português do Brasil por padrão).`,
    `6. Otimize a estrutura especificamente para a ferramenta de destino: ${toolProfile.name}.`,
    ...toolProfile.promptFormattingRules.map((rule) => `   - ${rule}`),
  ].join("\n");

  const promptSections: string[] = [];

  // 1. Dados do Projeto
  promptSections.push(
    `### PROJETO AUDIOVISUAL:
- Título: "${project.title}"
- Sinopse / Conceito: ${project.description || "Não informada"}
- Gênero: ${project.genre || "Geral"}
- Idioma da Obra: ${project.language}
- Plataforma / Ferramenta Destino: ${toolProfile.name} (${toolProfile.description})`
  );

  // 2. Parâmetros Dinâmicos Resolvidos
  if (Object.keys(resolvedParameters).length > 0) {
    promptSections.push(
      `### PARÂMETROS DINÂMICOS RESOLVIDOS DO CONTEXTO:
${JSON.stringify(resolvedParameters, null, 2)}`
    );
  }

  // 3. Contexto da Cena (se aplicável)
  if (scene) {
    const config = scene.configuration || {};
    promptSections.push(
      `### DETALHES DA CENA #${scene.order} - "${scene.title}":
- Descrição da Tomada: ${scene.description || "Não especificada"}
- Duração Desejada (Planejamento): ${scene.durationSeconds ? `${scene.durationSeconds} segundos` : "Livre"}
- Ação Principal: ${config.mainAction || "Ação não declarada"}
- Estado Inicial: ${config.initialState || "Não declarado"}
- Estado Final: ${config.finalState || "Não declarado"}
- Enquadramento / Câmera: ${config.framing || "Plano Médio"} | Movimento: ${config.cameraMovement || "Estática"}
- Iluminação da Cena: ${config.lighting || "Ambiente natural"}
- Profundidade / Foco: ${config.focusDepth || "Padrão"}
- Transições: Entrada (${config.transitionIn || "Corte"}) / Saída (${config.transitionOut || "Corte"})
- Som Ambiente: ${config.ambientSound || "Nenhum"}
- Diálogo: ${config.dialogue?.enabled ? `Ativo (${config.dialogue.language || "pt-BR"}): "${config.dialogue.lines || ""}"` : "Desativado (Cena sem falas)"}
- Música: ${config.music?.enabled ? `Ativa: "${config.music.description || ""}"` : "Desativada (Sem trilha)"}
- Restrições da Cena: ${config.restrictions || "Nenhuma restrição específica"}

Personagens em Cena:
${scene.characters.map((c) => `- ${c.character.name}: ${c.character.description || ""} (Identidade visual: ${c.character.attributes?.visualIdentity || "Padrão"})`).join("\n") || "Nenhum"}

Ambiente da Cena:
${scene.environments.map((e) => `- ${e.environment.name}: ${e.environment.description || ""} (Arquitetura: ${e.environment.attributes?.architecture || "Padrão"})`).join("\n") || "Nenhum"}`
    );
  }

  // 4. Contexto do Personagem (se aplicável)
  if (character) {
    const attrs = character.attributes || {};
    promptSections.push(
      `### PERFIL DO PERSONAGEM EM FOCO:
- Nome: "${character.name}"
- Descrição: ${character.description || ""}
- Idade Aparente: ${attrs.apparentAge || "Não especificada"}
- Identidade Visual: ${attrs.visualIdentity || "Não informada"}
- Traços Físicos: ${attrs.physicalCharacteristics || "Não informados"}
- Cabelo e Rosto: ${attrs.hairAndFace || "Não informados"}
- Figurino Mestre: ${attrs.costumeAndAccessories || "Não informado"}
- Expressão / Comportamento: ${attrs.personalityAndBehavior || "Não informado"}
- Restrições de Representação: ${attrs.restrictions || "Nenhuma"}
- Prompt Base Existente: ${attrs.basePrompt || "Nenhum"}`
    );
  }

  // 5. Contexto do Ambiente (se aplicável)
  if (environment) {
    const attrs = environment.attributes || {};
    promptSections.push(
      `### PERFIL DO AMBIENTE EM FOCO:
- Nome: "${environment.name}"
- Descrição: ${environment.description || ""}
- Localização / Contexto: ${attrs.locationContext || "Não informada"}
- Arquitetura: ${attrs.architecture || "Não informada"}
- Elementos / Props: ${attrs.propsAndElements || "Não informados"}
- Iluminação Mestra: ${attrs.lighting || "Não informada"}
- Paleta de Cores: ${attrs.colorPalette || "Não informada"}
- Atmosfera / Clima: ${attrs.weatherAndAtmosphere || "Não informada"}
- Estilo / Época: ${attrs.historicalEra || ""} | ${attrs.visualStyle || ""}`
    );
  }

  // 6. Instruções Customizadas do Usuário
  if (customInstructions && customInstructions.trim()) {
    promptSections.push(
      `### DIRETRIZES ESPECÍFICAS ADICIONADAS PELO DIRETOR:
"${customInstructions.trim()}"`
    );
  }

  // 7. Contrato Estrutural Obrigatório do JSON
  const skeleton = getTemplateJsonSkeleton(
    template.key,
    project,
    toolProfile,
    scene,
    character,
    environment
  );

  promptSections.push(
    `### ESTRUTURA JSON CONTRATUAL OBRIGATÓRIA:
O seu retorno DEVE ser um objeto JSON puro e válido que siga ESTRITAMENTE a estrutura abaixo (preencha todas estas chaves exatamente com estes nomes):
${JSON.stringify(skeleton, null, 2)}`
  );

  // 8. Chamada de Fechamento
  promptSections.push(
    `### INSTRUÇÃO FINAL:
Gere agora o objeto JSON completo correspondente ao template "${template.name}" (${template.key}), preenchendo todos os campos do schema estrutural acima com especificações cinematográficas profissionais, filmáveis e contextualizadas.
NÃO inclua markdown (como \`\`\`json). Devolva apenas o JSON puro.`
  );

  return {
    systemInstruction,
    userPrompt: promptSections.join("\n\n"),
  };
}

function getTemplateJsonSkeleton(
  templateKey: string,
  project: { id: string; title: string },
  toolProfile: ToolProfile,
  scene?: { id: string; title: string; order: number },
  character?: { id: string; name: string },
  environment?: { id: string; name: string }
): Record<string, any> {
  switch (templateKey) {
    case "visual_bible":
      return {
        schemaVersion: "1.0",
        type: "visual_bible",
        projectId: project.id,
        title: project.title,
        logline: "Síntese dramática em uma frase impactante",
        visualIdentity: "Diretrizes estéticas mestras do projeto",
        colorPalette: {
          primary: ["Paleta primária", "Cor secundária", "Tom de realce"],
          mood: "Atmosfera e psicologia das cores",
        },
        cinematographyPhilosophy: {
          lenses: "Conjunto de lentes preferencial e profundidade de campo",
          framingPreference: "Enquadramentos predominantes",
          cameraMotion: "Filosofia e velocidade de movimento de câmera",
        },
        lightingDesign: {
          masterSetup: "Configuração de iluminação base da produção",
          contrastStyle: "Estilo de contraste e razão de sombras",
        },
        textureAndAtmosphere: "Grão, textura analógica/digital, névoa e partículas",
        continuityRules: ["Regra 1 de continuidade visual", "Regra 2"],
        globalNegativePrompts: ["Termos proibidos globalmente para manter a consistência"],
      };

    case "character_definition":
      return {
        schemaVersion: "1.0",
        type: "character_definition",
        characterId: character?.id || "id_personagem",
        name: character?.name || "Nome do Personagem",
        visualIdentity: "Identidade visual icônica e permanente",
        physicalAttributes: {
          age: "Idade aparente",
          bodyType: "Biótipo físico e postura",
          facialFeatures: "Traços faciais distintivos",
          hair: "Corte, cor e textura do cabelo",
        },
        permanentWardrobe: "Figurino mestre permanente e acessórios",
        behaviorAndExpression: "Linguagem corporal e expressão facial típica",
        representationRestrictions: ["O que nunca deve mudar ou aparecer neste personagem"],
        compiledBasePrompt: "Prompt-base compilado conciso e descritivo para motores de imagem/vídeo",
        negativePrompt: ["Termos negativos para evitar mutações de feições e figurino"],
      };

    case "environment_definition":
      return {
        schemaVersion: "1.0",
        type: "environment_definition",
        environmentId: environment?.id || "id_ambiente",
        name: environment?.name || "Nome do Ambiente",
        locationContext: "Localização geográfica e contexto narrativo",
        architecture: "Estilo arquitetônico e materiais predominantes",
        spatialLayoutAndProps: "Distribuição espacial, profundidade e objetos de cena",
        lightingScheme: "Esquema de iluminação natural e artificial",
        colorGrading: "Graduação de cor e temperatura",
        atmosphereAndWeather: "Clima, partículas e densidade do ar",
        eraAndStyle: "Época histórica e estilo visual",
        compiledBasePrompt: "Prompt-base compilado definitivo de plano de estabelecimento (establishing shot)",
        negativePrompt: ["Elementos modernos ou anacrônicos proibidos no cenário"],
      };

    case "image_prompt":
      return {
        schemaVersion: "1.0",
        type: "image_prompt",
        targetTool: toolProfile.name,
        title: "Título descritivo da imagem",
        aspectRatio: "16:9",
        promptText: "Prompt positivo de altíssima fidelidade cinematográfica",
        negativePromptText: "Prompt negativo para evitar artefatos e aberrações visuais",
        cinematography: {
          shotType: "Enquadramento (ex: Grande Plano Geral, Plano Médio, Close-up)",
          lens: "Especificações óticas (distância focal, abertura, aberração cromática)",
          lighting: "Esquema e direção da iluminação",
        },
        artisticStyle: "Estilo estético e formato de renderização/película",
        compositionDetails: "Regra dos terços, pontos de fuga e linhas de condução",
      };

    case "video_prompt":
      return {
        schemaVersion: "1.0",
        type: "video_prompt",
        targetTool: toolProfile.name,
        sceneId: scene?.id || "id_cena",
        narrativeObjective: "Objetivo dramático e narrativo da tomada cinematográfica",
        characterReferences: ["Nomes dos personagens presentes em cena"],
        environmentReferences: ["Nomes das locações presentes"],
        action: "Descrição detalhada e contínua da ação física executada",
        visualComposition: "Enquadramento, profundidade de campo e disposição espacial dos elementos",
        camera: {
          framing: "Enquadramento inicial e evolução",
          movement: "Movimento específico de câmera contínuo ao longo do tempo",
          lens: "Lente, profundidade de campo e abertura",
        },
        movement: "Dinâmica e velocidade de movimentação em cena",
        lighting: "Esquema de iluminação, contraste e sombras",
        style: "Estilo visual cinematográfico, granulação e textura",
        sound: {
          ambience: "Sons e ruídos ambientes ou N/A",
          dialogue: "Falas de diálogo ou N/A",
          music: "Diretrizes de trilha sonora ou N/A",
        },
        restrictions: ["O que NÃO deve aparecer nesta tomada"],
        continuityInstructions: ["Instruções para preservar continuidade com tomadas anteriores e seguintes"],
        compiledPromptText: "Prompt de produção cinematográfico final completo pronto para o modelo de vídeo",
        compiledNegativePrompt: "Termos negativos para evitar mutações e deformações",
      };

    case "scene_sequence":
      return {
        schemaVersion: "1.0",
        type: "scene_sequence",
        projectId: project.id,
        sequenceTitle: "Título da sequência",
        targetTool: toolProfile.name,
        narrativePacing: "Ritmo e velocidade de montagem",
        scenes: [
          {
            sceneId: scene?.id || "id_cena",
            order: 1,
            title: "Título da tomada",
            durationSeconds: 5,
            shotPrompt: "Prompt da tomada",
            transition: "Corte Direto",
            continuityNotes: "Notas de continuidade",
          },
        ],
        globalAtmosphere: "Atmosfera unificada da sequência",
      };

    case "individual_scene":
      return {
        schemaVersion: "1.0",
        type: "individual_scene",
        sceneId: scene?.id || "id_cena",
        order: scene?.order || 1,
        title: scene?.title || "Título da Cena",
        targetTool: toolProfile.name,
        productionBreakdown: {
          charactersPresent: ["Personagens presentes"],
          location: "Locação da cena",
          durationEstimate: "5s",
        },
        visualDirectives: {
          mainAction: "Ação principal em cena",
          initialState: "Estado inicial",
          finalState: "Estado final esperado",
          framing: "Enquadramento",
          cameraMotion: "Movimento de câmera",
          lighting: "Iluminação",
        },
        audioDirectives: {
          dialogueText: "Falas ou N/A",
          ambience: "Ambiente sonoro",
          music: "Música",
        },
        compiledProductionPrompt: "Prompt de produção compilado",
        negativePrompt: ["Termos negativos"],
      };

    default:
      return {};
  }
}
