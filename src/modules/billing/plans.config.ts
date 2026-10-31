import { PlanTier, PlanConfig } from "./billing.types";

export const PLANS_CATALOG: Record<PlanTier, PlanConfig> = {
  FREE: {
    tier: PlanTier.FREE,
    name: "Plano Gratuito",
    description: "Ideal para experimentar a engenharia de prompts cinematográficos.",
    priceMonthly: 0,
    priceYearly: 0,
    currency: "BRL",
    maxProjects: 2,
    maxMembers: 1,
    monthlyCredits: 0,
    adhesionCredits: 100,
    dailyCredits: 20,
    dailyCreditsAccumulative: true,
    isFreePlan: true,
    features: [
      "Até 2 projetos cinematográficos ativos",
      "1 membro no estúdio",
      "100 créditos iniciais de adesão",
      "20 créditos diários acumulativos",
      "Templates cinematográficos essenciais",
      "Exportação de prompts em JSON",
      "Resolução de parâmetros dinâmicos"
    ],
    enabledTemplates: ["character_definition", "environment_definition", "individual_scene"],
    exportAllowed: true,
    visualBibleAdvanced: false,
  },
  PRO: {
    tier: PlanTier.PRO,
    name: "Tomadix Pro",
    description: "Para diretores, roteiristas e criadores de conteúdo audiovisual independentes.",
    priceMonthly: 8900, // R$ 89,00
    priceYearly: 89000, // R$ 890,00 (2 meses grátis)
    currency: "BRL",
    maxProjects: 20,
    maxMembers: 3,
    monthlyCredits: 500,
    adhesionCredits: 500,
    dailyCredits: 100,
    dailyCreditsAccumulative: false,
    isFreePlan: false,
    features: [
      "Até 20 projetos cinematográficos",
      "Até 3 membros colaboradores",
      "500 créditos de adesão + 500 mensais",
      "100 créditos diários renovados todo dia",
      "Todos os 7 templates cinematográficos",
      "Bíblia Visual cinematográfica completa",
      "Análise de continuidade de cenas",
      "Exportação completa da sequência decupada",
      "Geração prioritária com Gemini"
    ],
    enabledTemplates: ["*"],
    exportAllowed: true,
    visualBibleAdvanced: true,
  },
  TEAM: {
    tier: PlanTier.TEAM,
    name: "Tomadix Studio Team",
    description: "Para produtoras audiovisuais, agências e estúdios colaborativos.",
    priceMonthly: 24900, // R$ 249,00
    priceYearly: 249000, // R$ 2.490,00
    currency: "BRL",
    maxProjects: -1, // Ilimitado
    maxMembers: 10,
    monthlyCredits: 2500,
    adhesionCredits: 1000,
    dailyCredits: 200,
    dailyCreditsAccumulative: true,
    isFreePlan: false,
    features: [
      "Projetos cinematográficos ilimitados",
      "Até 10 membros com gestão de papéis (RBAC)",
      "1.000 créditos de adesão + 2.500 mensais",
      "200 créditos diários acumulativos",
      "Acesso antecipado a novos modelos Gemini",
      "Trilha completa de auditoria administrativa",
      "Templates customizados e parâmetros corporativos",
      "Suporte cinematográfico dedicado prioritário"
    ],
    enabledTemplates: ["*"],
    exportAllowed: true,
    visualBibleAdvanced: true,
  },
  ENTERPRISE: {
    tier: PlanTier.ENTERPRISE,
    name: "Tomadix Enterprise",
    description: "Grandes produtoras, emissoras de TV e estúdios com SLA dedicado.",
    priceMonthly: 89000,
    priceYearly: 890000,
    currency: "BRL",
    maxProjects: -1,
    maxMembers: 50,
    monthlyCredits: 10000,
    adhesionCredits: 5000,
    dailyCredits: 500,
    dailyCreditsAccumulative: true,
    isFreePlan: false,
    features: [
      "Projetos e membros ilimitados",
      "5.000 créditos de adesão + 10.000 mensais",
      "500 créditos diários acumulativos",
      "SLA de 99.9% e infraestrutura dedicada",
      "Integrações de API customizadas",
      "Suporte 24/7 com engenheiro de prompts"
    ],
    enabledTemplates: ["*"],
    exportAllowed: true,
    visualBibleAdvanced: true,
  }
};

export function getPlanConfig(tier: PlanTier): PlanConfig {
  return PLANS_CATALOG[tier] || PLANS_CATALOG.FREE;
}

export const DEFAULT_PLANS = PLANS_CATALOG;
