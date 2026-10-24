import { NextRequest, NextResponse } from "next/server";
import { getCurrentWorkspace, AuthorizationError } from "@/lib/auth";
import { PromptHistoryService } from "@/modules/prompt-engine/prompt-history.service";

type RouteParams = {
  params: Promise<{ id: string }>;
};

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: projectId } = await params;
    const { workspace } = await getCurrentWorkspace();
    const { searchParams } = new URL(request.url);
    const download = searchParams.get("download") === "true";
    const targetTool = searchParams.get("targetTool") || undefined;

    const sequenceManifest = await PromptHistoryService.exportSceneSequence(
      projectId,
      workspace.id,
      { targetTool, format: "json", includeDrafts: false }
    );

    const jsonContent = JSON.stringify(sequenceManifest, null, 2);

    if (download) {
      const filename = `tomadix-sequence-${projectId.slice(0, 6)}.json`;
      return new NextResponse(jsonContent, {
        headers: {
          "Content-Type": "application/json; charset=utf-8",
          "Content-Disposition": `attachment; filename="${filename}"`,
        },
      });
    }

    return NextResponse.json({
      data: sequenceManifest,
    });
  } catch (error: any) {
    if (error instanceof AuthorizationError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    console.error("Erro ao exportar sequência de cenas:", error);
    return NextResponse.json(
      { error: error?.message || "Erro ao exportar sequência de cenas." },
      { status: 500 }
    );
  }
}
