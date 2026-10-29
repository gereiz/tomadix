import { db } from "../src/lib/db";
import { ProjectService } from "../src/modules/projects/project.service";
import { ParameterService } from "../src/modules/parameters/parameter.service";

async function runBenchmarkEtapa1() {
  console.log("=== BENCHMARK DE PERFORMANCE: ETAPA 1 (PÓS-OTIMIZAÇÃO) ===");

  const workspace = await db.workspace.findFirst();
  if (!workspace) {
    console.log("Nenhum workspace encontrado.");
    return;
  }

  // 1. Primeira chamada de listParameters (carrega do banco e popula cache)
  const t1_0 = performance.now();
  const p1 = await ParameterService.listParameters(workspace.id, { enabled: true });
  const t1 = performance.now() - t1_0;
  console.log(`[1] listParameters (Cold Cache / BD): ${t1.toFixed(2)}ms | Qtd: ${p1.length}`);

  // 2. Segunda chamada de listParameters (Hit direto no cache em memória)
  const t2_0 = performance.now();
  const p2 = await ParameterService.listParameters(workspace.id, { enabled: true });
  const t2 = performance.now() - t2_0;
  console.log(`[2] listParameters (Cache Hit em Memória): ${t2.toFixed(3)}ms | Qtd: ${p2.length}`);

  // 3. Terceira chamada com escopo (Hit no cache com filtro)
  const t3_0 = performance.now();
  const p3 = await ParameterService.listParameters(workspace.id, { scope: "GLOBAL", enabled: true });
  const t3 = performance.now() - t3_0;
  console.log(`[3] listParameters scope=GLOBAL (Cache Hit): ${t3.toFixed(3)}ms | Qtd: ${p3.length}`);

  // 4. Teste de Paginação no Servidor de Projetos
  const tProj0 = performance.now();
  const projectsPaginated = await ProjectService.listProjects(workspace.id, {
    status: "active",
    sort: "updatedAt_desc",
    page: 1,
    limit: 10,
  });
  const tProj = performance.now() - tProj0;
  console.log(`[4] listProjects com paginação (limit=10): ${tProj.toFixed(2)}ms | Itens: ${projectsPaginated.length} | Total: ${projectsPaginated.total} | TotalPages: ${projectsPaginated.totalPages}`);

  // 5. Teste de Invalidação de Cache
  ParameterService.invalidateCache(workspace.id);
  const t5_0 = performance.now();
  const p5 = await ParameterService.listParameters(workspace.id, { enabled: true });
  const t5 = performance.now() - t5_0;
  console.log(`[5] listParameters pós-invalidação (Re-população): ${t5.toFixed(2)}ms | Qtd: ${p5.length}`);

  console.log("=== COMPARAÇÃO DE GANHOS ===");
  console.log(`- Busca de parâmetros: de ~855ms para ${t2.toFixed(3)}ms (Aceleração de mais de ${Math.round(855 / Math.max(t2, 0.05))}x no cache hit)`);
  console.log(`- Paginação de projetos: implementada com limit/skip e metadados no banco.`);
  
  process.exit(0);
}

runBenchmarkEtapa1().catch((err) => {
  console.error("Erro no benchmark da Etapa 1:", err);
  process.exit(1);
});
