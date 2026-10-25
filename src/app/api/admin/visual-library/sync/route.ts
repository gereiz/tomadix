import { NextRequest, NextResponse } from "next/server";
import { requirePlatformAdmin, AuthorizationError, AuthenticationError } from "@/lib/auth";
import { VisualReferenceService } from "@/modules/visual-library/visual-reference.service";
import { db } from "@/lib/db";

export async function POST(request: NextRequest) {
  try {
    await requirePlatformAdmin();
    const body = await request.json().catch(() => ({}));

    // Se informou um workspaceId específico, sincroniza nele; caso contrário, sincroniza em todos os workspaces
    if (body.workspaceId) {
      await VisualReferenceService.syncDefaultVisualParameters(body.workspaceId);
      return NextResponse.json({
        success: true,
        message: `Parâmetros visuais sincronizados no workspace ${body.workspaceId}.`,
      });
    }

    const workspaces = await db.workspace.findMany({ select: { id: true } });
    for (const ws of workspaces) {
      await VisualReferenceService.syncDefaultVisualParameters(ws.id);
    }

    return NextResponse.json({
      success: true,
      workspacesCount: workspaces.length,
      message: `Catálogo visual sincronizado em ${workspaces.length} workspace(s).`,
    });
  } catch (error: any) {
    if (error instanceof AuthorizationError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    if (error instanceof AuthenticationError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    return NextResponse.json(
      { error: error?.message || "Erro ao sincronizar biblioteca visual de parâmetros." },
      { status: 400 }
    );
  }
}
