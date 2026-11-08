import { aiRateLimitResponse } from "@/lib/ai-rate-limit";
import { NextRequest, NextResponse } from "next/server";
import { getCurrentWorkspace, AuthenticationError, AuthorizationError } from "@/lib/auth";
import { ImageGenerationService } from "@/modules/image-generation/image-generation.service";
import { ImageGenerationError } from "@/modules/image-generation/image-generation.types";
import { z } from "zod";
import { CAPTURE_STYLE_KEYS } from "@/modules/prompt-engine/capture-styles";

const generateImageSchema = z.object({
  prompt: z.string().trim().min(2, "O prompt deve conter pelo menos 2 caracteres.").max(4000, "O prompt excede o limite de 4000 caracteres."),
  model: z.string().trim().optional(),
  aspectRatio: z.enum(["1:1", "16:9", "9:16", "4:3", "3:4", "21:9"]).optional(),
  resolution: z.string().trim().optional(),
  negativePrompt: z.string().trim().max(1000).optional(),
  referenceImageUrl: z.string().trim().optional().or(z.literal("")),
  seed: z.number().int().optional(),
  projectId: z.string().trim().optional().nullable(),
  characterId: z.string().trim().optional().nullable(),
  environmentId: z.string().trim().optional().nullable(),
  sceneId: z.string().trim().optional().nullable(),
  promptVersionId: z.string().trim().optional().nullable(),
  captureStyle: z.enum(CAPTURE_STYLE_KEYS).optional(),
  degradeImage: z.boolean().optional(),
  metadata: z.record(z.any()).optional(),
});

export async function POST(request: NextRequest) {
  try {
    const { user, workspace } = await getCurrentWorkspace();
    const rateLimited = aiRateLimitResponse(workspace.id);
    if (rateLimited) return rateLimited;
    const body = await request.json().catch(() => ({}));
    const validated = generateImageSchema.parse(body);

    const result = await ImageGenerationService.generateDirectImage({
      workspaceId: workspace.id,
      userId: user.id,
      prompt: validated.prompt,
      model: validated.model,
      aspectRatio: validated.aspectRatio,
      resolution: validated.resolution,
      negativePrompt: validated.negativePrompt,
      referenceImageUrl: validated.referenceImageUrl || undefined,
      seed: validated.seed,
      projectId: validated.projectId || undefined,
      characterId: validated.characterId || undefined,
      environmentId: validated.environmentId || undefined,
      sceneId: validated.sceneId || undefined,
      promptVersionId: validated.promptVersionId || undefined,
      captureStyle: validated.captureStyle,
      degradeImage: validated.degradeImage,
      metadata: validated.metadata,
    });

    return NextResponse.json(result);
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0]?.message || "Parâmetros de geração inválidos." },
        { status: 400 }
      );
    }
    if (error instanceof ImageGenerationError) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: error.statusCode }
      );
    }
    if (error instanceof AuthorizationError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    if (error instanceof AuthenticationError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    return NextResponse.json(
      { error: error?.message || "Erro inesperado ao gerar imagem." },
      { status: 500 }
    );
  }
}

