import { NextRequest, NextResponse } from "next/server";
import { getCurrentWorkspace, AuthenticationError, AuthorizationError } from "@/lib/auth";
import { db } from "@/lib/db";

export interface StudioFeedItem {
  id: string;
  type: "PROJECT" | "CHARACTER" | "ENVIRONMENT" | "SCENE" | "PROMPT";
  title: string;
  description: string;
  badge: string;
  projectId?: string;
  projectName?: string;
  imageUrl?: string | null;
  metadata?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
  href: string;
}

export async function GET(request: NextRequest) {
  try {
    const { workspace } = await getCurrentWorkspace(null, "projects:read");
    const { searchParams } = new URL(request.url);

    const type = searchParams.get("type") || "all"; // all | projects | characters | environments | scenes | prompts
    const projectId = searchParams.get("projectId") || undefined;
    const search = searchParams.get("search")?.trim() || "";
    const sort = searchParams.get("sort") || "updatedAt_desc";
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(50, Math.max(6, parseInt(searchParams.get("limit") || "24", 10)));

    // 1. Obter projetos do workspace acessíveis
    const projectsWhere: any = {
      workspaceId: workspace.id,
      isArchived: false,
    };
    if (projectId) {
      projectsWhere.id = projectId;
    }
    if (search && (type === "all" || type === "projects")) {
      projectsWhere.OR = [
        { title: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
      ];
    }

    const availableProjects = await db.project.findMany({
      where: { workspaceId: workspace.id, isArchived: false },
      select: { id: true, title: true },
    });
    const accessibleProjectIds = availableProjects.map((p) => p.id);
    const projectNameMap = new Map(availableProjects.map((p) => [p.id, p.title]));

    const items: StudioFeedItem[] = [];

    // EXECUÇÃO PARALELIZADA DE CONSULTAS (ELIMINAÇÃO DE GARGALO CASCATA / WATERFALL)
    const shouldFetchProjects = (type === "all" || type === "projects") && !projectId;
    const shouldFetchCharacters = (type === "all" || type === "characters") && accessibleProjectIds.length > 0;
    const shouldFetchEnvironments = (type === "all" || type === "environments") && accessibleProjectIds.length > 0;
    const shouldFetchScenes = (type === "all" || type === "scenes") && accessibleProjectIds.length > 0;
    const shouldFetchPrompts = (type === "all" || type === "prompts") && accessibleProjectIds.length > 0;

    const charWhere: any = shouldFetchCharacters
      ? {
          projectId: projectId ? projectId : { in: accessibleProjectIds },
          isArchived: false,
          ...(search
            ? {
                OR: [
                  { name: { contains: search, mode: "insensitive" } },
                  { description: { contains: search, mode: "insensitive" } },
                ],
              }
            : {}),
        }
      : null;

    const envWhere: any = shouldFetchEnvironments
      ? {
          projectId: projectId ? projectId : { in: accessibleProjectIds },
          isArchived: false,
          ...(search
            ? {
                OR: [
                  { name: { contains: search, mode: "insensitive" } },
                  { description: { contains: search, mode: "insensitive" } },
                ],
              }
            : {}),
        }
      : null;

    const sceneWhere: any = shouldFetchScenes
      ? {
          projectId: projectId ? projectId : { in: accessibleProjectIds },
          ...(search
            ? {
                OR: [
                  { title: { contains: search, mode: "insensitive" } },
                  { description: { contains: search, mode: "insensitive" } },
                ],
              }
            : {}),
        }
      : null;

    const promptWhere: any = shouldFetchPrompts
      ? {
          projectId: projectId ? projectId : { in: accessibleProjectIds },
          ...(search
            ? {
                OR: [
                  { targetTool: { contains: search, mode: "insensitive" } },
                  { templateKey: { contains: search, mode: "insensitive" } },
                ],
              }
            : {}),
        }
      : null;

    // Paginação correta sobre fontes agregadas: cada tipo traz até (page * limit) itens já na
    // ordenação pedida; o merge em memória escolhe a janela da página. O total vem de COUNT no banco.
    const fetchLimit = page * limit;
    const orderFor = (titleField: string, updatedField: "updatedAt" | "createdAt") =>
      sort === "title_asc"
        ? { [titleField]: "asc" as const }
        : sort === "createdAt_asc"
        ? { createdAt: "asc" as const }
        : { [updatedField]: "desc" as const };

    const [
      [projects, characters, environments, scenes, prompts],
      [projectsTotal, charactersTotal, environmentsTotal, scenesTotal, promptsTotal],
    ] = await Promise.all([
      Promise.all([
      shouldFetchProjects
        ? db.project.findMany({
            where: projectsWhere,
            orderBy: orderFor("title", "updatedAt"),
            take: fetchLimit,
            select: {
              id: true,
              title: true,
              description: true,
              genre: true,
              configuration: true,
              createdAt: true,
              updatedAt: true,
              _count: {
                select: {
                  characters: true,
                  environments: true,
                  scenes: true,
                  generations: true,
                },
              },
            },
          })
        : Promise.resolve([]),

      shouldFetchCharacters
        ? db.character.findMany({
            where: charWhere,
            orderBy: orderFor("name", "updatedAt"),
            take: fetchLimit,
            select: {
              id: true,
              projectId: true,
              name: true,
              description: true,
              attributes: true,
              createdAt: true,
              updatedAt: true,
              _count: { select: { sceneLinks: true } },
            },
          })
        : Promise.resolve([]),

      shouldFetchEnvironments
        ? db.environment.findMany({
            where: envWhere,
            orderBy: orderFor("name", "updatedAt"),
            take: fetchLimit,
            select: {
              id: true,
              projectId: true,
              name: true,
              description: true,
              attributes: true,
              createdAt: true,
              updatedAt: true,
              _count: { select: { sceneLinks: true } },
            },
          })
        : Promise.resolve([]),

      shouldFetchScenes
        ? db.scene.findMany({
            where: sceneWhere,
            orderBy: orderFor("title", "updatedAt"),
            take: fetchLimit,
            select: {
              id: true,
              projectId: true,
              title: true,
              description: true,
              order: true,
              durationSeconds: true,
              createdAt: true,
              updatedAt: true,
              characters: { include: { character: { select: { name: true } } }, take: 3 },
              environments: { include: { environment: { select: { name: true } } }, take: 1 },
            },
          })
        : Promise.resolve([]),

      shouldFetchPrompts
        ? db.promptVersion.findMany({
            where: promptWhere,
            orderBy: orderFor("targetTool", "createdAt"),
            take: fetchLimit,
            select: {
              id: true,
              projectId: true,
              templateKey: true,
              templateVersion: true,
              targetTool: true,
              modelName: true,
              outputText: true,
              createdAt: true,
              // Over-fetching eliminado: exclui inputSnapshot e outputJson que pesavam megabytes
            },
          })
        : Promise.resolve([]),
      ]),
      Promise.all([
        shouldFetchProjects ? db.project.count({ where: projectsWhere }) : Promise.resolve(0),
        shouldFetchCharacters ? db.character.count({ where: charWhere }) : Promise.resolve(0),
        shouldFetchEnvironments ? db.environment.count({ where: envWhere }) : Promise.resolve(0),
        shouldFetchScenes ? db.scene.count({ where: sceneWhere }) : Promise.resolve(0),
        shouldFetchPrompts ? db.promptVersion.count({ where: promptWhere }) : Promise.resolve(0),
      ]),
    ]);
    const total = projectsTotal + charactersTotal + environmentsTotal + scenesTotal + promptsTotal;

    // PROCESSAMENTO DOS RESULTADOS AGREGADOS
    for (const p of projects) {
      items.push({
        id: p.id,
        type: "PROJECT",
        title: p.title,
        description: p.description || "Projeto cinematográfico",
        badge: p.genre || "Projeto",
        metadata: {
          scenesCount: p._count.scenes,
          charactersCount: p._count.characters,
          environmentsCount: p._count.environments,
          generationsCount: p._count.generations,
          aspectRatio: (p.configuration as any)?.aspectRatio || "16:9",
          targetPlatform: (p.configuration as any)?.targetPlatform || "Google Flow",
        },
        createdAt: p.createdAt.toISOString(),
        updatedAt: p.updatedAt.toISOString(),
        href: `/projects/${p.id}`,
      });
    }

    for (const c of characters) {
      items.push({
        id: c.id,
        type: "CHARACTER",
        title: c.name,
        description: c.description || (c.attributes as any)?.visualIdentity || "Personagem do estúdio",
        badge: "Personagem",
        projectId: c.projectId,
        projectName: projectNameMap.get(c.projectId),
        metadata: {
          sceneLinksCount: c._count.sceneLinks,
          visualIdentity: (c.attributes as any)?.visualIdentity,
        },
        createdAt: c.createdAt.toISOString(),
        updatedAt: c.updatedAt.toISOString(),
        href: `/projects/${c.projectId}?tab=characters`,
      });
    }

    for (const e of environments) {
      items.push({
        id: e.id,
        type: "ENVIRONMENT",
        title: e.name,
        description: e.description || (e.attributes as any)?.spatialFeatures || "Ambiente / Cenário",
        badge: "Ambiente",
        projectId: e.projectId,
        projectName: projectNameMap.get(e.projectId),
        metadata: {
          sceneLinksCount: e._count.sceneLinks,
        },
        createdAt: e.createdAt.toISOString(),
        updatedAt: e.updatedAt.toISOString(),
        href: `/projects/${e.projectId}?tab=environments`,
      });
    }

    for (const s of scenes) {
      items.push({
        id: s.id,
        type: "SCENE",
        title: s.title,
        description: s.description || "Tomada cinematográfica decupada",
        badge: `Cena #${s.order}`,
        projectId: s.projectId,
        projectName: projectNameMap.get(s.projectId),
        metadata: {
          order: s.order,
          durationSeconds: s.durationSeconds,
          characterNames: s.characters.map((c) => c.character.name),
          environmentName: s.environments[0]?.environment.name,
        },
        createdAt: s.createdAt.toISOString(),
        updatedAt: s.updatedAt.toISOString(),
        href: `/projects/${s.projectId}?tab=scenes`,
      });
    }

    for (const pr of prompts) {
      const previewText = pr.outputText ? pr.outputText.slice(0, 600) : `Prompt ${pr.templateKey} (${pr.targetTool})`;

      items.push({
        id: pr.id,
        type: "PROMPT",
        title: `Prompt v${pr.templateVersion} — ${pr.targetTool}`,
        description: previewText,
        badge: pr.targetTool,
        projectId: pr.projectId,
        projectName: projectNameMap.get(pr.projectId),
        metadata: {
          modelName: pr.modelName,
          templateKey: pr.templateKey,
        },
        createdAt: pr.createdAt.toISOString(),
        updatedAt: pr.createdAt.toISOString(),
        href: `/projects/${pr.projectId}?tab=prompts`,
      });
    }

    // Ordenação combinada
    if (sort === "title_asc") {
      items.sort((a, b) => a.title.localeCompare(b.title));
    } else if (sort === "createdAt_asc") {
      items.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    } else {
      // updatedAt_desc
      items.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
    }

    // Paginação dos itens agregados
    const startIndex = (page - 1) * limit;
    const paginatedItems = items.slice(startIndex, startIndex + limit);

    return NextResponse.json({
      data: paginatedItems,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
      availableProjects,
    });
  } catch (error) {
    if (error instanceof AuthenticationError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    if (error instanceof AuthorizationError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    console.error("Erro no feed do estúdio:", error);
    return NextResponse.json({ error: "Erro interno ao carregar a galeria do estúdio." }, { status: 500 });
  }
}
