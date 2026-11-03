export const GENRE_OPTIONS = [
  "Ficção Científica",
  "Cyberpunk",
  "Suspense / Thriller",
  "Drama",
  "Fantasia",
  "Ação / Aventura",
  "Documentário",
  "Terror / Horror",
  "Comercial / Publicidade",
  "Videoclipe",
  "Experimental",
] as const;

export type GenreOption = (typeof GENRE_OPTIONS)[number];
