/**
 * Configuração central da identidade comercial e institucional da marca Tomadix.
 * Todas as superfícies visuais, metadados e templates devem utilizar esta fonte única de verdade.
 */
export const BRAND = {
  name: "Tomadix",
  legalName: "Tomadix",
  tagline: "Da ideia ao prompt cinematográfico com direção.",
  slogan: "Da ideia à cena.",
  description: "Plataforma inteligente de criação e organização de prompts para produção audiovisual com IA.",
  shortName: "Tomadix",
  version: "1.0.0",
  meta: {
    titleTemplate: "%s | Tomadix",
    defaultTitle: "Tomadix",
  },
} as const;

export const APP_NAME = BRAND.name;
