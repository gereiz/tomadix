import { NextRequest, NextResponse } from "next/server";
import { getCurrentWorkspace, AuthenticationError, AuthorizationError } from "@/lib/auth";
import { VideoGenerationService } from "@/modules/video-generation/video-generation.service";
import { VideoGenerationError } from "@/modules/video-generation/video-generation.types";
import { z } from "zod";

export const dynamic = "force-dynamic";

const generateVideoSchema = z.object({
  prompt: z.string().trim().min(3, "O prompt deve conter pelo menos 3 caracteres.").max(3000),
  model: z.string().trim().optional(),
  durationSeconds: z.number().int().min(1).max(30).optional(),
  aspectRatio: z.string().trim().optional(),
  resolution: z.string().trim().optional(),
  audio: z.boolean().optional(),
  startFrameUrl: z.string().trim().optional().or(z.literal("")),
  endFrameUrl: z.string().trim().optional().or(z.literal("")),
  projectId: z.string().trim().optional().nullable(),
  sceneId: z.string().trim().optional().nullable(),
  seed: z.number().int().optional(),
  metadata: z.record(z.any()).optional(),
});

export async function POST(request: NextRequest) {
  try {
    const { user, workspace } = await getCurrentWorkspace();
    const body = await request.json().catch(() => ({}));
    const validated = generateVideoSchema.parse(body);

    const result = await VideoGenerationService.generateDirectVideo({
      workspaceId: workspace.id,
      userId: user.id,
      prompt: validated.prompt,
      model: validated.model,
      durationSeconds: validated.durationSeconds || 5,
      aspectRatio: validated.aspectRatio || "16:9",
      resolution: validated.resolution,
      audio: validated.audio ?? true,
      startFrameUrl: validated.startFrameUrl || undefined,
      endFrameUrl: validated.endFrameUrl || undefined,
      projectId: validated.projectId || undefined,
      sceneId: validated.sceneId || undefined,
      seed: validated.seed,
      metadata: validated.metadata,
    });

    return NextResponse.json(result);
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0]?.message || "Parâmetros inválidos." },
        { status: 400 }
      );
    }
    if (error instanceof VideoGenerationError) {
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
      { error: error?.message || "Erro inesperado ao gerar vídeo." },
      { status: 500 }
    );
  }
}
