import { db } from "../src/lib/db";
import { ProjectService } from "../src/modules/projects/project.service";
import { ParameterService } from "../src/modules/parameters/parameter.service";
import { ParameterResolver } from "../src/modules/parameters/parameter-resolver.service";

async function runBenchmark() {
  console.log("=== INICIANDO BENCHMARK DE PERFORMANCE DO MVP ===");
  
  // 1. Teste de conexão e busca de workspace
  const t0 = performance.now();
  const workspace = await db.workspace.findFirst();
  const tWorkspace = performance.now() - t0;
  console.log(`[1] Busca do Workspace inicial: ${tWorkspace.toFixed(2)}ms (ID: ${workspace?.id || "nenhum"})`);
  
  if (!workspace) {
    console.log("Nenhum workspace encontrado no banco.");
    return;
  }
  
  // 2. Medição da listagem de parâmetros (sem cache)
  const tParam0 = performance.now();
  const parameters = await db.parameterDefinition.findMany({
    where: { workspaceId: workspace.id, enabled: true },
    orderBy: { order: "asc" },
  });
  const tParam = performance.now() - tParam0;
  const paramPayloadSize = Buffer.byteLength(JSON.stringify(parameters), "utf8");
  console.log(`[2] Busca de Parâmetros do Banco: ${tParam.toFixed(2)}ms | Qtd: ${parameters.length} | Payload: ${(paramPayloadSize / 1024).toFixed(2)} KB`);

  // 3. Medição da listagem de projetos
  const tProj0 = performance.now();
  const projects = await ProjectService.listProjects(workspace.id, {
    status: "active",
    sort: "updatedAt_desc",
  });
  const tProj = performance.now() - tProj0;
  const projPayloadSize = Buffer.byteLength(JSON.stringify(projects), "utf8");
  console.log(`[3] Listagem de Projetos (listProjects com count): ${tProj.toFixed(2)}ms | Qtd: ${projects.length} | Payload: ${(projPayloadSize / 1024).toFixed(2)} KB`);

  // 4. Medição de detalhes de um projeto (se existir)
  if (projects.length > 0) {
    const targetProject = projects[0];
    const tDetail0 = performance.now();
    const detail = await ProjectService.getProjectById(targetProject.id, workspace.id);
    const tDetail = performance.now() - tDetail0;
    const detailPayloadSize = Buffer.byteLength(JSON.stringify(detail), "utf8");
    console.log(`[4] getProjectById (com personagens, cenas e ambientes): ${tDetail.toFixed(2)}ms | Payload: ${(detailPayloadSize / 1024).toFixed(2)} KB`);

    // 5. Medição da resolução de parâmetros em memória
    const tResolv0 = performance.now();
    const allValues = await db.parameterValue.findMany({
      where: { projectId: targetProject.id },
    });
    const tValuesQuery = performance.now() - tResolv0;
    
    const tCalc0 = performance.now();
    const resolved = ParameterResolver.resolveForTarget(parameters, allValues, {
      type: "PROJECT",
      id: targetProject.id,
    });
    const tCalc = performance.now() - tCalc0;
    console.log(`[5] Query de ParameterValue: ${tValuesQuery.toFixed(2)}ms | Cálculo de Resolução em memória: ${tCalc.toFixed(2)}ms | Total resolvidos: ${Object.keys(resolved.resolved).length}`);
  }

  console.log("=== BENCHMARK CONCLUÍDO ===");
  process.exit(0);
}

runBenchmark().catch((err) => {
  console.error("Erro no benchmark:", err);
  process.exit(1);
});
