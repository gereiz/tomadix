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

const updateSharingSchema = z.object({
  visibility: z.enum(["PRIVATE", "TEAM", "SELECTED"]),
  members: z
    .array(
      z.object({
        userId: z.string().min(1),
        canEdit: z.boolean().default(true),
      })
    )
    .default([]),
});

export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const { workspace, user, role } = await getCurrentWorkspace(null, "projects:read");

    const project = await assertSpaceAccess(id, workspace.id, user.id, role, "view");

    const [workspaceMemberships, spaceMembers] = await Promise.all([
      db.membership.findMany({
        where: { workspaceId: workspace.id },
        include: {
          user: {
            select: {
              id: true,
              displayName: true,
              email: true,
            },
          },
        },
        orderBy: { createdAt: "asc" },
      }),
      db.spaceMember.findMany({
        where: { projectId: id },
        include: {
          user: {
            select: {
              id: true,
              displayName: true,
              email: true,
            },
          },
        },
      }),
    ]);

    const isWorkspaceAdmin = role === "OWNER" || role === "ADMIN";
    const canManageSharing =
      isWorkspaceAdmin || project.ownerUserId === user.id || !project.ownerUserId;

    return NextResponse.json({
      data: {
        projectId: project.id,
        title: project.title,
        visibility: project.visibility,
        ownerUserId: project.ownerUserId || user.id,
        canManageSharing,
        workspaceMembers: workspaceMemberships.map((m) => ({
          userId: m.user.id,
          displayName: m.user.displayName || m.user.email.split("@")[0],
          email: m.user.email,
          workspaceRole: m.role,
        })),
        selectedMembers: spaceMembers.map((sm) => ({
          userId: sm.userId,
          canEdit: sm.canEdit,
          displayName: sm.user.displayName || sm.user.email.split("@")[0],
          email: sm.user.email,
        })),
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
    console.error("Erro ao consultar compartilhamento do Space:", error);
    return NextResponse.json(
      { error: "Erro interno ao consultar compartilhamento." },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const { workspace, user, role } = await getCurrentWorkspace(null, "projects:update");

    const project = await assertSpaceAccess(id, workspace.id, user.id, role, "edit");
    const isWorkspaceAdmin = role === "OWNER" || role === "ADMIN";
    const isOwner = project.ownerUserId === user.id || !project.ownerUserId;

    if (!isWorkspaceAdmin && !isOwner) {
      return NextResponse.json(
        { error: "Apenas o criador do Space ou administradores do Workspace podem alterar o compartilhamento." },
        { status: 403 }
      );
    }

    const body = await request.json();
    const validated = updateSharingSchema.parse(body);

    const updated = await db.$transaction(async (tx) => {
      const updatedProject = await tx.project.update({
        where: { id: project.id },
        data: {
          visibility: validated.visibility,
          ownerUserId: project.ownerUserId || user.id,
        },
      });

      // Atualiza a lista de membros selecionados
      await tx.spaceMember.deleteMany({
        where: { projectId: project.id },
      });

      if (validated.visibility === "SELECTED" && validated.members.length > 0) {
        const uniqueMembers = Array.from(
          new Map(validated.members.map((m) => [m.userId, m])).values()
        );
        await tx.spaceMember.createMany({
          data: uniqueMembers.map((m) => ({
            projectId: project.id,
            userId: m.userId,
            canEdit: m.canEdit,
          })),
        });
      }

      const finalMembers = await tx.spaceMember.findMany({
        where: { projectId: project.id },
        include: {
          user: {
            select: {
              id: true,
              displayName: true,
              email: true,
            },
          },
        },
      });

      return {
        visibility: updatedProject.visibility,
        ownerUserId: updatedProject.ownerUserId,
        selectedMembers: finalMembers.map((sm) => ({
          userId: sm.userId,
          canEdit: sm.canEdit,
          displayName: sm.user.displayName || sm.user.email.split("@")[0],
          email: sm.user.email,
        })),
      };
    });

    return NextResponse.json({
      message: "Configurações de compartilhamento do Space atualizadas com sucesso.",
      data: updated,
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
        { error: "Dados de compartilhamento inválidos.", issues: error.issues },
        { status: 422 }
      );
    }
    console.error("Erro ao atualizar compartilhamento do Space:", error);
    return NextResponse.json(
      { error: "Erro interno ao atualizar compartilhamento." },
      { status: 500 }
    );
  }
}

