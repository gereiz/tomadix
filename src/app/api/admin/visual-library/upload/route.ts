import { NextRequest, NextResponse } from "next/server";
import { requireParameterAdmin, AuthorizationError, AuthenticationError } from "@/lib/auth";
import { VisualReferenceService } from "@/modules/visual-library/visual-reference.service";

export async function POST(request: NextRequest) {
  try {
    // Exige privilégio de administrador (Plataforma ou Workspace)
    await requireParameterAdmin();

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const optionValue = formData.get("optionValue") as string | null;

    if (!file) {
      return NextResponse.json({ error: "Nenhum arquivo enviado." }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const uploaded = await VisualReferenceService.saveUploadedAsset(
      buffer,
      file.name,
      file.type
    );

    return NextResponse.json({
      success: true,
      url: uploaded.url,
      filename: uploaded.filename,
      sizeBytes: uploaded.sizeBytes,
    });
  } catch (error: any) {
    if (error instanceof AuthorizationError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    if (error instanceof AuthenticationError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    return NextResponse.json(
      { error: error?.message || "Erro ao processar upload de asset visual." },
      { status: 400 }
    );
  }
}
