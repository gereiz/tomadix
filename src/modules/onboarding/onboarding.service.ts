import { db } from "@/lib/db";
import { NotFoundError } from "@/lib/auth";

export interface StarterTemplate {
  key: string;
  title: string;
  genre: string;
  description: string;
  targetPlatform: string;
  aspectRatio: string;
  colorGrade: string;
  characters: Array<{
    name: string;
    role: string;
    description: string;
    physicalTraits: Record<string, any>;
  }>;
  environments: Array<{
    name: string;
    type: string;
    description: string;
    lighting: string;
  }>;
  scenes: Array<{
    title: string;
    order: number;
    description: string;
    framing: string;
    cameraMovement: string;
  }>;
}

export const STARTER_TEMPLATES: StarterTemplate[] = [
  {
    key: "cyberpunk_nordestino",
    title: "Neo-Sertão 2099",
    genre: "Cyberpunk",
    description: "Um sertão futurista pós-solar onde tecnologia neural e tradição do cangaço se fundem sob céus de poeira e néon.",
    targetPlatform: "Google Flow",
    aspectRatio: "2.39:1",
    colorGrade: "Amarelo desértico saturado com contrastes azul-néon ciberpunk",
    characters: [
      {
        name: "Valquíria do Sol",
        role: "Protagonista / Hackeira do Cangaço",
        description: "Pilota rebelde vestindo gibão de couro tecnológico com circuitos integrados e chapéu de vaqueiro reforçado com fibra de carbono.",
        physicalTraits: {
          age: "28 anos",
          eyes: "Implantes cibernéticos âmbar",
          wardrobe: "Gibão de couro sintetizado iluminado por LED fosco",
        },
      },
      {
        name: "Coronel Silício",
        role: "Antagonista / Magnata da Água Sintética",
        description: "Magnata corporativo frio e calculista, com terno de nanotecnologia e máscara respiratória dourada.",
        physicalTraits: {
          age: "55 anos",
          wardrobe: "Terno corporativo preto grafite com detalhes metálicos",
        },
      },
    ],
    environments: [
      {
        name: "Feira de Sucata Neural de Juazeiro",
        type: "EXTERIOR",
        description: "Mercado ao ar livre sob turbinas eólicas gigantes e letreiros holográficos em xilogravura futurista.",
        lighting: "Luz solar intensa filtrada por névoa de poeira e néons azuis",
      },
      {
        name: "Canyon dos Painéis Solares",
        type: "EXTERIOR",
        description: "Garganta rochosa árida cercada por milhares de placas solares espelhadas estalando ao calor.",
        lighting: "Pôr do sol incandescente, reflexos dourados ofuscantes",
      },
    ],
    scenes: [
      {
        title: "Chegada à Feira Neural",
        order: 1,
        description: "Valquíria atravessa os corredores da feira sob calor intenso, buscando peças de resfriamento para sua moto voadora.",
        framing: "Plano Médio / Travelling",
        cameraMovement: "Acompanhamento fluido na altura dos olhos",
      },
      {
        title: "Confronto no Canyon",
        order: 2,
        description: "Drones corporativos interceptam a heroína nas gargantas espelhadas dos coletores de energia.",
        framing: "Plano Geral / Panorâmica Anamórfica",
        cameraMovement: "Grua dinâmica descendente com corte rápido",
      },
    ],
  },
  {
    key: "suspense_noir",
    title: "Sombras da Guanabara",
    genre: "Suspense / Thriller",
    description: "Um mistério urbano nos anos 50 no Rio de Janeiro, misturando fumaça de gafieira, intriga política e chuva constante.",
    targetPlatform: "Midjourney v6",
    aspectRatio: "16:9",
    colorGrade: "Preto e branco de alto contraste, chiaroscuro clássico",
    characters: [
      {
        name: "Detetive Mauro Brandão",
        role: "Investigador Particular",
        description: "Ex-policial melancólico, sobretudo amassado, olhar cansado e cigarro fumegante.",
        physicalTraits: {
          age: "45 anos",
          wardrobe: "Sobretudo cinza escuro, chapéu fedora e gravata torta",
        },
      },
    ],
    environments: [
      {
        name: "Beco da Lapa Sob Chuva",
        type: "EXTERIOR",
        description: "Rua estreita de paralelepípedos refletindo os postes a gás e os arcos da Lapa ao fundo.",
        lighting: "Luz difusa de postes noturnos cortando poças d'água",
      },
    ],
    scenes: [
      {
        title: "O Encontro no Beco",
        order: 1,
        description: "Mauro aguarda sob o toldo de uma livraria fechada enquanto passos apressados ecoam na calçada molhada.",
        framing: "Plano Americano / Contra-Plongée",
        cameraMovement: "Câmera estática com lente 50mm f/1.4",
      },
    ],
  },
];

export class OnboardingService {
  /**
   * Obtém o estado completo de onboarding do usuário.
   */
  static async getOnboardingState(userId: string) {
    const user = await db.user.findUnique({
      where: { id: userId },
      include: {
        memberships: {
          include: {
            workspace: {
              include: {
                subscription: {
                  include: { plan: true },
                },
                _count: {
                  select: { projects: true, memberships: true },
                },
              },
            },
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundError("Usuário não encontrado.");
    }

    const activeWorkspace =
      user.memberships.find((m) => (m.workspace._count?.projects || 0) > 0)?.workspace ||
      user.memberships[0]?.workspace;
    const hasProjects = (activeWorkspace?._count?.projects || 0) > 0;

    return {
      userId: user.id,
      displayName: user.displayName || user.email.split("@")[0],
      email: user.email,
      emailConfirmed: user.emailConfirmed,
      onboardingCompleted: user.onboardingCompleted,
      onboardingStep: user.onboardingStep,
      preferences: (user.preferences as Record<string, any>) || {},
      activeWorkspace: activeWorkspace
        ? {
            id: activeWorkspace.id,
            name: activeWorkspace.name,
            slug: activeWorkspace.slug,
            planName: activeWorkspace.subscription?.plan?.name || "Plano Gratuito",
            projectsCount: activeWorkspace._count?.projects || 0,
            hasProjects,
          }
        : null,
      starterTemplates: STARTER_TEMPLATES.map((t) => ({
        key: t.key,
        title: t.title,
        genre: t.genre,
        description: t.description,
        targetPlatform: t.targetPlatform,
        aspectRatio: t.aspectRatio,
      })),
    };
  }

  /**
   * Reinicia o onboarding completo do usuário do passo 1.
   */
  static async resetOnboarding(userId: string) {
    await db.user.update({
      where: { id: userId },
      data: {
        onboardingCompleted: false,
        onboardingStep: 1,
      },
    });
    return this.getOnboardingState(userId);
  }

  /**
   * Atualiza a etapa do onboarding ou conclui o fluxo.
   */
  static async updateStep(userId: string, step: number, completed = false) {
    const updated = await db.user.update({
      where: { id: userId },
      data: {
        onboardingStep: Math.max(1, Math.min(step, 7)),
        onboardingCompleted: completed || step >= 7,
      },
      select: {
        id: true,
        onboardingStep: true,
        onboardingCompleted: true,
      },
    });

    return updated;
  }

  /**
   * Pula o onboarding imediatamente.
   */
  static async skipOnboarding(userId: string) {
    const updated = await db.user.update({
      where: { id: userId },
      data: {
        onboardingCompleted: true,
        onboardingStep: 7,
      },
      select: {
        id: true,
        onboardingCompleted: true,
      },
    });

    return updated;
  }

  /**
   * Cria um projeto inicial a partir de um dos templates fornecidos.
   */
  static async createStarterProject(userId: string, workspaceId: string, templateKey: string) {
    const template =
      STARTER_TEMPLATES.find((t) => t.key === templateKey) || STARTER_TEMPLATES[0];

    const project = await db.project.create({
      data: {
        workspaceId,
        title: template.title,
        genre: template.genre,
        description: template.description,
        language: "pt-BR",
        configuration: {
          aspectRatio: template.aspectRatio,
          targetPlatform: template.targetPlatform,
          colorGrade: template.colorGrade,
        },
        characters: {
          create: template.characters.map((c) => ({
            name: c.name,
            description: `${c.role}: ${c.description}`,
            attributes: c.physicalTraits,
          })),
        },
        environments: {
          create: template.environments.map((e) => ({
            name: e.name,
            description: e.description,
            attributes: { type: e.type, lighting: e.lighting },
          })),
        },
        scenes: {
          create: template.scenes.map((s) => ({
            title: s.title,
            order: s.order,
            description: s.description,
            configuration: {
              framing: s.framing,
              cameraMovement: s.cameraMovement,
            },
          })),
        },
      },
      include: {
        characters: true,
        environments: true,
        scenes: true,
      },
    });

    // Registra auditoria
    await db.auditLog.create({
      data: {
        userId,
        workspaceId,
        action: "STARTER_PROJECT_CREATED",
        details: {
          projectId: project.id,
          projectTitle: project.title,
          templateKey,
        },
      },
    });

    // Atualiza onboarding para concluído
    await db.user.update({
      where: { id: userId },
      data: {
        onboardingCompleted: true,
        onboardingStep: 7,
      },
    });

    return project;
  }
}
