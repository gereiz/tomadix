/**
 * Conteúdo estático da página inicial. Separado da marcação para facilitar
 * edição de copy sem tocar nos componentes.
 */
import type { IconName } from "@/components/ui/icon";

export interface HomeStep {
  title: string;
  description: string;
  icon: IconName;
  href: string;
}

export const HOME_STEPS: readonly HomeStep[] = [
  {
    title: "Crie o projeto",
    description: "Defina gênero, proporção de tela, paleta e direção de arte uma única vez.",
    icon: "movie_creation",
    href: "/projects",
  },
  {
    title: "Cadastre personagens e ambientes",
    description: "Fixe rosto, figurino e cenário para que nada mude de uma cena para outra.",
    icon: "groups",
    href: "/projects",
  },
  {
    title: "Ajuste os parâmetros",
    description: "Escolha lente, câmera, iluminação e grão de filme, com herança por projeto e cena.",
    icon: "tune",
    href: "/parameters",
  },
  {
    title: "Gere o prompt",
    description: "Receba um JSON pronto para Google Flow, Nano Banana e ferramentas compatíveis.",
    icon: "auto_awesome",
    href: "/studio",
  },
];

export const HOME_PROMPT_SAMPLE = {
  file: "cena-03.json",
  scene: "Beco molhado, madrugada. A detetive acende um cigarro sob o letreiro de neon.",
  json: [
    "{",
    '  "camera": "anamorphic 40mm, 2.39:1",',
    '  "lighting": "neon 3200K, chiaroscuro",',
    '  "film": "35mm, grão alto",',
    '  "language": "pt-BR"',
    "}",
  ],
} as const;
