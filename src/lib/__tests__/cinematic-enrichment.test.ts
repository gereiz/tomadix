import { describe, it, expect, vi, beforeEach } from "vitest";
import { CinematicPromptEnricher } from "@/modules/image-generation/cinematic-prompt-enricher";
import { PollinationsImageProvider } from "@/modules/image-generation/pollinations-image-provider";
import { db } from "@/lib/db";

vi.mock("@/lib/db", () => ({
  db: {
    project: {
      findUnique: vi.fn(),
    },
    scene: {
      findUnique: vi.fn(),
    },
    character: {
      findUnique: vi.fn(),
    },
    environment: {
      findUnique: vi.fn(),
    },
    parameterValue: {
      findMany: vi.fn().mockResolvedValue([]),
    },
    generationJob: {
      findFirst: vi.fn().mockResolvedValue(null),
    },
  },
}));

describe("CinematicPromptEnricher Keyword Detection", () => {
  it("detects user-specified lighting terms", () => {
    expect(CinematicPromptEnricher.hasUserLighting("um cachorro com iluminação de neon")).toBe(true);
    expect(CinematicPromptEnricher.hasUserLighting("cena na golden hour ao entardecer")).toBe(true);
    expect(CinematicPromptEnricher.hasUserLighting("soft light suave e sombras marcadas")).toBe(true);
    expect(CinematicPromptEnricher.hasUserLighting("um astronauta caminhando na lua")).toBe(false);
  });

  it("detects user-specified camera and lens terms", () => {
    expect(CinematicPromptEnricher.hasUserCamera("foto tirada com lente 35mm anamórfica")).toBe(true);
    expect(CinematicPromptEnricher.hasUserCamera("bokeh intenso f/1.8 foco seletivo")).toBe(true);
    expect(CinematicPromptEnricher.hasUserCamera("wide-angle shot de uma cidade")).toBe(true);
    expect(CinematicPromptEnricher.hasUserCamera("um carro vermelho na estrada")).toBe(false);
  });

  it("detects user-specified camera angle and framing terms", () => {
    expect(CinematicPromptEnricher.hasUserAngle("close-up dramático no rosto do personagem")).toBe(true);
    expect(CinematicPromptEnricher.hasUserAngle("plano geral da montanha")).toBe(true);
    expect(CinematicPromptEnricher.hasUserAngle("ângulo plongée contra o chão")).toBe(true);
    expect(CinematicPromptEnricher.hasUserAngle("um homem de corpo inteiro caminhando")).toBe(true);
    expect(CinematicPromptEnricher.hasUserAngle("foto full body de uma modelo")).toBe(true);
    expect(CinematicPromptEnricher.hasUserAngle("um homem tomando café")).toBe(false);
  });

  it("detects user-specified color and color grading terms", () => {
    expect(CinematicPromptEnricher.hasUserColor("fotografia em preto e branco vintage")).toBe(true);
    expect(CinematicPromptEnricher.hasUserColor("monocromático estilo p&b")).toBe(true);
    expect(CinematicPromptEnricher.hasUserColor("color grading teal and orange")).toBe(true);
    expect(CinematicPromptEnricher.hasUserColor("um guerreiro medieval com espada")).toBe(false);
  });
});

describe("CinematicPromptEnricher Parameter Inheritance", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("inherits project lighting and camera when prompt has no specific directions", async () => {
    (db.project.findUnique as any).mockResolvedValue({
      id: "proj-1",
      title: "Cyberpunk Noir",
      genre: "Ficção Científica",
      configuration: {
        colorGrade: "Teal and Orange",
        aspectRatio: "16:9",
      },
      parameterValues: [
        {
          definition: { key: "estilo_iluminacao" },
          value: JSON.stringify({ value: "Chiaroscuro com neon volumétrico" }),
        },
        {
          definition: { key: "distancia_focal_lente" },
          value: JSON.stringify({ value: "Lente Anamórfica 35mm" }),
        },
        {
          definition: { key: "angulo_camera_posicao" },
          value: JSON.stringify({ value: "Low Angle (Contra-plongée)" }),
        },
      ],
    });

    const result = await CinematicPromptEnricher.enrich({
      userPrompt: "Um detetive investigando uma pista no beco",
      projectId: "proj-1",
      workspaceId: "ws-1",
    });

    expect(result.enrichedPrompt).toContain("Um detetive investigando uma pista no beco");
    expect(result.enrichedPrompt).toContain("iluminação chiaroscuro dramática");
    expect(result.enrichedPrompt).toContain("lente cinematográfica 35mm anamórfica");
    expect(result.enrichedPrompt).toContain("contra-plongée (low angle");
    expect(result.appliedDirectives.some((d) => d.includes("chiaroscuro"))).toBe(true);
    expect(result.appliedDirectives.some((d) => d.includes("35mm"))).toBe(true);
    expect(result.appliedDirectives.some((d) => d.includes("contra-plongée"))).toBe(true);
  });

  it("preserves user explicit terms and does NOT override them with project params", async () => {
    (db.project.findUnique as any).mockResolvedValue({
      id: "proj-1",
      title: "Cyberpunk Noir",
      genre: "Ficção Científica",
      configuration: {},
      parameterValues: [
        {
          definition: { key: "estilo_iluminacao" },
          value: "Iluminação fria de estúdio",
        },
        {
          definition: { key: "angulo_camera_posicao" },
          value: "contra_plongee",
        },
      ],
    });

    // Usuário especificou explicitamente iluminação ("golden hour natural daylight")
    const result = await CinematicPromptEnricher.enrich({
      userPrompt: "Um guerreiro ao pôr do sol com golden hour daylight",
      projectId: "proj-1",
      workspaceId: "ws-1",
    });

    // A luz fria do projeto NÃO deve ser aplicada
    expect(result.enrichedPrompt).not.toContain("temperatura de cor fria");
    expect(result.skippedDirectives.some((d) => d.includes("iluminação"))).toBe(true);
    // Mas o ângulo que o usuário NÃO especificou deve ser aplicado
    expect(result.enrichedPrompt).toContain("contra-plongée");
    expect(result.appliedDirectives.some((d) => d.includes("contra-plongée"))).toBe(true);
  });

  it("applies Black & White styling and negative prompt for PeB projects", async () => {
    (db.project.findUnique as any).mockResolvedValue({
      id: "proj-peb",
      title: "Testes PeB anos 50",
      configuration: {
        colorGrade: "PeB anos 50",
      },
      parameterValues: [],
    });

    const result = await CinematicPromptEnricher.enrich({
      userPrompt: "Um astronauta com capacete",
      projectId: "proj-peb",
      workspaceId: "ws-1",
    });

    expect(result.enrichedPrompt.toLowerCase()).toMatch(/black and white|preto e branco|monochrome/);
    expect(result.enrichedNegativePrompt?.toLowerCase()).toMatch(/color|saturated|chromatic/);
    expect(result.enrichedPrompt.startsWith("fotografia cinematográfica estritamente em preto e branco")).toBe(true);
  });

  it("strictly enforces Black and White with heavy film grain when grain is high and suppresses conflicting colors", async () => {
    (db.project.findUnique as any).mockResolvedValue({
      id: "proj-bw-heavy-grain",
      title: "Projeto Vintage Preto e Branco",
      configuration: {
        filmGrain: 50,
      },
      parameterValues: [
        {
          definition: { key: "paleta_cor_dominante" },
          value: "preto_e_branco_tonal",
        },
        {
          definition: { key: "nivel_granulacao_pelicula" },
          value: 50,
        },
      ],
    });

    const result = await CinematicPromptEnricher.enrich({
      userPrompt: "Um homem sentado em um café durante o dia",
      projectId: "proj-bw-heavy-grain",
      workspaceId: "ws-1",
    });

    expect(result.enrichedPrompt.startsWith("fotografia cinematográfica estritamente em preto e branco")).toBe(true);
    expect(result.enrichedPrompt).toContain("heavy 35mm analog film grain");
    expect(result.enrichedPrompt).toContain("granulação pesada");
    expect(result.enrichedPrompt).not.toContain("paleta cromática dominante");
    expect(result.enrichedNegativePrompt).toContain("color");
    expect(result.enrichedNegativePrompt).toContain("warm skin tones");
  });

  it("inherits full visual identity from applied cinematic analysis (visualBible, lighting setup, palette, aesthetic, aperture)", async () => {
    (db.project.findUnique as any).mockResolvedValue({
      id: "proj-analysis",
      title: "Moody Vintage Project",
      configuration: {
        colorGrade: "Análogo Terroso Dessaturado",
        colorPalette: ["#2d2521", "#7a5d47", "#a6836c", "#d3c5ba", "#ede8e3"],
        filmGrain: 30,
        visualBible: {
          source: "CINEMATIC_ANALYSIS",
          aesthetic: "Cinematográfico Moody / Editorial Vintage",
          lighting: "Soft Ambient Daylight",
          lightingSetup: "Key Light: Luz natural difusa pela janela lateral",
          colorTemperature: "4500K Warm Neutral",
          camera: "Full Frame 35mm",
          lens: "35mm",
          aperture: "f/2.0",
          framing: "Close-Up",
          angle: "Low-angle",
          palette: ["#2d2521", "#7a5d47", "#a6836c", "#d3c5ba", "#ede8e3"],
          negativePrompt: "blurry, low quality, oversaturated colors",
        },
      },
      parameterValues: [],
    });

    const result = await CinematicPromptEnricher.enrich({
      userPrompt: "Um homem olhando para o horizonte",
      projectId: "proj-analysis",
      workspaceId: "ws-1",
    });

    expect(result.enrichedPrompt).toContain("Um homem olhando para o horizonte");
    expect(result.enrichedPrompt).toContain("Soft Ambient Daylight");
    expect(result.enrichedPrompt).toContain("Key Light: Luz natural difusa pela janela lateral");
    expect(result.enrichedPrompt).toContain("4500K");
    expect(result.enrichedPrompt).toContain("abertura f/2.0");
    expect(result.enrichedPrompt).toContain("Full Frame 35mm");
    expect(result.enrichedPrompt).toContain("contra-plongée (low angle");
    expect(result.enrichedPrompt).toContain("primeiro plano dramático (close-up)");
    expect(result.enrichedPrompt).toContain("Análogo Terroso Dessaturado");
    expect(result.enrichedPrompt).toContain("#2d2521");
    expect(result.enrichedPrompt).toContain("Cinematográfico Moody / Editorial Vintage");
    expect(result.enrichedPrompt).toContain("30%");
    expect(result.enrichedNegativePrompt).toContain("oversaturated colors");
  });

  it("enforces full body framing and anti-crop negative prompt when requested by user or project", async () => {
    (db.project.findUnique as any).mockResolvedValue({
      id: "proj-full-body",
      title: "Projeto Corpo Inteiro",
      configuration: {},
      parameterValues: [
        {
          definition: { key: "tipo_de_plano" },
          value: "plano_inteiro",
        },
      ],
    });

    // Test 1: Via project configuration
    const resultFromConfig = await CinematicPromptEnricher.enrich({
      userPrompt: "Um guerreiro medieval com espada",
      projectId: "proj-full-body",
      workspaceId: "ws-1",
    });

    expect(resultFromConfig.enrichedPrompt).toContain("corpo inteiro da cabeça aos pés");
    expect(resultFromConfig.enrichedNegativePrompt).toContain("cropped legs");
    expect(resultFromConfig.enrichedNegativePrompt).toContain("waist up");

    // Test 2: Via user explicit prompt
    const resultFromUser = await CinematicPromptEnricher.enrich({
      userPrompt: "Um guerreiro medieval de corpo inteiro com armadura",
      projectId: "proj-full-body",
      workspaceId: "ws-1",
    });

    expect(resultFromUser.enrichedPrompt).toContain("corpo inteiro da cabeça aos pés");
    expect(resultFromUser.enrichedNegativePrompt).toContain("cropped legs");
  });

  it("inherits filmGrain from scene configuration over project default", async () => {
    (db.project.findUnique as any).mockResolvedValue({
      id: "proj-grain",
      title: "Projeto Vintage",
      configuration: {
        filmGrain: 25,
      },
      parameterValues: [],
    });

    (db.scene.findUnique as any).mockResolvedValue({
      id: "scene-vhs",
      title: "Cena de Fita VHS",
      configuration: {
        filmGrain: 85,
      },
    });

    const result = await CinematicPromptEnricher.enrich({
      userPrompt: "Soldados na praia em 1950",
      projectId: "proj-grain",
      sceneId: "scene-vhs",
      workspaceId: "ws-1",
    });

    expect(result.enrichedPrompt).toContain("vintage VHS analog noise");
    expect(result.enrichedPrompt).toContain("85% intense heavy analog film grain");
  });

  it("applies clean digital directives when filmGrain is 0%", async () => {
    (db.project.findUnique as any).mockResolvedValue({
      id: "proj-digital",
      title: "Alta Moda Digital",
      configuration: {
        filmGrain: 0,
      },
      parameterValues: [],
    });

    const result = await CinematicPromptEnricher.enrich({
      userPrompt: "Retrato clean de alta moda na passarela",
      projectId: "proj-digital",
      workspaceId: "ws-1",
    });

    expect(result.enrichedPrompt).toContain("clean digital cinema photography, zero film grain");
    expect(result.enrichedPrompt).not.toContain("fotografia de filme 35mm");
  });
});

describe("PollinationsImageProvider Strict 32-Multiples Alignment", () => {
  const provider = new PollinationsImageProvider();

  it("aligns all standard aspect ratios to exact multiples of 32", () => {
    const ratios: Array<"16:9" | "9:16" | "1:1" | "4:3" | "3:4" | "21:9"> = [
      "16:9",
      "9:16",
      "1:1",
      "4:3",
      "3:4",
      "21:9",
    ];

    ratios.forEach((ratio) => {
      const dim = (provider as any).resolveDimensions(ratio);
      const alignedW = (provider as any).alignTo32(dim.width);
      const alignedH = (provider as any).alignTo32(dim.height);

      expect(alignedW % 32).toBe(0);
      expect(alignedH % 32).toBe(0);
      expect(alignedW).toBeGreaterThan(0);
      expect(alignedH).toBeGreaterThan(0);
    });
  });

  it("converts 16:9 1280x720 into valid 32-multiple 1344x768", () => {
    const dim = (provider as any).resolveDimensions("16:9");
    expect(dim.width).toBe(1344);
    expect(dim.height).toBe(768);
    expect(1344 % 32).toBe(0);
    expect(768 % 32).toBe(0);
  });

  it("converts 9:16 720x1280 into valid 32-multiple 768x1344", () => {
    const dim = (provider as any).resolveDimensions("9:16");
    expect(dim.width).toBe(768);
    expect(dim.height).toBe(1344);
    expect(768 % 32).toBe(0);
    expect(1344 % 32).toBe(0);
  });
});
