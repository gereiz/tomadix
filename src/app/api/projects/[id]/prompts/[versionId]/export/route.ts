import { NextRequest, NextResponse } from "next/server";
import { getCurrentWorkspace, AuthorizationError } from "@/lib/auth";
import { PromptHistoryService } from "@/modules/prompt-engine/prompt-history.service";

type RouteParams = {
  params: Promise<{ id: string; versionId: string }>;
};

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: projectId, versionId } = await params;
    const { workspace } = await getCurrentWorkspace();
    const { searchParams } = new URL(request.url);
    const download = searchParams.get("download") === "true";
    const format = (searchParams.get("format") || "json").toLowerCase();

    const exportData = await PromptHistoryService.exportVersion(
      versionId,
      projectId,
      workspace.id
    );

    if (download) {
      const isText = format === "txt" || format === "text";
      const fileExt = isText ? "txt" : "json";
      const contentType = isText ? "text/plain; charset=utf-8" : "application/json; charset=utf-8";
      const bodyContent = isText ? (exportData.formattedText || exportData.outputText || "") : JSON.stringify(exportData, null, 2);

      const filename = `tomadix-${exportData.template.key}-v${exportData.versionNumber}-${projectId.slice(
        0,
        6
      )}.${fileExt}`;

      return new NextResponse(bodyContent, {
        headers: {
          "Content-Type": contentType,
          "Content-Disposition": `attachment; filename="${filename}"`,
        },
      });
    }

    return NextResponse.json({
      data: exportData,
    });
  } catch (error: any) {
    if (error instanceof AuthorizationError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    console.error("Erro ao exportar versão de prompt:", error);
    return NextResponse.json(
      { error: error?.message || "Erro ao exportar prompt." },
      { status: 500 }
    );
  }
}
