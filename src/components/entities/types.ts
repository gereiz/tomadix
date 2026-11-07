export type EntityStatusFilter = "all" | "active" | "archived";

/** Recurso da API em /api/projects/[id]/<recurso>. */
export type EntityResource = "characters" | "environments";

/** Campos mínimos que a biblioteca de entidades precisa de personagens e ambientes. */
export interface BaseEntity {
  id: string;
  name: string;
  isArchived: boolean;
  _count?: { sceneLinks: number };
}

export interface LightboxImage {
  url: string;
  title: string;
  subtitle?: string;
  prompt?: string;
}

/** Textos que variam entre personagens e ambientes. */
export interface EntityLabels {
  /** "personagem" / "ambiente" */
  singular: string;
  /** "Personagem" / "Ambiente" */
  singularCap: string;
  /** Artigo + substantivo, usado nas mensagens de erro. Ex.: "o personagem" */
  withArticle: string;
  /** Contração com "de": "do personagem" / "do ambiente" */
  ofThe: string;
}
