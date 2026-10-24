-- CreateEnum
DO $$ BEGIN
  CREATE TYPE "PlanTier" AS ENUM ('FREE', 'PRO', 'TEAM', 'ENTERPRISE');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- CreateEnum
DO $$ BEGIN
  CREATE TYPE "SubscriptionStatus" AS ENUM ('TRIALING', 'ACTIVE', 'PAST_DUE', 'CANCELING', 'CANCELED', 'UNPAID', 'INCOMPLETE');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- CreateEnum
DO $$ BEGIN
  CREATE TYPE "BillingInterval" AS ENUM ('MONTHLY', 'YEARLY');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- AlterTable
ALTER TABLE "Workspace" ADD COLUMN IF NOT EXISTS "creditsBalance" INTEGER NOT NULL DEFAULT 20;

-- CreateTable
CREATE TABLE IF NOT EXISTS "Plan" (
    "id" TEXT NOT NULL,
    "tier" "PlanTier" NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "priceMonthly" INTEGER NOT NULL DEFAULT 0,
    "priceYearly" INTEGER NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'BRL',
    "maxProjects" INTEGER NOT NULL DEFAULT 2,
    "maxMembers" INTEGER NOT NULL DEFAULT 1,
    "monthlyCredits" INTEGER NOT NULL DEFAULT 20,
    "features" JSONB NOT NULL DEFAULT '[]',
    "enabledTemplates" JSONB NOT NULL DEFAULT '[]',
    "exportAllowed" BOOLEAN NOT NULL DEFAULT true,
    "visualBibleAdvanced" BOOLEAN NOT NULL DEFAULT false,
    "gatewayProductId" TEXT,
    "gatewayPriceIdMonthly" TEXT,
    "gatewayPriceIdYearly" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Plan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "Subscription" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "planTier" "PlanTier" NOT NULL DEFAULT 'FREE',
    "status" "SubscriptionStatus" NOT NULL DEFAULT 'ACTIVE',
    "interval" "BillingInterval" NOT NULL DEFAULT 'MONTHLY',
    "billingUserId" TEXT,
    "customerId" TEXT,
    "gatewaySubscriptionId" TEXT,
    "currentPeriodStart" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "currentPeriodEnd" TIMESTAMP(3),
    "cancelAtPeriodEnd" BOOLEAN NOT NULL DEFAULT false,
    "canceledAt" TIMESTAMP(3),
    "trialStart" TIMESTAMP(3),
    "trialEnd" TIMESTAMP(3),
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Subscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "Invoice" (
    "id" TEXT NOT NULL,
    "subscriptionId" TEXT,
    "workspaceId" TEXT NOT NULL,
    "gatewayInvoiceId" TEXT,
    "amountDue" INTEGER NOT NULL,
    "amountPaid" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'BRL',
    "status" TEXT NOT NULL DEFAULT 'paid',
    "hostedInvoiceUrl" TEXT,
    "pdfUrl" TEXT,
    "paidAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Invoice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "CreditLedger" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "balanceAfter" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CreditLedger_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "ProcessedWebhookEvent" (
    "id" TEXT NOT NULL,
    "gateway" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "processedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "payload" JSONB,
    "status" TEXT NOT NULL DEFAULT 'PROCESSED',

    CONSTRAINT "ProcessedWebhookEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "Plan_tier_key" ON "Plan"("tier");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "Subscription_workspaceId_key" ON "Subscription"("workspaceId");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "Subscription_gatewaySubscriptionId_key" ON "Subscription"("gatewaySubscriptionId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Subscription_workspaceId_status_idx" ON "Subscription"("workspaceId", "status");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Subscription_customerId_idx" ON "Subscription"("customerId");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "Invoice_gatewayInvoiceId_key" ON "Invoice"("gatewayInvoiceId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Invoice_workspaceId_createdAt_idx" ON "Invoice"("workspaceId", "createdAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "CreditLedger_workspaceId_createdAt_idx" ON "CreditLedger"("workspaceId", "createdAt");

-- AddForeignKey
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Subscription_workspaceId_fkey') THEN
    ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Subscription_planTier_fkey') THEN
    ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_planTier_fkey" FOREIGN KEY ("planTier") REFERENCES "Plan"("tier") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Invoice_workspaceId_fkey') THEN
    ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Invoice_subscriptionId_fkey') THEN
    ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "Subscription"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'CreditLedger_workspaceId_fkey') THEN
    ALTER TABLE "CreditLedger" ADD CONSTRAINT "CreditLedger_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
