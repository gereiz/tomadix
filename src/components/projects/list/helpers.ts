import dynamic from "next/dynamic";

// Modais carregados sob demanda: ficam fora do bundle inicial da página.
export const TransferProjectModal = dynamic(
  () => import("@/components/projects/transfer-project-modal").then((m) => m.TransferProjectModal),
  { ssr: false }
);

export const SpaceShareModal = dynamic(
  () => import("@/components/spaces/space-share-modal").then((m) => m.SpaceShareModal),
  { ssr: false }
);

export const PlanLimitModal = dynamic(
  () => import("@/components/ui/plan-limit-modal").then((m) => m.PlanLimitModal),
  { ssr: false }
);

export const PLATFORM_OPTIONS = [
  "Google Flow",
  "Nano Banana",
  "Midjourney v6",
  "Runway Gen-3",
  "OpenAI Sora",
  "Kling AI",
  "Seedance",
  "Luma Dream Machine",
  "Outra Plataforma",
];

export const ASPECT_RATIO_OPTIONS = ["16:9", "9:16", "2.39:1", "4:3", "1:1"];

export const CINEMA_PRESETS = [
  {
    title: "Curta Cyberpunk 2099",
    genre: "Cyberpunk",
    description: "Megalópole chuvosa, hologramas gigantes, iluminação volumétrica néon noir ciano e magenta com lentes anamórficas.",
    aspectRatio: "16:9",
    targetPlatform: "Google Flow",
    durationSeconds: "60",
    colorGrade: "Teal and Orange Saturado",
    pacing: "Dinâmico / Ação Rápida",
    filmGrain: 20,
  },
  {
    title: "Cinema Noir VHS Anos 90",
    genre: "Suspense / Thriller",
    description: "Estética vintage granulada, fita analógica, aberrações cromáticas sutis e iluminação chiaroscuro de alto contraste.",
    aspectRatio: "2.39:1",
    targetPlatform: "Midjourney v6",
    durationSeconds: "30",
    colorGrade: "Preto e Branco / Tons Terrosos Desbotados",
    pacing: "Lento / Contemplativo",
    filmGrain: 85,
  },
  {
    title: "Alta Moda Editorial Futurista",
    genre: "Comercial / Publicidade",
    description: "Retrato clean de passarela com iluminação difusa suave 5600K, close-ups de texturas e transições orgânicas.",
    aspectRatio: "9:16",
    targetPlatform: "Outra Plataforma",
    durationSeconds: "15",
    colorGrade: "Daylight 5600K Imaculado",
    pacing: "Rítmico / High Fashion",
    filmGrain: 0,
  },
  {
    title: "Odisseia Sci-Fi Planetária",
    genre: "Ficção Científica",
    description: "Exploração de superfície alienígena desértica, luz crepuscular de duas luas e atmosfera com névoa densa.",
    aspectRatio: "2.39:1",
    targetPlatform: "Runway Gen-3",
    durationSeconds: "90",
    colorGrade: "Monocromático Âmbar e Ciano Frio",
    pacing: "Épico / Gravitacional",
    filmGrain: 30,
  },
];

export function getGenreVisual(genre: string | null) {
  const g = (genre || "").toLowerCase();
  if (g.includes("cyber") || g.includes("anime") || g.includes("sci-fi") || g.includes("ficção")) {
    return {
      gradient: "from-primary/20 via-slate-900 to-[#0b0f13]",
      border: "border-primary/30",
      accent: "text-primary",
      badge: "bg-[var(--brand-badge-bg,var(--color-primary))] text-[var(--brand-badge-text,#ffffff)] font-bold shadow-sm",
      glowColor: "var(--brand-primary, #2563eb)",
      bgPattern: "radial-gradient(circle at 80% 20%, var(--brand-primary, #2563eb) 0%, transparent 60%)",
    };
  }
  if (g.includes("noir") || g.includes("suspense") || g.includes("terror") || g.includes("drama")) {
    return {
      gradient: "from-amber-950/70 via-slate-900 to-[#0b0f13]",
      border: "border-amber-400/30",
      accent: "text-amber-400",
      badge: "bg-amber-500/80 text-[var(--brand-badge-text,#ffffff)] font-bold shadow-sm",
      glowColor: "rgba(245, 158, 11, 0.25)",
      bgPattern: "radial-gradient(circle at 20% 80%, rgba(245, 158, 11, 0.15) 0%, transparent 60%)",
    };
  }
  if (g.includes("comercial") || g.includes("moda") || g.includes("publicidade") || g.includes("videoclipe")) {
    return {
      gradient: "from-purple-950/70 via-slate-900 to-[#0b0f13]",
      border: "border-purple-400/30",
      accent: "text-purple-400",
      badge: "bg-purple-600/80 text-[var(--brand-badge-text,#ffffff)] font-bold shadow-sm",
      glowColor: "rgba(192, 132, 252, 0.25)",
      bgPattern: "radial-gradient(circle at 50% 30%, rgba(192, 132, 252, 0.15) 0%, transparent 60%)",
    };
  }
  return {
    gradient: "from-slate-900 via-slate-950 to-[#0b0f13]",
    border: "border-outline-variant/30",
    accent: "text-secondary",
    badge: "bg-[var(--brand-badge-bg,var(--color-primary))] text-[var(--brand-badge-text,#ffffff)] font-bold shadow-sm",
    glowColor: "rgba(149, 211, 186, 0.2)",
    bgPattern: "radial-gradient(circle at 50% 50%, rgba(149, 211, 186, 0.1) 0%, transparent 60%)",
  };
}

