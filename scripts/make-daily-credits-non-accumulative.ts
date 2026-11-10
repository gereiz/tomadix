// Uso único: todos os planos passam a ter créditos diários não acumulativos e os
// lotes diários antigos (sem validade) passam a vencer no fim do dia em que foram criados.
// Rodar com: npx tsx scripts/make-daily-credits-non-accumulative.ts
import { CreditOrigin, CreditLotStatus, PrismaClient } from "@prisma/client";
import { CreditDailyMaintenanceService } from "../src/modules/billing/credit-daily-maintenance.service";
import { CreditLotService } from "../src/modules/billing/credit-lot.service";

const prisma = new PrismaClient();

async function main() {
  const plans = await prisma.plan.updateMany({
    where: { dailyCreditsAccumulative: true },
    data: { dailyCreditsAccumulative: false },
  });
  console.log(`Planos atualizados: ${plans.count}`);

  const lots = await prisma.creditLot.findMany({
    where: {
      origin: CreditOrigin.DAILY_RENEWAL,
      status: CreditLotStatus.ACTIVE,
      isAccumulative: true,
      expiresAt: null,
    },
    select: { id: true, createdAt: true },
  });

  for (const lot of lots) {
    const dateKey = CreditDailyMaintenanceService.getTodayDateKey(lot.createdAt);
    await prisma.creditLot.update({
      where: { id: lot.id },
      data: { isAccumulative: false, expiresAt: CreditDailyMaintenanceService.getEndOfDayDate(dateKey) },
    });
  }
  console.log(`Lotes diários ajustados: ${lots.length}`);

  // Expira (com ledger e saldo) o que já venceu; usa o mesmo caminho do cron.
  const expired = await CreditLotService.expireOverdueLots();
  console.log(`Lotes expirados: ${expired.expiredLotsCount} (${expired.expiredCreditsTotal} créditos)`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
