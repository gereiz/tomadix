import { NextRequest, NextResponse } from "next/server";
import { getCurrentWorkspace, AuthorizationError, AuthenticationError } from "@/lib/auth";
import { ProjectService } from "@/modules/projects/project.service";
import { createProjectSchema, listProjectsQuerySchema } from "@/lib/schemas/project";
import { EntitlementError } from "@/modules/billing/entitlement.service";
import { ZodError } from "zod";

export async function GET(request: NextRequest) {
  try {
    const { workspace } = await getCurrentWorkspace(null, "projects:read");
    const { searchParams } = new URL(request.url);

    const query = listProjectsQuerySchema.parse({
      search: searchParams.get("search") ?? undefined,
      status: searchParams.get("status") ?? "active",
      sort: searchParams.get("sort") ?? "updatedAt_desc",
      genre: searchParams.get("genre") ?? undefined,
      page: searchParams.get("page") ?? undefined,
      limit: searchParams.get("limit") ?? undefined,
    });

    const result = await ProjectService.listProjects(workspace.id, query);
    const hasPaginationMeta = (result as any).total !== undefined && query.limit !== undefined;

    return NextResponse.json({
      data: result,
      total: hasPaginationMeta ? (result as any).total : result.length,
      page: hasPaginationMeta ? (result as any).page : 1,
      limit: hasPaginationMeta ? (result as any).limit : result.length,
      totalPages: hasPaginationMeta ? (result as any).totalPages : 1,
    });
  } catch (error) {
    if (error instanceof AuthenticationError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    if (error instanceof AuthorizationError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    if (error instanceof ZodError) {
      return NextResponse.json({ error: "Parâmetros inválidos.", issues: error.issues }, { status: 400 });
    }
    console.error("Erro ao listar projetos:", error);
    return NextResponse.json({ error: "Erro interno ao processar a requisição." }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { workspace } = await getCurrentWorkspace(null, "projects:create");
    const body = await request.json();
    const validatedData = createProjectSchema.parse(body);

    const newProject = await ProjectService.createProject(workspace.id, validatedData);

    return NextResponse.json(
      {
        message: "Projeto criado com sucesso.",
        data: newProject,
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof AuthenticationError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    if (error instanceof AuthorizationError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    if (error instanceof EntitlementError) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: error.statusCode || 403 }
      );
    }
    if (error instanceof ZodError) {
      return NextResponse.json(
        {
          error: "Dados de entrada inválidos.",
          issues: error.issues.map((i) => ({ path: i.path.join("."), message: i.message })),
        },
        { status: 422 }
      );
    }
    console.error("Erro ao criar projeto:", error);
    return NextResponse.json({ error: "Erro interno ao criar o projeto." }, { status: 500 });
  }
}
