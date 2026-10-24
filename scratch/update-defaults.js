const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  await prisma.paymentGatewayConfig.updateMany({
    where: { identifier: 'stripe-sandbox' },
    data: { isCheckoutDefault: false, priorityOrder: 2 },
  });
  await prisma.paymentGatewayConfig.updateMany({
    where: { identifier: 'sandbox-internal' },
    data: { isCheckoutDefault: true, priorityOrder: 1 },
  });
  console.log('Defaults successfully updated in database');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
