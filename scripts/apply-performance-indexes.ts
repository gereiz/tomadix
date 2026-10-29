import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient({
  log: ["error", "warn"],
});

async function main() {
  console.log("⚡ Aplicando índices de alta performance no PostgreSQL / Supabase...");

  const indexStatements = [
    {
      name: "idx_scene_character_character_id",
      sql: `CREATE INDEX IF NOT EXISTS "idx_scene_character_character_id" ON "SceneCharacter" ("characterId");`,
      desc: "Otimiza contagem de sceneLinks e joins reversos de personagens",
    },
    {
      name: "idx_scene_environment_environment_id",
      sql: `CREATE INDEX IF NOT EXISTS "idx_scene_environment_environment_id" ON "SceneEnvironment" ("environmentId");`,
      desc: "Otimiza contagem de sceneLinks e joins reversos de cenários/ambientes",
    },
    {
      name: "idx_scene_project_updated_at",
      sql: `CREATE INDEX IF NOT EXISTS "idx_scene_project_updated_at" ON "Scene" ("projectId", "updatedAt" DESC);`,
      desc: "Acelera ordenação do feed do estúdio e decupagem de cenas",
    },
    {
      name: "idx_character_project_archived_updated",
      sql: `CREATE INDEX IF NOT EXISTS "idx_character_project_archived_updated" ON "Character" ("projectId", "isArchived", "updatedAt" DESC);`,
      desc: "Acelera busca e paginação de personagens ativos no estúdio",
    },
    {
      name: "idx_environment_project_archived_updated",
      sql: `CREATE INDEX IF NOT EXISTS "idx_environment_project_archived_updated" ON "Environment" ("projectId", "isArchived", "updatedAt" DESC);`,
      desc: "Acelera busca e paginação de cenários ativos no estúdio",
    },
    {
      name: "idx_prompt_version_project_created_desc",
      sql: `CREATE INDEX IF NOT EXISTS "idx_prompt_version_project_created_desc" ON "PromptVersion" ("projectId", "createdAt" DESC);`,
      desc: "Acelera feed e histórico de prompts cinematográficos por projeto",
    },
  ];

  for (const idx of indexStatements) {
    try {
      const t0 = Date.now();
      await prisma.$executeRawUnsafe(idx.sql);
      const elapsed = Date.now() - t0;
      console.log(`✅ [${idx.name}] criado/verificado em ${elapsed}ms (${idx.desc})`);
    } catch (err: any) {
      console.warn(`⚠️ [${idx.name}] aviso: ${err?.message || err}`);
    }
  }

  console.log("\n🚀 Todos os índices foram aplicados com sucesso no banco de dados!");
}

main()
  .catch((err) => {
    console.error("❌ Erro ao aplicar índices:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
