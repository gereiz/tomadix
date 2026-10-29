import { db } from "@/lib/db";
import { Prisma, ParameterType, ParameterScope } from "@prisma/client";
import { ParameterService } from "@/modules/parameters/parameter.service";
import { ParameterResolver, TargetContext } from "@/modules/parameters/parameter-resolver.service";
import {
  ProjectCinematicCategory,
  ProjectCinematicCategoryKey,
  ProjectParameterSettingsData,
  ProjectCategoryWithParameters,
  UpdateProjectParameterSettingsInput,
  ProjectParameterOption,
  ProjectConfigurableParameter,
} from "./project-parameter-config.types";
import { VISUAL_REFERENCE_OPTIONS } from "@/modules/visual-library/visual-reference.catalog";

export const CINEMATIC_CATEGORIES: ProjectCinematicCategory[] = [
  {
    id: "CAMERA",
    name: "Câmera & Sensor",
    icon: "🎥",
    description: "Formato do sensor ótico, ponto de vista, proporção de aspecto e elevação.",
    order: 1,
    parameterKeys: ["formato_sensor_camera", "angulo_camera_posicao", "proporcao_tela_aspect_ratio"],
  },
  {
    id: "LENS",
    name: "Lentes & Óptica",
    icon: "🔍",
    description: "Distância focal, profundidade de campo, compressão de planos e desfoque óptico.",
    order: 2,
    parameterKeys: ["distancia_focal_lente", "profundidade_campo_foco"],
  },
  {
    id: "FRAMING",
    name: "Enquadramento & Composição",
    icon: "📐",
    description: "Escala do plano, proporção do personagem e linhas de força no quadro.",
    order: 3,
    parameterKeys: ["tipo_de_plano", "composicao_quadro"],
  },
  {
    id: "MOVEMENT",
    name: "Movimento & Maquinária",
    icon: "🎬",
    description: "Dinâmica e trajetória da câmera (dolly, handheld, drone, estática) e obturador.",
    order: 4,
    parameterKeys: ["movimento_camera", "velocidade_obturador_movimento"],
  },
  {
    id: "LIGHTING",
    name: "Iluminação Cinematográfica",
    icon: "💡",
    description: "Direcionamento, contraste de luz (chiaroscuro, rim light) e temperatura cromática.",
    order: 5,
    parameterKeys: ["estilo_iluminacao", "temperatura_cor_iluminacao"],
  },
  {
    id: "AESTHETICS",
    name: "Estética & Visual Style",
    icon: "🎨",
    description: "Color grading, emulsão analógica, granulação de película e paleta de cores dominante.",
    order: 6,
    parameterKeys: ["estilo_cinematografico_visual", "nivel_granulacao_pelicula", "paleta_cor_dominante"],
  },
  {
    id: "ART_ATMOSPHERE",
    name: "Arte, Cenografia & Atmosfera",
    icon: "🏙️",
    description: "Condições climáticas, partículas em suspensão, haze e texturas de cenografia.",
    order: 7,
    parameterKeys: ["atmosfera_climatica_particulas", "textura_cenario_arquitetura"],
  },
  {
    id: "AUDIO",
    name: "Áudio & Sound Design",
    icon: "🎧",
    description: "Ambiência sonora, perfil acústico e tratamento dramático de vozes/diálogos.",
    order: 8,
    parameterKeys: ["ambience_sound_profile", "diretrizes_dialogo_voz"],
  },
  {
    id: "CONTINUITY",
    name: "Continuidade & Consistência",
    icon: "🛡️",
    description: "Regras de consistência de personagens, iluminação contínua e exclusão de anomalias.",
    order: 9,
    parameterKeys: ["consistencia_rosto_figurino", "consistencia_iluminacao_cena", "proibir_elementos_negativos"],
  },
];

interface CinematicParamSeed {
  key: string;
  category: ProjectCinematicCategoryKey;
  label: string;
  description: string;
  type: ParameterType;
  scope: ParameterScope;
  required: boolean;
  defaultValue: unknown;
  order: number;
  options?: Array<{ value: string; label: string; description?: string }>;
  promptMapping?: { target: string; instruction: string };
}

export const CINEMATIC_PARAM_DEFINITIONS: CinematicParamSeed[] = [
  // 1. CAMERA
  {
    key: "formato_sensor_camera",
    category: "CAMERA",
    label: "Formato do Sensor / Câmera",
    description: "Emula a profundidade de campo e campo de visão do sensor ótico cinematográfico.",
    type: "SELECT",
    scope: "GLOBAL",
    required: true,
    defaultValue: "full_frame_35mm",
    order: 1,
    options: [
      { value: "full_frame_35mm", label: "Full Frame 35mm (Padrão Cinema)", description: "Profundidade de campo natural e textura equilibrada." },
      { value: "anamorfico_65mm", label: "Anamórfico 65mm (Épico / Scope)", description: "Visual panorâmico com flares horizontais característicos." },
      { value: "super_35", label: "Super 35mm (Cinematografia Clássica)", description: "Padrão clássico de Hollywood com foco preciso." },
      { value: "imax_70mm", label: "IMAX 70mm (Altíssima Definição)", description: "Nitidez monumental e imersão espacial máxima." },
      { value: "vintage_16mm", label: "16mm Vintage / Analógico", description: "Granulação orgânica visível e visual independente autêntico." },
    ],
    promptMapping: { target: "camera", instruction: "Especificar ótica e sensor da câmera de captura." },
  },
  {
    key: "angulo_camera_posicao",
    category: "CAMERA",
    label: "Ângulo & Ponto de Vista da Câmera",
    description: "Posicionamento angular vertical da lente em relação ao sujeito dramático.",
    type: "SELECT",
    scope: "SCENE",
    required: false,
    defaultValue: "nivel_olhos",
    order: 2,
    options: [
      { value: "nivel_olhos", label: "Nível dos Olhos (Eye-Level Neutro)", description: "Conexão direta e neutra com o espectador." },
      { value: "contra_plongee", label: "Contra-Plongée / Baixo para Cima (Low Angle)", description: "Confere autoridade, imponência ou sensação de grandeza." },
      { value: "plongee", label: "Plongée / Alto para Baixo (High Angle)", description: "Enfatiza vulnerabilidade, isolamento ou visão contemplativa." },
      { value: "zenital_top_down", label: "Zenital / Top-Down (Bird's Eye View)", description: "Visão geométrica perpendicular do topo." },
      { value: "ponto_de_vista_pov", label: "Ponto de Vista Subjetivo (First Person POV)", description: "O espectador enxerga diretamente pelos olhos do protagonista." },
    ],
    promptMapping: { target: "camera", instruction: "Definir o ângulo de visão e perspectiva de captura." },
  },
  {
    key: "proporcao_tela_aspect_ratio",
    category: "CAMERA",
    label: "Proporção de Tela (Aspect Ratio)",
    description: "Relação dimensional entre largura e altura da composição final.",
    type: "SELECT",
    scope: "OUTPUT",
    required: true,
    defaultValue: "16_9",
    order: 3,
    options: [
      { value: "16_9", label: "16:9 (Widescreen Televisivo / Digital)" },
      { value: "2_39_1", label: "2.39:1 (Cinemascope Panavision / Telona)" },
      { value: "4_3", label: "4:3 (Academy Ratio Clássico / Vintage)" },
      { value: "9_16", label: "9:16 (Vertical Mobile / Reels & Stories)" },
      { value: "1_1", label: "1:1 (Quadrado Contemporâneo)" },
    ],
    promptMapping: { target: "aspect_ratio", instruction: "Compor no formato de proporção indicado." },
  },

  // 2. LENS
  {
    key: "distancia_focal_lente",
    category: "LENS",
    label: "Distância Focal da Lente",
    description: "Milimetragem da lente cinematográfica e compressão de planos espaciais.",
    type: "SELECT",
    scope: "SCENE",
    required: false,
    defaultValue: "50mm_normal",
    order: 4,
    options: [
      { value: "24mm_grande_angular", label: "24mm Grande Angular (Ambiente Amplo / Perspectiva Acentuada)" },
      { value: "35mm_narrativa", label: "35mm Padrão Narrativo (Cinematografia Naturalista)" },
      { value: "50mm_normal", label: "50mm Lente Normal (Perspectiva Similar ao Olho Humano)" },
      { value: "85mm_teleobjetiva", label: "85mm Teleobjetiva Curta (Retrato Perfeito e Fundo Desfocado)" },
      { value: "135mm_tele_longa", label: "135mm Teleobjetiva Longa (Compressão Espacial Intensa)" },
    ],
    promptMapping: { target: "lens", instruction: "Aplicar a distância focal na geometria da imagem." },
  },
  {
    key: "profundidade_campo_foco",
    category: "LENS",
    label: "Profundidade de Campo & Foco",
    description: "Grau de separação entre o sujeito nítido e o plano de fundo.",
    type: "SELECT",
    scope: "SCENE",
    required: false,
    defaultValue: "foco_raso_bokeh",
    order: 5,
    options: [
      { value: "foco_raso_bokeh", label: "Profundidade Rasa (Shallow DOF com Bokeh Cremoso)" },
      { value: "foco_profundo_deep", label: "Foco Profundo (Deep Focus estilo Cidadão Kane)" },
      { value: "rack_focus", label: "Transição de Foco (Rack Focus Primeiro Plano / Fundo)" },
    ],
    promptMapping: { target: "lens", instruction: "Controlar abertura de diafragma e desfoque de fundo." },
  },

  // 3. FRAMING
  {
    key: "tipo_de_plano",
    category: "FRAMING",
    label: "Tipo de Enquadramento / Escala de Plano",
    description: "Distância aparente da câmera em relação ao sujeito em cena.",
    type: "SELECT",
    scope: "SCENE",
    required: true,
    defaultValue: "plano_medio",
    order: 6,
    options: [
      { value: "extreme_close_up", label: "Plano Detalhe / Extreme Close-Up (Olhos, Mãos, Objeto)" },
      { value: "close_up", label: "Primeiro Plano / Close-Up Intenso (Expressão Facial)" },
      { value: "plano_medio", label: "Plano Médio (Cintura para Cima / Diálogo)" },
      { value: "plano_americano", label: "Plano Americano (Joelhos para Cima / Western)" },
      { value: "plano_geral", label: "Plano Geral / Wide Shot Estabelecedor" },
      { value: "extreme_wide", label: "Plano Muito Aberto / Paisagem Épica" },
    ],
    promptMapping: { target: "framing", instruction: "Enquadrar o sujeito na escala exata solicitada." },
  },
  {
    key: "composicao_quadro",
    category: "FRAMING",
    label: "Geometria & Composição do Quadro",
    description: "Distribuição harmoniosa dos pesos visuais dentro do fotograma.",
    type: "SELECT",
    scope: "SCENE",
    required: false,
    defaultValue: "regra_dos_tercos",
    order: 7,
    options: [
      { value: "regra_dos_tercos", label: "Regra dos Terços (Interseções Áureas)" },
      { value: "simetria_central", label: "Simetria Central (Equilíbrio Wes Anderson / Kubrick)" },
      { value: "linhas_guia_convergentes", label: "Linhas Guia Convergentes (Ponto de Fuga Profundo)" },
      { value: "enquadramento_interno", label: "Quadro Dentro de Quadro (Janelas, Portas, Arcos)" },
    ],
    promptMapping: { target: "composition", instruction: "Organizar linhas e pontos de interesse conforme a geometria." },
  },

  // 4. MOVEMENT
  {
    key: "movimento_camera",
    category: "MOVEMENT",
    label: "Movimento de Câmera & Maquinária",
    description: "Trajetória espacial e ritmo do movimento de captura durante a tomada.",
    type: "SELECT",
    scope: "SCENE",
    required: false,
    defaultValue: "estatica",
    order: 8,
    options: [
      { value: "estatica", label: "Câmera Estática / Tripé Firme" },
      { value: "pan_suave", label: "Panorâmica Lenta (Pan Horizontal / Tilt Vertical)" },
      { value: "dolly_in", label: "Dolly In / Aproximação Gradual e Focada" },
      { value: "tracking_shot", label: "Travelling / Acompanhamento Lateral Contínuo" },
      { value: "handheld_nervoso", label: "Handheld Orgânico / Câmera na Mão Imersiva" },
      { value: "drone_aereo", label: "Drone Aéreo / Voo Suave e Amplo em Mergulho" },
    ],
    promptMapping: { target: "camera_movement", instruction: "Descrever o suporte e movimentação espacial da câmera." },
  },
  {
    key: "velocidade_obturador_movimento",
    category: "MOVEMENT",
    label: "Obturador & Sensação de Movimento",
    description: "Ângulo de obturação simulado que dita o arrasto temporal e nitidez de ação.",
    type: "SELECT",
    scope: "SCENE",
    required: false,
    defaultValue: "obturador_180",
    order: 9,
    options: [
      { value: "obturador_180", label: "Padrão Cinema 180° (24fps / Movimento Natural)" },
      { value: "slow_motion_120fps", label: "Câmera Lenta Elegante (Slow Motion 120fps)" },
      { value: "obturador_rapido_45", label: "Obturador Rápido 45° (Ação Estroboscópica Nítida)" },
    ],
    promptMapping: { target: "shutter_speed", instruction: "Definir a sensação de fluidez e arrasto do take." },
  },

  // 5. LIGHTING
  {
    key: "estilo_iluminacao",
    category: "LIGHTING",
    label: "Estilo de Iluminação Primária",
    description: "Direcionamento, dureza e contraste da fonte luminosa dominante.",
    type: "SELECT",
    scope: "GLOBAL",
    required: false,
    defaultValue: "luz_natural_suave",
    order: 10,
    options: [
      { value: "luz_natural_suave", label: "Luz Natural Suave (Soft Daylight Difusa)" },
      { value: "chiaroscuro_dramatico", label: "Chiaroscuro Dramático (Contraste Alto / Noir)" },
      { value: "golden_hour", label: "Golden Hour (Luz Dourada Rasante de Fim de Tarde)" },
      { value: "neon_cyberpunk", label: "Neon Vibrante / Luzes Coloridas Urbanas" },
      { value: "hard_sunlight", label: "Luz Dura / Sol Escaldante a Pino com Sombras Fortes" },
      { value: "rim_light_recorte", label: "Luz de Recorte / Rim Light Separando o Sujeito" },
    ],
    promptMapping: { target: "lighting", instruction: "Aplicar o esquema e direcionamento luminotécnico." },
  },
  {
    key: "temperatura_cor_iluminacao",
    category: "LIGHTING",
    label: "Temperatura de Cor da Luz",
    description: "Gradiente térmico em Kelvin das principais fontes iluminadoras.",
    type: "SELECT",
    scope: "GLOBAL",
    required: false,
    defaultValue: "neutra_5600k",
    order: 11,
    options: [
      { value: "quente_tungstenio_3200k", label: "Quente / Âmbar (Tungstênio 3200K Acolhedor)" },
      { value: "neutra_5600k", label: "Neutra / Luz do Dia Calibrada (Daylight 5600K)" },
      { value: "fria_azulada_7000k", label: "Fria / Azulada Noturna (Cool Overcast 7000K)" },
      { value: "bicolor_contrastante", label: "Bicolor Contrastante (Laranja Quente + Ciano Frio)" },
    ],
    promptMapping: { target: "color_temperature", instruction: "Especificar temperatura e balanço de branco da cena." },
  },

  // 6. AESTHETICS
  {
    key: "estilo_cinematografico_visual",
    category: "AESTHETICS",
    label: "Estilo Cinematográfico Visual",
    description: "Identidade autoral geral da direção de fotografia e tom da narrativa visual.",
    type: "SELECT",
    scope: "GLOBAL",
    required: true,
    defaultValue: "realista_contemporaneo",
    order: 12,
    options: [
      { value: "realista_contemporaneo", label: "Cinematográfico Realista Contemporâneo" },
      { value: "cyberpunk_neonoir", label: "Cyberpunk Neo-Noir Hiperestilizado" },
      { value: "fantasia_epica", label: "Fantasia Épica & Atmosférica" },
      { value: "documentario_cru", label: "Documentário Cru & Naturalista" },
      { value: "retro_technicolor_70s", label: "Retro 70s / Technicolor Analógico Envelhecido" },
    ],
    promptMapping: { target: "visual_style", instruction: "Estabelecer o tom estilístico primordial da fotografia." },
  },
  {
    key: "nivel_granulacao_pelicula",
    category: "AESTHETICS",
    label: "Granulação de Película Analógica (0 a 100)",
    description: "Intensidade do grão orgânico de filme fotoquímico na textura da imagem.",
    type: "RANGE",
    scope: "OUTPUT",
    required: false,
    defaultValue: 25,
    order: 13,
    promptMapping: { target: "texture", instruction: "Inserir textura de grão de filme analógico 35mm." },
  },
  {
    key: "paleta_cor_dominante",
    category: "AESTHETICS",
    label: "Paleta de Cores Dominante",
    description: "Harmonia cromática principal para pós-processamento e color grading.",
    type: "SELECT",
    scope: "GLOBAL",
    required: false,
    defaultValue: "teal_and_orange",
    order: 14,
    options: [
      { value: "teal_and_orange", label: "Teal and Orange (Contraste Cinematográfico Clássico)" },
      { value: "monocromatico_dessaturado", label: "Dessaturado / Quase Monocromático Melancólico" },
      { value: "tons_terrosos_organicos", label: "Tons Terrosos, Ocre e Madeira Orgânica" },
      { value: "cores_vividas_saturadas", label: "Cores Vívidas, Expressivas e Altamente Saturadas" },
    ],
    promptMapping: { target: "color_palette", instruction: "Definir a cartela cromática dominante na imagem." },
  },

  // 7. ART_ATMOSPHERE
  {
    key: "atmosfera_climatica_particulas",
    category: "ART_ATMOSPHERE",
    label: "Atmosfera, Clima & Partículas Volumétricas",
    description: "Efeitos ambientais no ar (fumaça, chuva, névoa, partículas douradas de poeira).",
    type: "SELECT",
    scope: "ENVIRONMENT",
    required: false,
    defaultValue: "ar_limpido",
    order: 15,
    options: [
      { value: "ar_limpido", label: "Ar Límpido e Cristalino (Sem névoa aparente)" },
      { value: "neblina_volumetrica_haze", label: "Haze Volumétrico / Névoa Suave com Raios de Luz (God Rays)" },
      { value: "chuva_asfalto_molhado", label: "Chuva Torrencial com Asfalto Molhado e Reflexos de Luz" },
      { value: "poeira_suspensao", label: "Poeira Dourada em Suspensão Flutuando no Ar" },
      { value: "fumaca_densa_nevoeiro", label: "Fumaça Industrial Densa / Nevoeiro Noturno Pesado" },
    ],
    promptMapping: { target: "atmosphere", instruction: "Adicionar partículas atmosféricas e densidade do ar." },
  },
  {
    key: "textura_cenario_arquitetura",
    category: "ART_ATMOSPHERE",
    label: "Textura de Cenografia & Arquitetura",
    description: "Estilo arquitetônico dominante e acabamento tátil das superfícies do cenário.",
    type: "SELECT",
    scope: "ENVIRONMENT",
    required: false,
    defaultValue: "minimalista_contemporaneo",
    order: 16,
    options: [
      { value: "minimalista_contemporaneo", label: "Minimalista Contemporâneo (Concreto Limpo, Vidro e Metal)" },
      { value: "industrial_degradado", label: "Industrial Rústico / Fábrica Degradada com Ferrugem e Tijolos" },
      { value: "barroco_ornamentado", label: "Clássico Ornamentado / Veludo, Madeira Maciça e Dourados" },
      { value: "natureza_selvagem_organica", label: "Orgânico Selvagem / Rochas Úmidas, Musgo e Floresta Densa" },
    ],
    promptMapping: { target: "set_design", instruction: "Detalhar os materiais e arquitetura do ambiente." },
  },

  // 8. AUDIO
  {
    key: "ambience_sound_profile",
    category: "AUDIO",
    label: "Perfil de Ambiência Sonora & Sound Design",
    description: "Diretrizes acústicas de fundo e paisagem sonora que ancoram a atmosfera do take.",
    type: "SELECT",
    scope: "GLOBAL",
    required: false,
    defaultValue: "realista_organico",
    order: 17,
    options: [
      { value: "realista_organico", label: "Ambiência Orgânica Naturalista (Ruído de sala, vento, pássaros)" },
      { value: "silencio_tenso_low_hum", label: "Silêncio Tenso com Sub-Grave / Low Drone Contínuo" },
      { value: "urbano_agitado", label: "Urbano Denso (Tráfego distante, sirenes, ecos de passos)" },
      { value: "orquestral_epico", label: "Trilha Orquestral Grandiosa com Cordas e Percussão" },
      { value: "sintetizadores_ambientais", label: "Sintetizadores Analógicos Ambientais (Synthwave / Blade Runner)" },
    ],
    promptMapping: { target: "sound_design", instruction: "Instrução sonora de fundo e ambiência musical." },
  },
  {
    key: "diretrizes_dialogo_voz",
    category: "AUDIO",
    label: "Diretrizes de Diálogo & Estilo Vocal",
    description: "Intensidade, proximidade do microfone e entrega vocal das falas.",
    type: "SELECT",
    scope: "SCENE",
    required: false,
    defaultValue: "natural_conversacional",
    order: 18,
    options: [
      { value: "natural_conversacional", label: "Conversação Naturalista e Clara" },
      { value: "voz_intima_sussurrada", label: "Voz Íntima / Microfone de Proximidade Sussurrado" },
      { value: "dramatico_projetado", label: "Diálogo Teatral Forte e Projetado" },
      { value: "voiceover_narrador", label: "Voice-Over / Narração em Off Profunda" },
      { value: "sem_dialogo_puro_visual", label: "Cena Silenciosa Sem Diálogo / Puramente Visual" },
    ],
    promptMapping: { target: "voice_direction", instruction: "Orientação para ritmo vocal e modulação dramática." },
  },

  // 9. CONTINUITY
  {
    key: "consistencia_rosto_figurino",
    category: "CONTINUITY",
    label: "Consistência de Figurino & Anatomia",
    description: "Elementos anatômicos inegociáveis e detalhes de vestuário fixos entre tomadas.",
    type: "TEXTAREA",
    scope: "CHARACTER",
    required: false,
    defaultValue: "",
    order: 19,
    promptMapping: { target: "character_continuity", instruction: "Garantir consistência anatômica e de vestimenta." },
  },
  {
    key: "consistencia_iluminacao_cena",
    category: "CONTINUITY",
    label: "Consistência de Luz Entre Planos (Raccord)",
    description: "Manter coerência de direção de sombras e ponto da luz-chave ao alternar ângulos.",
    type: "SELECT",
    scope: "SCENE",
    required: false,
    defaultValue: "raccord_rigoroso",
    order: 20,
    options: [
      { value: "raccord_rigoroso", label: "Raccord Rigoroso (Mesma direção e intensidade em todos os planos)" },
      { value: "adaptavel_por_angulo", label: "Adaptável (Luz-chave ligeiramente ajustada para favorecer o ator)" },
    ],
    promptMapping: { target: "lighting_continuity", instruction: "Assegurar continuidade luminotécnica com a tomada anterior." },
  },
  {
    key: "proibir_elementos_negativos",
    category: "CONTINUITY",
    label: "Elementos Proibidos (Prompt Negativo Anti-Defeitos)",
    description: "Artefatos, defeitos de inteligência artificial ou anomalias proibidas no resultado.",
    type: "TEXTAREA",
    scope: "OUTPUT",
    required: false,
    defaultValue: "deformed hands, extra limbs, bad anatomy, low quality, cartoon, oversaturated, blurred faces, distorted fingers, watermark, CGI look",
    order: 21,
    promptMapping: { target: "negative_prompt", instruction: "Adicionar ao prompt negativo obrigatório." },
  },
];

const cinematicParametersEnsuredWorkspaces = new Set<string>();

export class ProjectParameterConfigService {
  /**
   * Garante a sincronização em lote de todas as definições cinematográficas da V1 no workspace.
   */
  static async ensureCinematicParameters(workspaceId: string) {
    if (cinematicParametersEnsuredWorkspaces.has(workspaceId)) {
      return;
    }

    const existingParams = await db.parameterDefinition.findMany({
      where: { workspaceId },
      select: { key: true, id: true },
    });
    const existingKeys = new Set(existingParams.map((p) => p.key));

    const toCreate: Prisma.ParameterDefinitionCreateManyInput[] = [];

    for (const def of CINEMATIC_PARAM_DEFINITIONS) {
      if (existingKeys.has(def.key)) continue;

      // Enriquecer opções com dados de catálogo de referências visuais reais
      const enrichedOptions = (def.options || []).map((opt) => {
        const visualMatch = VISUAL_REFERENCE_OPTIONS.find((v) => v.value === opt.value);
        return {
          value: opt.value,
          label: opt.label,
          description: opt.description || visualMatch?.description || "",
          imageUrl: visualMatch?.imageUrl || null,
          whatToLookFor: visualMatch?.whatToLookFor || null,
          comparisonNotes: visualMatch?.comparisonNotes || null,
        };
      });

      toCreate.push({
        workspaceId,
        key: def.key,
        label: def.label,
        description: def.description,
        type: def.type,
        scope: def.scope,
        required: def.required,
        defaultValue: def.defaultValue as Prisma.InputJsonValue,
        options: enrichedOptions.length > 0 ? (enrichedOptions as Prisma.InputJsonValue) : Prisma.JsonNull,
        order: def.order,
        promptMapping: def.promptMapping ? (def.promptMapping as Prisma.InputJsonValue) : Prisma.JsonNull,
        isSystem: true,
        enabled: true,
      });
    }

    if (toCreate.length > 0) {
      await db.parameterDefinition.createMany({
        data: toCreate,
        skipDuplicates: true,
      });
      ParameterService.invalidateCache(workspaceId);
    }

    cinematicParametersEnsuredWorkspaces.add(workspaceId);
  }

  /**
   * Recupera a configuração completa de parâmetros para um projeto, estruturada nas 9 categorias.
   */
  static async getProjectParameterSettings(
    projectId: string,
    workspaceId: string
  ): Promise<ProjectParameterSettingsData> {
    // 1. Garantir que as definições de parâmetros existam
    await this.ensureCinematicParameters(workspaceId);

    // 2. Carregar projeto, definições e valores concorrentemente via Promise.all (Elimina 2 round-trips WAN)
    const [project, allDefs, projectValues] = await Promise.all([
      db.project.findFirst({
        where: { id: projectId, workspaceId },
        select: {
          id: true,
          configuration: true,
        },
      }),
      ParameterService.listParameters(workspaceId, { enabled: true }),
      db.parameterValue.findMany({
        where: { projectId, targetType: "PROJECT" },
      }),
    ]);

    if (!project) {
      throw new Error("Projeto não encontrado no workspace.");
    }

    const configJson = (project.configuration as any) || {};
    const savedSettings = configJson.parameterSettings || {};

    const projectValuesMap = new Map<string, unknown>();
    for (const pv of projectValues) {
      projectValuesMap.set(pv.parameterDefinitionId, pv.value);
    }

    // Se o projeto ainda não possui configuração personalizada gravada, todas as categorias e parâmetros iniciam habilitados
    const defaultAllKeys = CINEMATIC_PARAM_DEFINITIONS.map((p) => p.key);
    const defaultAllCategories: ProjectCinematicCategoryKey[] = CINEMATIC_CATEGORIES.map((c) => c.id);

    const enabledCategories: ProjectCinematicCategoryKey[] = Array.isArray(savedSettings.enabledCategories)
      ? savedSettings.enabledCategories
      : defaultAllCategories;

    const enabledParameterKeys: string[] = Array.isArray(savedSettings.enabledParameterKeys)
      ? savedSettings.enabledParameterKeys
      : defaultAllKeys;

    const enabledKeysSet = new Set(enabledParameterKeys);
    const enabledCategoriesSet = new Set(enabledCategories);

    // 5. Montar estrutura categorizada
    const categories: ProjectCategoryWithParameters[] = CINEMATIC_CATEGORIES.map((cat) => {
      const isCategoryEnabled = enabledCategoriesSet.has(cat.id);

      const baseCategoryParams = CINEMATIC_PARAM_DEFINITIONS.filter((cp) => cp.category === cat.id).map((seed) => {
        const dbDef = allDefs.find((d) => d.key === seed.key);
        const definitionId = dbDef ? dbDef.id : `virtual_${seed.key}`;
        const isParamEnabled = isCategoryEnabled && enabledKeysSet.has(seed.key);

        const projectVal = dbDef ? projectValuesMap.get(dbDef.id) : undefined;
        const currentProjectValue = projectVal !== undefined ? projectVal : seed.defaultValue;

        // Montar opções com imagens reais
        const rawOptions = (dbDef?.options as any[]) || seed.options || [];
        const options: ProjectParameterOption[] = rawOptions.map((opt) => {
          const visual = VISUAL_REFERENCE_OPTIONS.find((v) => v.value === opt.value);
          return {
            value: opt.value,
            label: opt.label,
            description: opt.description || visual?.description,
            imageUrl: opt.imageUrl || visual?.imageUrl,
            whatToLookFor: opt.whatToLookFor || visual?.whatToLookFor,
            comparisonNotes: opt.comparisonNotes || visual?.comparisonNotes,
          };
        });

        return {
          definitionId,
          key: seed.key,
          label: dbDef?.label || seed.label,
          description: dbDef?.description || seed.description,
          category: cat.id,
          type: dbDef?.type || seed.type,
          scope: dbDef?.scope || seed.scope,
          scopes: (dbDef as any)?.scopes || undefined,
          required: dbDef?.required ?? seed.required,
          systemDefaultValue: dbDef?.defaultValue ?? seed.defaultValue,
          currentProjectValue,
          isEnabledInProject: isParamEnabled,
          options,
        };
      });

      // Parâmetros customizados adicionados globalmente ou no workspace atribuídos a esta categoria
      const seedKeys = new Set(CINEMATIC_PARAM_DEFINITIONS.filter((cp) => cp.category === cat.id).map((s) => s.key));
      const customParamsInCat = allDefs.filter((d) => {
        if (seedKeys.has(d.key)) return false;
        const pm = (d.promptMapping as any) || {};
        return pm?.category === cat.id;
      });

      const customItems: ProjectConfigurableParameter[] = customParamsInCat.map((dbDef) => {
        const isParamEnabled =
          isCategoryEnabled &&
          (!savedSettings.enabledParameterKeys || enabledKeysSet.has(dbDef.key));
        const projectVal = projectValuesMap.get(dbDef.id);
        const currentProjectValue =
          projectVal !== undefined ? projectVal : dbDef.defaultValue;
        const rawOptions = (dbDef.options as any[]) || [];
        const options: ProjectParameterOption[] = rawOptions.map((opt) => ({
          value: opt.value,
          label: opt.label,
          description: opt.description,
          imageUrl: opt.imageUrl,
          whatToLookFor: opt.whatToLookFor,
          comparisonNotes: opt.comparisonNotes,
        }));

        return {
          definitionId: dbDef.id,
          key: dbDef.key,
          label: dbDef.label,
          description: dbDef.description || undefined,
          category: cat.id,
          type: dbDef.type,
          scope: dbDef.scope,
          scopes: (dbDef.scopes as string[]) || undefined,
          required: dbDef.required,
          systemDefaultValue: dbDef.defaultValue,
          currentProjectValue,
          isEnabledInProject: isParamEnabled,
          options,
        };
      });

      const categoryParams = [...baseCategoryParams, ...customItems];
      const enabledCount = categoryParams.filter((p) => p.isEnabledInProject).length;

      return {
        ...cat,
        isEnabled: isCategoryEnabled,
        enabledCount,
        totalCount: categoryParams.length,
        parameters: categoryParams,
      };
    });

    const totalParameters = categories.reduce((sum, c) => sum + c.totalCount, 0);
    const enabledParametersCount = categories.reduce((sum, c) => sum + c.enabledCount, 0);

    return {
      projectId,
      totalParameters,
      enabledParametersCount,
      enabledCategories,
      enabledParameterKeys,
      categories,
    };
  }

  /**
   * Salva a configuração de parâmetros habilitados e valores padrão para o projeto.
   */
  static async updateProjectParameterSettings(
    projectId: string,
    workspaceId: string,
    input: UpdateProjectParameterSettingsInput
  ) {
    const project = await db.project.findFirst({
      where: { id: projectId, workspaceId },
    });
    if (!project) {
      throw new Error("Projeto não encontrado.");
    }

    const allDefs = await ParameterService.listParameters(workspaceId, { enabled: true });
    const defsByKey = new Map<string, (typeof allDefs)[0]>();
    for (const d of allDefs) {
      defsByKey.set(d.key, d);
    }

    // 1. Atualizar Project.configuration.parameterSettings
    const currentConfig = (project.configuration as any) || {};
    const updatedConfig = {
      ...currentConfig,
      parameterSettings: {
        enabledCategories: input.enabledCategories || CINEMATIC_CATEGORIES.map((c) => c.id),
        enabledParameterKeys: input.enabledParameterKeys,
        updatedAt: new Date().toISOString(),
      },
    };

    await db.project.update({
      where: { id: projectId },
      data: {
        configuration: updatedConfig as Prisma.InputJsonValue,
      },
    });

    // 2. Salvar valores padrão do projeto em ParameterValue para retrocompatibilidade total
    const valuesToSave: Array<{
      parameterDefinitionId: string;
      targetType: "PROJECT";
      targetId: null;
      value: unknown;
    }> = [];

    for (const [key, val] of Object.entries(input.defaultValues || {})) {
      const def = defsByKey.get(key);
      if (def && val !== undefined) {
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

    // 3. Retornar dados atualizados
    return this.getProjectParameterSettings(projectId, workspaceId);
  }

  /**
   * Filtra e resolve apenas os parâmetros EFETIVAMENTE habilitados para o projeto,
   * respeitando o targetType (PROJECT, CHARACTER, ENVIRONMENT, SCENE, OUTPUT).
   */
  static async getEffectiveProjectParameters(
    projectId: string,
    workspaceId: string,
    target: TargetContext
  ) {
    const project = await db.project.findFirst({
      where: { id: projectId, workspaceId },
      select: { configuration: true },
    });
    if (!project) throw new Error("Projeto não encontrado.");

    const config = (project.configuration as any) || {};
    const settings = config.parameterSettings;

    // Se houver filtro gravado, filtrar definições
    const allDefs = await ParameterService.listParameters(workspaceId, { enabled: true });

    let activeDefs = allDefs;
    if (settings && Array.isArray(settings.enabledParameterKeys)) {
      const allowedSet = new Set(settings.enabledParameterKeys);
      activeDefs = allDefs.filter((d) => allowedSet.has(d.key));
    }

    const allProjectValues = await db.parameterValue.findMany({
      where: { projectId },
    });

    return ParameterResolver.resolveForTarget(activeDefs, allProjectValues, target);
  }
}
