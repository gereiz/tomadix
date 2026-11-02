export interface VideoModelDefinition {
  modelId: string;
  name: string;
  publisher?: string;
  description?: string;
  creditCost: number;
  isDefault: boolean;
  isEnabled: boolean;
  isAvailable: boolean;
  supportedDurations: number[];
  supportedAspectRatios: string[];
  pricing?: {
    currency: string;
    completionVideoSeconds?: string;
    promptVideoSeconds?: string;
  };
}

export interface VideoGenerationOptions {
  prompt: string;
  model?: string;
  durationSeconds?: number;
  aspectRatio?: string;
  resolution?: string;
  audio?: boolean;
  startFrameUrl?: string;
  endFrameUrl?: string;
  referenceImages?: string[];
  seed?: number;
}

export interface VideoGenerationResult {
  videoUrl: string;
  thumbnailUrl?: string;
  storageKey?: string;
  durationSeconds: number;
  model: string;
  prompt: string;
  externalCost?: number;
  externalCostUnit?: string;
  durationMs: number;
  seed?: number;
}

export class VideoGenerationError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly statusCode: number = 500,
    public readonly retryable: boolean = false
  ) {
    super(message);
    this.name = "VideoGenerationError";
  }
}
