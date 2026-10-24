import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const REAL_EMAILS = [
  "georgie.reis@outlook.com",
  "geoscooby2@gmail.com",
];

async function main() {
  console.log("🧹 Iniciando limpeza de dados de teste...");

  // Identificar usuários de teste (ex: emails com @example.com, @cinema.com, etc)
  const testUsers = await prisma.user.findMany({
    where: {
      email: { notIn: REAL_EMAILS },
    },
    select: { id: true, email: true },
  });

  const testUserIds = testUsers.map((u) => u.id);
  console.log(`Encontrados ${testUserIds.length} usuários de teste.`);

  // Identificar workspaces que não pertencem aos usuários reais
  const realMemberships = await prisma.membership.findMany({
    where: {
      user: { email: { in: REAL_EMAILS } },
    },
    select: { workspaceId: true },
  });

  const realWorkspaceIds = Array.from(new Set(realMemberships.map((m) => m.workspaceId)));

  const testWorkspaces = await prisma.workspace.findMany({
    where: {
      id: { notIn: realWorkspaceIds },
    },
    select: { id: true, name: true },
  });

  const testWorkspaceIds = testWorkspaces.map((w) => w.id);
  console.log(`Encontrados ${testWorkspaceIds.length} workspaces de teste.`);

  // 1. Deletar projetos de teste
  const deletedProjects = await prisma.project.deleteMany({
    where: {
      workspaceId: { in: testWorkspaceIds },
    },
  });
  console.log(`✓ ${deletedProjects.count} projetos de teste excluídos.`);

  // 2. Limpar logs e webhooks
  await prisma.processedWebhookEvent.deleteMany({});
  await prisma.auditLog.deleteMany({
    where: {
      OR: [
        { workspaceId: { in: testWorkspaceIds } },
        { userId: { in: testUserIds } },
      ],
    },
  });

  // 3. Deletar workspaces de teste
  const deletedWorkspaces = await prisma.workspace.deleteMany({
    where: {
      id: { in: testWorkspaceIds },
    },
  });
  console.log(`✓ ${deletedWorkspaces.count} workspaces de teste excluídos.`);

  // 4. Deletar usuários de teste
  const deletedUsers = await prisma.user.deleteMany({
    where: {
      id: { in: testUserIds },
    },
  });
  console.log(`✓ ${deletedUsers.count} usuários de teste excluídos.`);

  console.log("✨ Limpeza concluída com sucesso! Banco pronto para produção.");
}

main()
  .catch((err) => {
    console.error("Erro na limpeza:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
