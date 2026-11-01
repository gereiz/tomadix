import { NextRequest, NextResponse } from "next/server";
import { getCurrentWorkspace, AuthenticationError, AuthorizationError } from "@/lib/auth";
import { db } from "@/lib/db";
import { ImageStorageService } from "@/modules/image-generation/image-storage.service";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { workspace } = await getCurrentWorkspace();
    const { id } = await params;

    const image = await db.generatedImage.findFirst({
      where: {
        id,
        workspaceId: workspace.id,
      },
    });

    if (!image) {
      return NextResponse.json({ error: "Imagem não encontrada ou sem permissão de exclusão." }, { status: 404 });
    }

    // 1. Remover arquivo físico do disco
    await ImageStorageService.deleteImage(image.imageUrl);
    if (image.storageKey) {
      await ImageStorageService.deleteImage(image.storageKey);
    }

    // 2. Remover registro do banco de dados
    await db.generatedImage.delete({
      where: { id: image.id },
    });

    return NextResponse.json({
      success: true,
      message: "Imagem excluída com sucesso e espaço liberado.",
      deletedId: id,
    });
  } catch (error: any) {
    if (error instanceof AuthorizationError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    if (error instanceof AuthenticationError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    console.error("Erro ao excluir imagem gerada:", error);
    return NextResponse.json(
      { error: error?.message || "Falha ao excluir imagem." },
      { status: 500 }
    );
  }
}

