import { PrismaClient } from "@prisma/client";
import { performance } from "perf_hooks";

const prisma = new PrismaClient({
  log: ["error"],
});

interface MetricResult {
  operation: string;
  category: "Network/RTT" | "Auth" | "Projects" | "Feed/Gallery" | "Parameters" | "Scenes";
  coldMs: number;
  warmRuns: number[];
  p50Ms: number;
  p95Ms: number;
  meanMs: number;
  minMs: number;
  maxMs: number;
  rowsCount: number;
  notes?: string;
}

function calculatePercentile(values: number[], percentile: number): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.ceil((percentile / 100) * sorted.length) - 1;
  return Number(sorted[Math.max(0, Math.min(index, sorted.length - 1))].toFixed(2));
}

function summarizeRuns(name: string, category: MetricResult["category"], cold: number, warm: number[], rows = 0, notes?: string): MetricResult {
  const allWarm = warm.length > 0 ? warm : [cold];
  const mean = Number((allWarm.reduce((sum, v) => sum + v, 0) / allWarm.length).toFixed(2));
  return {
    operation: name,
    category,
    coldMs: Number(cold.toFixed(2)),
    warmRuns: warm.map((v) => Number(v.toFixed(2))),
    p50Ms: calculatePercentile(allWarm, 50),
    p95Ms: calculatePercentile(allWarm, 95),
    meanMs: mean,
    minMs: Number(Math.min(...allWarm).toFixed(2)),
    maxMs: Number(Math.max(...allWarm).toFixed(2)),
    rowsCount: rows,
    notes,
  };
}

async function runBenchmark() {
  console.log("======================================================================");
  console.log("🚀 TOMADIX — DIAGNÓSTICO CIENTÍFICO DE DESEMPENHO DO BANCO DE DADOS");
  console.log("======================================================================");
  console.log(`⏰ Início: ${new Date().toISOString()}`);
  console.log(`🌍 Endpoint: aws-0-us-east-2.pooler.supabase.com:6543 (PgBouncer)`);
  console.log(`💻 Cliente: Localhost Windows (Brasil -> Ohio / WAN Transcontinental)`);
  console.log("----------------------------------------------------------------------\n");

  const results: MetricResult[] = [];
  const WARM_ITERATIONS = 5;

  // 1. LATÊNCIA BRUTA DE REDE (SELECT 1)
  console.log("📡 [1/6] Medindo latência de rede e round-trip (SELECT 1)...");
  let t0 = performance.now();
  await prisma.$queryRaw`SELECT 1 as ping`;
  const pingCold = performance.now() - t0;

  const pingWarm: number[] = [];
  for (let i = 0; i < WARM_ITERATIONS; i++) {
    const tStart = performance.now();
    await prisma.$queryRaw`SELECT 1 as ping`;
    pingWarm.push(performance.now() - tStart);
  }
  results.push(summarizeRuns("Ping de Conexão (SELECT 1)", "Network/RTT", pingCold, pingWarm, 1, "Mede a latência base TCP + SSL + PgBouncer"));

  // Encontrar workspace e usuário com projetos existentes
  let sampleUser = await prisma.user.findFirst({
    where: {
      memberships: {
        some: {
          workspace: {
            projects: { some: {} },
          },
        },
      },
    },
    include: {
      memberships: {
        include: {
          workspace: {
            include: {
              _count: {
                select: { projects: true },
              },
            },
          },
        },
      },
    },
  });

  if (!sampleUser) {
    sampleUser = await prisma.user.findFirst({
      where: { email: { in: ["georgie.reis@outlook.com", "geoscooby2@gmail.com"] } },
      include: {
        memberships: {
          include: {
            workspace: {
              include: {
                _count: { select: { projects: true } },
              },
            },
          },
        },
      },
    });
  }

  if (!sampleUser || !sampleUser.memberships[0]?.workspace) {
    sampleUser = await prisma.user.findFirst({
      include: {
        memberships: {
          include: { workspace: { include: { _count: { select: { projects: true } } } } },
        },
      },
    });
  }

  if (!sampleUser || !sampleUser.memberships[0]?.workspace) {
    console.error("❌ Nenhum usuário ou workspace encontrado no banco para testes.");
    process.exit(1);
  }

  const testUserId = sampleUser.id;
  const targetMembership = sampleUser.memberships.find((m) => m.workspace._count.projects > 0) || sampleUser.memberships[0];
  const testWorkspaceId = targetMembership.workspaceId;
  console.log(`👤 Usuário de teste: ${sampleUser.email} (${testUserId})`);
  console.log(`🏢 Workspace de teste: ${targetMembership.workspace.name} (${testWorkspaceId}) com ${targetMembership.workspace._count.projects} projetos\n`);

  // 2. AUTENTICAÇÃO E VALIDAÇÃO DE USUÁRIO COM WORKSPACES
  console.log("🔑 [2/6] Medindo consulta de usuário e memberships (Auth)...");
  t0 = performance.now();
  let userRecord = await prisma.user.findUnique({
    where: { id: testUserId },
    include: {
      memberships: {
        include: { workspace: true },
      },
    },
  });
  const authCold = performance.now() - t0;

  const authWarm: number[] = [];
  for (let i = 0; i < WARM_ITERATIONS; i++) {
    const tStart = performance.now();
    await prisma.user.findUnique({
      where: { id: testUserId },
      include: {
        memberships: {
          include: { workspace: true },
        },
      },
    });
    authWarm.push(performance.now() - tStart);
  }
  results.push(summarizeRuns("Busca de Usuário + Workspaces", "Auth", authCold, authWarm, userRecord ? 1 : 0, "Query executada a cada requisição não cacheada"));

  // 3. PROJETOS COM CONTAGENS AGREGADAS
  console.log("📁 [3/6] Medindo listagem de projetos com contagens agregadas (_count)...");
  t0 = performance.now();
  let projectsList = await prisma.project.findMany({
    where: { workspaceId: testWorkspaceId, isArchived: false },
    orderBy: { updatedAt: "desc" },
    take: 24,
    include: {
      _count: {
        select: {
          characters: true,
          environments: true,
          scenes: true,
          generations: true,
        },
      },
    },
  });
  const projectsCold = performance.now() - t0;

  const projectsWarm: number[] = [];
  for (let i = 0; i < WARM_ITERATIONS; i++) {
    const tStart = performance.now();
    await prisma.project.findMany({
      where: { workspaceId: testWorkspaceId, isArchived: false },
      orderBy: { updatedAt: "desc" },
      take: 24,
      include: {
        _count: {
          select: {
            characters: true,
            environments: true,
            scenes: true,
            generations: true,
          },
        },
      },
    });
    projectsWarm.push(performance.now() - tStart);
  }
  results.push(summarizeRuns("Listagem de Projetos + _count", "Projects", projectsCold, projectsWarm, projectsList.length, "Dashboard principal de projetos"));

  // 4. PARÂMETROS DINÂMICOS
  console.log("⚙️  [4/6] Medindo consultas de parâmetros dinâmicos...");
  t0 = performance.now();
  const countParams = await prisma.parameterDefinition.count({
    where: { workspaceId: testWorkspaceId },
  });
  const paramCountCold = performance.now() - t0;

  const paramCountWarm: number[] = [];
  for (let i = 0; i < WARM_ITERATIONS; i++) {
    const tStart = performance.now();
    await prisma.parameterDefinition.count({
      where: { workspaceId: testWorkspaceId },
    });
    paramCountWarm.push(performance.now() - tStart);
  }
  results.push(summarizeRuns("Count de Parâmetros do Workspace", "Parameters", paramCountCold, paramCountWarm, countParams, "Executado em ensureDefaultParameters"));

  t0 = performance.now();
  const paramsList = await prisma.parameterDefinition.findMany({
    where: {
      OR: [{ workspaceId: testWorkspaceId }, { workspaceId: null }],
      enabled: true,
    },
    orderBy: [{ order: "asc" }, { label: "asc" }],
  });
  const paramListCold = performance.now() - t0;

  const paramListWarm: number[] = [];
  for (let i = 0; i < WARM_ITERATIONS; i++) {
    const tStart = performance.now();
    await prisma.parameterDefinition.findMany({
      where: {
        OR: [{ workspaceId: testWorkspaceId }, { workspaceId: null }],
        enabled: true,
      },
      orderBy: [{ order: "asc" }, { label: "asc" }],
    });
    paramListWarm.push(performance.now() - tStart);
  }
  results.push(summarizeRuns("Catálogo de Parâmetros (Global + Workspace)", "Parameters", paramListCold, paramListWarm, paramsList.length, "Carregamento do estúdio e formulários"));

  // 5. CENAS E RELACIONAMENTOS HIERÁRQUICOS
  console.log("🎬 [5/6] Medindo busca de cenas com personagens e ambientes...");
  const sampleProject = projectsList[0];
  const targetProjectId = sampleProject ? sampleProject.id : undefined;

  t0 = performance.now();
  const scenesList = await prisma.scene.findMany({
    where: targetProjectId ? { projectId: targetProjectId } : { project: { workspaceId: testWorkspaceId } },
    orderBy: { order: "asc" },
    include: {
      characters: { include: { character: { select: { name: true } } }, take: 3 },
      environments: { include: { environment: { select: { name: true } } }, take: 1 },
      promptVersions: { select: { id: true, templateKey: true, targetTool: true, createdAt: true }, take: 5 },
    },
  });
  const scenesCold = performance.now() - t0;

  const scenesWarm: number[] = [];
  for (let i = 0; i < WARM_ITERATIONS; i++) {
    const tStart = performance.now();
    await prisma.scene.findMany({
      where: targetProjectId ? { projectId: targetProjectId } : { project: { workspaceId: testWorkspaceId } },
      orderBy: { order: "asc" },
      include: {
        characters: { include: { character: { select: { name: true } } }, take: 3 },
        environments: { include: { environment: { select: { name: true } } }, take: 1 },
        promptVersions: { select: { id: true, templateKey: true, targetTool: true, createdAt: true }, take: 5 },
      },
    });
    scenesWarm.push(performance.now() - tStart);
  }
  results.push(summarizeRuns("Cenas com Decupagem e PromptVersions", "Scenes", scenesCold, scenesWarm, scenesList.length, "Edição de roteiro e decupagem"));

  // 6. GARGALO DO FEED / GALERIA DO ESTÚDIO (SEQUENCIAL VS PARALELO)
  console.log("🖼️  [6/6] Comparando Feed do Estúdio: Cascata Sequencial (ATUAL) vs Paralelo...");

  // Pegar projetos disponíveis
  const availableProjects = await prisma.project.findMany({
    where: { workspaceId: testWorkspaceId, isArchived: false },
    select: { id: true, title: true },
  });
  const projectIds = availableProjects.map((p) => p.id);

  // A) CASCATA SEQUENCIAL (COMO ESTÁ IMPLEMENTADO HOJE NO FEED)
  async function runSequentialFeed() {
    // Query 1
    const p = await prisma.project.findMany({
      where: { workspaceId: testWorkspaceId, isArchived: false },
      orderBy: { updatedAt: "desc" },
      take: 24,
      include: {
        _count: {
          select: { characters: true, environments: true, scenes: true, generations: true },
        },
      },
    });
    // Query 2
    const c = projectIds.length > 0 ? await prisma.character.findMany({
      where: { projectId: { in: projectIds }, isArchived: false },
      orderBy: { updatedAt: "desc" },
      take: 24,
      include: { _count: { select: { sceneLinks: true } } },
    }) : [];
    // Query 3
    const e = projectIds.length > 0 ? await prisma.environment.findMany({
      where: { projectId: { in: projectIds }, isArchived: false },
      orderBy: { updatedAt: "desc" },
      take: 24,
      include: { _count: { select: { sceneLinks: true } } },
    }) : [];
    // Query 4
    const s = projectIds.length > 0 ? await prisma.scene.findMany({
      where: { projectId: { in: projectIds } },
      orderBy: { updatedAt: "desc" },
      take: 24,
      include: {
        characters: { include: { character: { select: { name: true } } }, take: 3 },
        environments: { include: { environment: { select: { name: true } } }, take: 1 },
      },
    }) : [];
    // Query 5 (FULL OVER-FETCHING: SEM SELECT RESTRITIVO)
    const pr = projectIds.length > 0 ? await prisma.promptVersion.findMany({
      where: { projectId: { in: projectIds } },
      orderBy: { createdAt: "desc" },
      take: 24,
    }) : [];

    return { count: p.length + c.length + e.length + s.length + pr.length };
  }

  t0 = performance.now();
  const seqRes = await runSequentialFeed();
  const seqCold = performance.now() - t0;

  const seqWarm: number[] = [];
  for (let i = 0; i < WARM_ITERATIONS; i++) {
    const tStart = performance.now();
    await runSequentialFeed();
    seqWarm.push(performance.now() - tStart);
  }
  results.push(summarizeRuns("Feed: Cascata Sequencial (ATUAL)", "Feed/Gallery", seqCold, seqWarm, seqRes.count, "5 queries executadas em série (waterfall de latência)"));

  // B) EXECUÇÃO PARALELIZADA COM PROJEÇÃO OTIMIZADA (OTIMIZAÇÃO PROPOSTA)
  async function runParallelOptimizedFeed() {
    const [p, c, e, s, pr] = await Promise.all([
      prisma.project.findMany({
        where: { workspaceId: testWorkspaceId, isArchived: false },
        orderBy: { updatedAt: "desc" },
        take: 24,
        select: {
          id: true,
          title: true,
          description: true,
          genre: true,
          configuration: true,
          createdAt: true,
          updatedAt: true,
          _count: {
            select: { characters: true, environments: true, scenes: true, generations: true },
          },
        },
      }),
      projectIds.length > 0
        ? prisma.character.findMany({
            where: { projectId: { in: projectIds }, isArchived: false },
            orderBy: { updatedAt: "desc" },
            take: 24,
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
      projectIds.length > 0
        ? prisma.environment.findMany({
            where: { projectId: { in: projectIds }, isArchived: false },
            orderBy: { updatedAt: "desc" },
            take: 24,
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
      projectIds.length > 0
        ? prisma.scene.findMany({
            where: { projectId: { in: projectIds } },
            orderBy: { updatedAt: "desc" },
            take: 24,
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
      projectIds.length > 0
        ? prisma.promptVersion.findMany({
            where: { projectId: { in: projectIds } },
            orderBy: { createdAt: "desc" },
            take: 24,
            select: {
              id: true,
              projectId: true,
              templateKey: true,
              templateVersion: true,
              targetTool: true,
              modelName: true,
              outputText: true,
              createdAt: true,
              // EXCLUI inputSnapshot E outputJson QUE ERAM PESADOS
            },
          })
        : Promise.resolve([]),
    ]);

    return { count: p.length + c.length + e.length + s.length + pr.length };
  }

  t0 = performance.now();
  const parRes = await runParallelOptimizedFeed();
  const parCold = performance.now() - t0;

  const parWarm: number[] = [];
  for (let i = 0; i < WARM_ITERATIONS; i++) {
    const tStart = performance.now();
    await runParallelOptimizedFeed();
    parWarm.push(performance.now() - tStart);
  }
  results.push(summarizeRuns("Feed: Paralelo + Projeção Enxuta", "Feed/Gallery", parCold, parWarm, parRes.count, "Promise.all + select restritivo"));

  console.log("\n======================================================================");
  console.log("📊 RESULTADOS DO DIAGNÓSTICO DE PERFORMANCE");
  console.log("======================================================================\n");

  console.table(
    results.map((r) => ({
      Operação: r.operation,
      Categoria: r.category,
      "Frio (ms)": r.coldMs,
      "p50 (ms)": r.p50Ms,
      "p95 (ms)": r.p95Ms,
      "Média (ms)": r.meanMs,
      "Linhas": r.rowsCount,
      Observação: r.notes || "",
    }))
  );

  const speedupFeed = (
    ((results.find((r) => r.operation.includes("Cascata"))!.meanMs -
      results.find((r) => r.operation.includes("Paralelo"))!.meanMs) /
      results.find((r) => r.operation.includes("Cascata"))!.meanMs) *
    100
  ).toFixed(1);

  console.log(`\n⚡ Ganho Potencial Imediato no Feed: ${speedupFeed}% mais rápido`);
  console.log(`📡 Latência média de rede medida (RTT): ~${results[0].meanMs}ms por query`);
  console.log("======================================================================\n");
}

runBenchmark()
  .catch((err) => {
    console.error("Erro fatal no benchmark:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
