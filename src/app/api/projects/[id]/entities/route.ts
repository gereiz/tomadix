import { NextRequest, NextResponse } from "next/server";
import { getCurrentWorkspace, AuthorizationError, AuthenticationError } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { workspace } = await getCurrentWorkspace(null, "projects:read");
    const { id: projectId } = await params;

    // Validar projeto no workspace
    const project = await db.project.findFirst({
      where: { id: projectId, workspaceId: workspace.id },
      select: { id: true, title: true },
    });

    if (!project) {
      return NextResponse.json({ error: "Projeto não encontrado." }, { status: 404 });
    }

    const [characters, environments, scenes] = await Promise.all([
      db.character.findMany({
        where: { projectId, isArchived: false },
        orderBy: { updatedAt: "desc" },
        select: {
          id: true,
          name: true,
          description: true,
          attributes: true,
        },
      }),
      db.environment.findMany({
        where: { projectId, isArchived: false },
        orderBy: { updatedAt: "desc" },
        select: {
          id: true,
          name: true,
          description: true,
          attributes: true,
        },
      }),
      db.scene.findMany({
        where: { projectId },
        orderBy: { order: "asc" },
        select: {
          id: true,
          title: true,
          order: true,
          description: true,
          configuration: true,
        },
      }),
    ]);

    return NextResponse.json({
      data: {
        projectId,
        characters,
        environments,
        scenes,
      },
    });
  } catch (error: any) {
    if (error instanceof AuthorizationError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    if (error instanceof AuthenticationError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    console.error("Erro ao listar entidades do projeto:", error);
    return NextResponse.json({ error: "Erro ao buscar entidades." }, { status: 500 });
  }
}

