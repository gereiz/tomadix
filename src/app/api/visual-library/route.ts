import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { VisualReferenceService } from "@/modules/visual-library/visual-reference.service";
import { VisualCategory } from "@/modules/visual-library/visual-reference.types";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const category = (searchParams.get("category") as VisualCategory) || undefined;
    const workspaceId = searchParams.get("workspaceId") || undefined;

    const report = await VisualReferenceService.getCoverageReport(workspaceId);
    const options = VisualReferenceService.getCatalogOptions(category);
    const categories = VisualReferenceService.getCategories();

    return NextResponse.json({
      success: true,
      report,
      options,
      categories,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Erro ao carregar dados da biblioteca visual." },
      { status: 500 }
    );
  }
}
