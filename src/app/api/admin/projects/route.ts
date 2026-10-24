import { NextRequest, NextResponse } from "next/server";
import { requirePlatformAdmin, AuthorizationError, AuthenticationError } from "@/lib/auth";
import { AdminProjectsService } from "@/modules/admin/admin-projects.service";

export async function GET(request: NextRequest) {
  try {
    await requirePlatformAdmin();

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || undefined;
    const status = (searchParams.get("status") as any) || "all";
    const genre = searchParams.get("genre") || undefined;
    const workspaceId = searchParams.get("workspaceId") || undefined;
    const sort = (searchParams.get("sort") as any) || "updated";
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "15", 10);

    const result = await AdminProjectsService.listProjects({
      search,
      status,
      genre,
      workspaceId,
      sort,
      page,
      limit,
    });

    return NextResponse.json(result);
  } catch (error: any) {
    if (error instanceof AuthorizationError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    if (error instanceof AuthenticationError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    console.error("Erro ao listar projetos (admin):", error);
    return NextResponse.json(
      { error: error?.message || "Erro interno ao listar projetos." },
      { status: 500 }
    );
  }
}
