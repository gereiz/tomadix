import { NextRequest, NextResponse } from "next/server";
import { requireParameterAdmin, AuthorizationError, AuthenticationError } from "@/lib/auth";
import { VisualReferenceService } from "@/modules/visual-library/visual-reference.service";
import { db } from "@/lib/db";

export async function PUT(request: NextRequest) {
  try {
    await requireParameterAdmin();
    const body = await request.json().catch(() => ({}));

    const { optionValue, paramDefinitionId, category, ...updates } = body;

    if (!optionValue) {
      return NextResponse.json({ error: "optionValue é obrigatório." }, { status: 400 });
    }

    // Se forneceu paramDefinitionId, atualiza diretamente
    if (paramDefinitionId) {
      const updated = await VisualReferenceService.updateOptionReference(
        paramDefinitionId,
        optionValue,
        updates
      );
      return NextResponse.json({ success: true, paramDefinition: updated });
    }

    // Caso contrário, procura definições com essa opção e atualiza
    const definitionsWithOption = await db.parameterDefinition.findMany({
      where: {
        type: { in: ["SELECT", "MULTISELECT"] },
      },
    });

    let updatedCount = 0;
    for (const def of definitionsWithOption) {
      const opts = (def.options as any[]) || [];
      const matchIndex = opts.findIndex(
        (o) => String(o.value).toLowerCase() === String(optionValue).toLowerCase()
      );

      if (matchIndex >= 0) {
        opts[matchIndex] = {
          ...opts[matchIndex],
          ...updates,
          updatedAt: new Date().toISOString(),
        };

        await db.parameterDefinition.update({
          where: { id: def.id },
          data: { options: opts },
        });
        updatedCount++;
      }
    }

    return NextResponse.json({
      success: true,
      updatedCount,
      message: `Referência para '${optionValue}' atualizada em ${updatedCount} definição(ões).`,
    });
  } catch (error: any) {
    if (error instanceof AuthorizationError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    if (error instanceof AuthenticationError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    return NextResponse.json(
      { error: error?.message || "Erro ao atualizar opção visual." },
      { status: 400 }
    );
  }
}
