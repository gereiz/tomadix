export type ImageAspectRatio = "1:1" | "16:9" | "9:16" | "4:3" | "3:4" | "21:9";

export interface ImageGenerationOptions {
  prompt: string;
  model: string;
  aspectRatio?: ImageAspectRatio;
  resolution?: string;
  width?: number;
  height?: number;
  negativePrompt?: string;
  referenceImageUrl?: string;
  n?: number;
  responseFormat?: "b64_json" | "url";
  seed?: number;
  metadata?: Record<string, any>;
}

export interface ImageGenerationResult {
  imageUrl: string;
  b64Json?: string;
  model: string;
  prompt: string;
  revisedPrompt?: string;
  durationMs: number;
  externalCost?: number;
  externalCostUnit?: string;
  width?: number;
  height?: number;
  seed?: number;
  metadata?: Record<string, any>;
}

export interface ImageModelDefinition {
  modelId: string;
  name: string;
  publisher?: string;
  description?: string;
  capabilities: string[];
  supportedSizes: string[];
  supportsReferenceImage: boolean;
  supportsImageEditing: boolean;
  pricingInfo?: Record<string, any>;
  isAvailable: boolean;
  isEnabled: boolean;
  isDefault: boolean;
  defaultCreditCost?: number | null;
  displayOrder: number;
}

export interface ImageProviderCapabilities {
  supportsReferenceImages: boolean;
  supportsImageEditing: boolean;
  supportsNegativePrompt: boolean;
  supportsMultipleImages: boolean;
  supportedAspectRatios: ImageAspectRatio[];
  supportedResolutions: string[];
}

export interface ImageConnectionTestResult {
  success: boolean;
  message: string;
  status: "CONNECTED" | "INVALID_KEY" | "INSUFFICIENT_BALANCE" | "UNREACHABLE" | "ERROR" | "UNCONFIGURED";
  modelsCount?: number;
  eligibleModels?: string[];
  rawError?: string;
}

export class ImageGenerationError extends Error {
  statusCode: number;
  code: string;
  isRecoverable: boolean;

  constructor(message: string, code = "IMAGE_GENERATION_FAILED", statusCode = 500, isRecoverable = false) {
    super(message);
    this.name = "ImageGenerationError";
    this.code = code;
    this.statusCode = statusCode;
    this.isRecoverable = isRecoverable;
  }
}
