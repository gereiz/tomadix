import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const total = await prisma.imageModelConfig.count();
  const enabled = await prisma.imageModelConfig.count({ where: { isEnabled: true } });
  const available = await prisma.imageModelConfig.count({ where: { isAvailable: true } });
  const both = await prisma.imageModelConfig.count({ where: { isEnabled: true, isAvailable: true } });

  console.log({ total, enabled, available, both });

  const sample = await prisma.imageModelConfig.findMany({ take: 5 });
  console.log('Sample:', sample.map(s => ({
    modelId: s.modelId,
    name: s.name,
    isEnabled: s.isEnabled,
    isAvailable: s.isAvailable
  })));
}

main().catch(console.error).finally(() => prisma.$disconnect());
