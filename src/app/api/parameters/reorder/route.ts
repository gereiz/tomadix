import { NextRequest, NextResponse } from "next/server";
import { getCurrentWorkspace, requirePlatformAdmin, AuthorizationError, AuthenticationError } from "@/lib/auth";
import { ParameterService } from "@/modules/parameters/parameter.service";
import { reorderParametersSchema } from "@/modules/parameters/parameter.schema";
import { ZodError } from "zod";

export async function POST(request: NextRequest) {
  try {
    await requirePlatformAdmin();
    const { workspace } = await getCurrentWorkspace(null, "parameters:read");
    const body = await request.json();

    const { orderedIds } = reorderParametersSchema.parse(body);

    await ParameterService.reorderParameters(workspace.id, orderedIds);

    return NextResponse.json({ message: "Ordem dos parâmetros atualizada com sucesso." });
  } catch (error) {
    if (error instanceof AuthenticationError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    if (error instanceof AuthorizationError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    if (error instanceof ZodError) {
      return NextResponse.json({ error: "Lista de identificadores inválida." }, { status: 422 });
    }
    return NextResponse.json({ error: "Erro interno ao reordenar parâmetros." }, { status: 500 });
  }
}
