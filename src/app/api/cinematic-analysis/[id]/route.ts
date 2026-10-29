import { NextRequest, NextResponse } from "next/server";
import { getCurrentWorkspace, AuthenticationError, AuthorizationError } from "@/lib/auth";
import { db } from "@/lib/db";

/**
 * Remove uma análise cinematográfica do histórico.
 * O `id` é o identificador da análise (result.id), armazenado dentro do JSON do GenerationJob.
 */
export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { workspace } = await getCurrentWorkspace(null, "projects:update");
    const { id } = await params;

    if (!id) {
      return NextResponse.json({ error: "Identificador da análise é obrigatório." }, { status: 400 });
    }

    const { count } = await db.generationJob.deleteMany({
      where: {
        project: { workspaceId: workspace.id },
        OR: [{ id }, { result: { path: ["id"], equals: id } }],
      },
    });

    return NextResponse.json({ success: true, deleted: count });
  } catch (error: any) {
    if (error instanceof AuthenticationError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    if (error instanceof AuthorizationError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    console.error("Erro ao excluir análise cinematográfica:", error);
    return NextResponse.json({ error: "Erro interno ao excluir a análise." }, { status: 500 });
  }
}

