export type VisualCategory =
  | "LIGHTING"
  | "FRAMING"
  | "CAMERA_ANGLE"
  | "CAMERA_MOVEMENT"
  | "LENS_PERSPECTIVE"
  | "COMPOSITION"
  | "FOCUS_OPTICS"
  | "COLOR_GRADING"
  | "SCENE_DYNAMIC"
  | "SENSOR_FORMAT"
  | "ATMOSPHERE";

export interface VisualCategoryMeta {
  id: VisualCategory;
  name: string;
  shortDescription: string;
  icon: string;
  order: number;
}

export interface VisualReferenceOption {
  value: string; // Código técnico persistido (ex: "dolly_in")
  label: string; // Nome em português (ex: "Travelling para Frente (Dolly In)")
  originalName?: string | null; // Nome técnico internacional (ex: "Dolly In")
  category: VisualCategory;
  categoryLabel?: string;
  description: string; // Explicação didática curta
  whatToLookFor?: string | null; // O que observar visualmente na tomada
  comparisonNotes?: string | null; // Diferenciação com opções semelhantes (ex: Dolly vs Zoom)
  imageUrl: string; // Imagem principal ou diagrama vetorial
  thumbnailUrl?: string | null;
  secondaryImages?: string[] | null;
  videoUrl?: string | null;
  altText: string;
  order: number;
  isActive: boolean;
  isApproved: boolean;
  license?: string | null;
  tags?: string[];
  updatedAt?: string;
}

export interface VisualCoverageCategoryStat {
  category: VisualCategory;
  categoryName: string;
  icon: string;
  total: number;
  covered: number;
  pending: number;
  percentage: number;
}

export interface VisualCoverageReport {
  totalParameters: number;
  totalOptions: number;
  coveredOptions: number;
  pendingOptions: number;
  unavailableOptions: number;
  coveragePercentage: number;
  categories: VisualCoverageCategoryStat[];
  lastUpdated: string;
}
