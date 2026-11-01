import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  getCurrentWorkspace,
  assertSpaceAccess,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
} from "@/lib/auth";
import { z, ZodError } from "zod";

type RouteParams = {
  params: Promise<{ id: string }>;
};

const createBoardSchema = z.object({
  name: z.string().trim().min(1).max(60).optional(),
});

export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const { workspace, user, role } = await getCurrentWorkspace(null, "projects:read");

    const project = await assertSpaceAccess(id, workspace.id, user.id, role, "view");

    let canEdit = true;
    try {
      await assertSpaceAccess(id, workspace.id, user.id, role, "edit");
    } catch {
      canEdit = false;
    }

    // Busca recursos do projeto para a biblioteca lateral e eventual inicialização do board
    const [existingBoards, images, characters, environments, scenes] = await Promise.all([
      db.spaceBoard.findMany({
        where: { projectId: id },
        include: {
          nodes: { orderBy: { createdAt: "asc" } },
          edges: { orderBy: { createdAt: "asc" } },
        },
        orderBy: { order: "asc" },
      }),
      db.generatedImage.findMany({
        where: { projectId: id, status: "SUCCEEDED" },
        orderBy: { createdAt: "desc" },
        take: 60,
      }),
      db.character.findMany({
        where: { projectId: id, isArchived: false },
        orderBy: { updatedAt: "desc" },
      }),
      db.environment.findMany({
        where: { projectId: id, isArchived: false },
        orderBy: { updatedAt: "desc" },
      }),
      db.scene.findMany({
        where: { projectId: id },
        include: {
          promptVersions: {
            orderBy: { createdAt: "desc" },
            take: 3,
          },
        },
        orderBy: { order: "asc" },
      }),
    ]);

    let boards = existingBoards;

    // Se o projeto ainda não possui nenhum SpaceBoard, cria "Page 1" e popula com os ativos existentes
    if (boards.length === 0) {
      const initialNodes: Array<{
        id: string;
        type: string;
        x: number;
        y: number;
        width?: number;
        height?: number;
        refType?: string;
        refId?: string;
        data: Record<string, any>;
      }> = [];
      const initialEdges: Array<{
        id: string;
        sourceNodeId: string;
        targetNodeId: string;
        animated?: boolean;
      }> = [];

      // Posiciona até 8 imagens existentes em colunas organizadas
      images.slice(0, 8).forEach((img, idx) => {
        const col = idx % 3;
        const row = Math.floor(idx / 3);
        initialNodes.push({
          id: `node-img-${img.id}`,
          type: "IMAGE",
          x: 80 + col * 340,
          y: 80 + row * 400,
          width: 300,
          refType: "GENERATED_IMAGE",
          refId: img.id,
          data: {
            label: `#${idx + 1} · ${img.modelId}`,
            imageUrl: img.imageUrl,
            prompt: img.prompt,
            modelId: img.modelId,
            aspectRatio: img.aspectRatio || "1:1",
            resolution: img.resolution || "1024x1024",
            imageId: img.id,
          },
        });
      });

      // Posiciona até 4 prompts/cenas ao lado se existirem
      scenes.slice(0, 4).forEach((scene, idx) => {
        const latestPrompt = scene.promptVersions?.[0];
        const promptStr =
          latestPrompt?.outputText ||
          (latestPrompt?.outputJson ? JSON.stringify(latestPrompt.outputJson) : "") ||
          scene.description ||
          scene.title;
        const nodeId = `node-scene-${scene.id}`;
        initialNodes.push({
          id: nodeId,
          type: latestPrompt ? "PROMPT" : "SCENE",
          x: 1140,
          y: 80 + idx * 280,
          width: 320,
          refType: latestPrompt ? "PROMPT_VERSION" : "SCENE",
          refId: latestPrompt ? latestPrompt.id : scene.id,
          data: {
            label: `Cena ${scene.order}: ${scene.title}`,
            title: scene.title,
            description: scene.description,
            prompt: promptStr,
            sceneOrder: scene.order,
          },
        });

        // Se houver imagem correspondente a essa cena, cria uma conexão visual
        const linkedImg = images.find((im) => im.sceneId === scene.id);
        if (linkedImg && initialNodes.some((n) => n.id === `node-img-${linkedImg.id}`)) {
          initialEdges.push({
            id: `edge-${nodeId}-img-${linkedImg.id}`,
            sourceNodeId: nodeId,
            targetNodeId: `node-img-${linkedImg.id}`,
            animated: true,
          });
        }
      });

      const createdBoard = await db.spaceBoard.create({
        data: {
          projectId: id,
          name: "Page 1",
          order: 0,
          viewport: { x: 0, y: 0, zoom: 0.85 },
          nodes: {
            create: initialNodes.map((n) => ({
              id: n.id,
              type: n.type,
              x: n.x,
              y: n.y,
              width: n.width,
              height: n.height,
              refType: n.refType,
              refId: n.refId,
              data: n.data,
            })),
          },
          edges: {
            create: initialEdges.map((e) => ({
              id: e.id,
              sourceNodeId: e.sourceNodeId,
              targetNodeId: e.targetNodeId,
              animated: e.animated ?? false,
            })),
          },
        },
        include: {
          nodes: { orderBy: { createdAt: "asc" } },
          edges: { orderBy: { createdAt: "asc" } },
        },
      });

      boards = [createdBoard];
    }

    // Extrai todos os prompts de todas as cenas para facilitar arrastar prompts
    const prompts = scenes.flatMap((scene) =>
      (scene.promptVersions || []).map((pv) => ({
        id: pv.id,
        sceneId: scene.id,
        sceneTitle: scene.title,
        sceneOrder: scene.order,
        version: pv.templateVersion,
        promptText:
          pv.outputText ||
          (pv.outputJson ? JSON.stringify(pv.outputJson) : "") ||
          scene.description,
        negativePrompt: null,
        createdAt: pv.createdAt,
      }))
    );

    return NextResponse.json({
      data: {
        project: {
          id: project.id,
          title: project.title,
          visibility: project.visibility,
          ownerUserId: project.ownerUserId,
          canEdit,
          updatedAt: project.updatedAt,
        },
        boards,
        library: {
          images,
          characters,
          environments,
          scenes,
          prompts,
        },
      },
    });
  } catch (error: any) {
    if (error instanceof AuthenticationError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    if (error instanceof AuthorizationError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    if (error instanceof NotFoundError) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }
    console.error("Erro ao carregar boards do Space:", error);
    return NextResponse.json(
      { error: "Erro interno ao carregar o Space Board." },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const { workspace, user, role } = await getCurrentWorkspace(null, "projects:update");

    await assertSpaceAccess(id, workspace.id, user.id, role, "edit");

    const body = await request.json().catch(() => ({}));
    const validated = createBoardSchema.parse(body);

    const existingCount = await db.spaceBoard.count({
      where: { projectId: id },
    });

    const boardName = validated.name || `Page ${existingCount + 1}`;

    const newBoard = await db.spaceBoard.create({
      data: {
        projectId: id,
        name: boardName,
        order: existingCount,
        viewport: { x: 0, y: 0, zoom: 1 },
      },
      include: {
        nodes: true,
        edges: true,
      },
    });

    return NextResponse.json(
      {
        message: "Nova página de board criada com sucesso.",
        data: newBoard,
      },
      { status: 201 }
    );
  } catch (error: any) {
    if (error instanceof AuthenticationError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    if (error instanceof AuthorizationError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    if (error instanceof NotFoundError) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: "Dados inválidos para criação de página.", issues: error.issues },
        { status: 422 }
      );
    }
    console.error("Erro ao criar página no Space Board:", error);
    return NextResponse.json(
      { error: "Erro interno ao criar nova página." },
      { status: 500 }
    );
  }
}
