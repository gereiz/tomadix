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
  params: Promise<{ id: string; boardId: string }>;
};

const boardNodeInputSchema = z.object({
  id: z.string().min(1),
  type: z.string().min(1),
  x: z.number(),
  y: z.number(),
  width: z.number().optional().nullable(),
  height: z.number().optional().nullable(),
  zIndex: z.number().int().optional(),
  refType: z.string().optional().nullable(),
  refId: z.string().optional().nullable(),
  data: z.record(z.string(), z.any()).optional().default({}),
});

const boardEdgeInputSchema = z.object({
  id: z.string().min(1),
  sourceNodeId: z.string().min(1),
  targetNodeId: z.string().min(1),
  sourceHandle: z.string().optional().nullable(),
  targetHandle: z.string().optional().nullable(),
  label: z.string().optional().nullable(),
  animated: z.boolean().optional().default(false),
  data: z.record(z.string(), z.any()).optional().default({}),
});

const updateBoardSchema = z.object({
  name: z.string().trim().min(1).max(60).optional(),
  viewport: z
    .object({
      x: z.number(),
      y: z.number(),
      zoom: z.number(),
    })
    .optional(),
  nodes: z.array(boardNodeInputSchema).optional(),
  edges: z.array(boardEdgeInputSchema).optional(),
});

export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const { id, boardId } = await params;
    const { workspace, user, role } = await getCurrentWorkspace(null, "projects:read");

    await assertSpaceAccess(id, workspace.id, user.id, role, "view");

    const board = await db.spaceBoard.findFirst({
      where: { id: boardId, projectId: id },
      include: {
        nodes: { orderBy: { createdAt: "asc" } },
        edges: { orderBy: { createdAt: "asc" } },
      },
    });

    if (!board) {
      return NextResponse.json({ error: "Página do board não encontrada." }, { status: 404 });
    }

    return NextResponse.json({ data: board });
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
    console.error("Erro ao consultar página do board:", error);
    return NextResponse.json({ error: "Erro interno ao consultar página." }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { id, boardId } = await params;
    const { workspace, user, role } = await getCurrentWorkspace(null, "projects:read");

    const project = await assertSpaceAccess(id, workspace.id, user.id, role, "edit");

    const existingBoard = await db.spaceBoard.findFirst({
      where: { id: boardId, projectId: id },
    });

    if (!existingBoard) {
      return NextResponse.json({ error: "Página do board não encontrada." }, { status: 404 });
    }

    const body = await request.json();
    const validated = updateBoardSchema.parse(body);

    const updatedBoard = await db.$transaction(async (tx) => {
      if (validated.nodes !== undefined) {
        await tx.boardNode.deleteMany({
          where: { boardId },
        });

        if (validated.nodes.length > 0) {
          await tx.boardNode.createMany({
            data: validated.nodes.map((n, idx) => ({
              id: n.id,
              boardId,
              type: n.type,
              x: n.x,
              y: n.y,
              width: n.width ?? null,
              height: n.height ?? null,
              zIndex: n.zIndex ?? idx,
              refType: n.refType ?? null,
              refId: n.refId ?? null,
              data: n.data ?? {},
            })),
          });
        }
      }

      if (validated.edges !== undefined) {
        await tx.boardEdge.deleteMany({
          where: { boardId },
        });

        if (validated.edges.length > 0) {
          await tx.boardEdge.createMany({
            data: validated.edges.map((e) => ({
              id: e.id,
              boardId,
              sourceNodeId: e.sourceNodeId,
              targetNodeId: e.targetNodeId,
              sourceHandle: e.sourceHandle ?? null,
              targetHandle: e.targetHandle ?? null,
              label: e.label ?? null,
              animated: e.animated ?? false,
              data: e.data ?? {},
            })),
          });
        }
      }

      const firstImageUrl = validated.nodes?.find(
        (n) => n.type === "IMAGE" && typeof n.data?.imageUrl === "string"
      )?.data?.imageUrl;

      await tx.project.update({
        where: { id },
        data: {
          updatedAt: new Date(),
          ...(firstImageUrl && !project.thumbnailUrl ? { thumbnailUrl: firstImageUrl } : {}),
        },
      });

      return tx.spaceBoard.update({
        where: { id: boardId },
        data: {
          ...(validated.name ? { name: validated.name } : {}),
          ...(validated.viewport ? { viewport: validated.viewport } : {}),
          updatedAt: new Date(),
        },
        include: {
          nodes: { orderBy: { createdAt: "asc" } },
          edges: { orderBy: { createdAt: "asc" } },
        },
      });
    });

    return NextResponse.json({
      message: "Board salvo com sucesso.",
      data: updatedBoard,
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
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: "Dados do board inválidos.", issues: error.issues },
        { status: 422 }
      );
    }
    console.error("Erro ao salvar página do board:", error);
    return NextResponse.json({ error: "Erro interno ao salvar o board." }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  try {
    const { id, boardId } = await params;
    const { workspace, user, role } = await getCurrentWorkspace(null, "projects:update");

    await assertSpaceAccess(id, workspace.id, user.id, role, "edit");

    const totalBoards = await db.spaceBoard.count({
      where: { projectId: id },
    });

    if (totalBoards <= 1) {
      return NextResponse.json(
        { error: "O Space precisa manter pelo menos uma página de board." },
        { status: 400 }
      );
    }

    await db.spaceBoard.deleteMany({
      where: { id: boardId, projectId: id },
    });

    return NextResponse.json({ message: "Página removida com sucesso." });
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
    console.error("Erro ao excluir página do board:", error);
    return NextResponse.json({ error: "Erro interno ao excluir página." }, { status: 500 });
  }
}

