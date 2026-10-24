-- AlterTable Plan: Adiciona campos avançados de identificação, precificação, limites e gateways
ALTER TABLE "Plan"
  ADD COLUMN IF NOT EXISTS "code" TEXT,
  ADD COLUMN IF NOT EXISTS "badge" TEXT,
  ADD COLUMN IF NOT EXISTS "displayOrder" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "isHighlighted" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "targetAudience" TEXT,
  ADD COLUMN IF NOT EXISTS "commercialStatus" TEXT NOT NULL DEFAULT 'ACTIVE',
  ADD COLUMN IF NOT EXISTS "isPublic" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS "annualDiscountPercent" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "trialDays" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "promoPriceMonthly" INTEGER,
  ADD COLUMN IF NOT EXISTS "promoPriceYearly" INTEGER,
  ADD COLUMN IF NOT EXISTS "promoStartsAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "promoEndsAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "isOfferAvailable" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS "externalGatewayIds" JSONB DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS "unlimitedProjects" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "unlimitedMembers" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "maxCharacters" INTEGER,
  ADD COLUMN IF NOT EXISTS "unlimitedCharacters" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS "maxEnvironments" INTEGER,
  ADD COLUMN IF NOT EXISTS "unlimitedEnvironments" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS "maxScenes" INTEGER,
  ADD COLUMN IF NOT EXISTS "unlimitedScenes" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS "maxConcurrentJobs" INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS "rateLimitPerMin" INTEGER NOT NULL DEFAULT 30,
  ADD COLUMN IF NOT EXISTS "maxInputChars" INTEGER NOT NULL DEFAULT 10000,
  ADD COLUMN IF NOT EXISTS "generationTypes" JSONB NOT NULL DEFAULT '["TEXT", "DETAILED", "CINEMATIC"]',
  ADD COLUMN IF NOT EXISTS "hasPremiumTemplates" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "hasAdvancedParameters" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "historyRetentionDays" INTEGER NOT NULL DEFAULT 30,
  ADD COLUMN IF NOT EXISTS "unlimitedHistory" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "exportFormats" JSONB NOT NULL DEFAULT '["TXT", "JSON"]',
  ADD COLUMN IF NOT EXISTS "priorityProcessing" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "customRules" JSONB DEFAULT '{}';

-- Atualiza códigos padrão e constraints
UPDATE "Plan" SET "code" = LOWER("tier"::text) WHERE "code" IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS "Plan_code_key" ON "Plan"("code");

-- CreateTable CommercialPolicy: Sistema declarativo de políticas globais
CREATE TABLE IF NOT EXISTS "CommercialPolicy" (
  "id" TEXT NOT NULL,
  "key" TEXT NOT NULL,
  "category" TEXT NOT NULL,
  "label" TEXT NOT NULL,
  "description" TEXT,
  "dataType" TEXT NOT NULL DEFAULT 'string',
  "value" JSONB NOT NULL,
  "defaultValue" JSONB NOT NULL,
  "validation" JSONB,
  "isSystem" BOOLEAN NOT NULL DEFAULT true,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedBy" TEXT,
  CONSTRAINT "CommercialPolicy_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "CommercialPolicy_key_key" ON "CommercialPolicy"("key");
CREATE INDEX IF NOT EXISTS "CommercialPolicy_category_idx" ON "CommercialPolicy"("category");

-- CreateTable CommercialSnapshot: Snapshot e versionamento imutável de condições contratadas
CREATE TABLE IF NOT EXISTS "CommercialSnapshot" (
  "id" TEXT NOT NULL,
  "subscriptionId" TEXT,
  "workspaceId" TEXT NOT NULL,
  "planTier" "PlanTier" NOT NULL,
  "snapshotData" JSONB NOT NULL,
  "acceptedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "acceptedBy" TEXT,
  "version" TEXT NOT NULL DEFAULT 'v1',
  "reason" TEXT NOT NULL DEFAULT 'NEW_CONTRACT',
  CONSTRAINT "CommercialSnapshot_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "CommercialSnapshot_workspaceId_planTier_idx" ON "CommercialSnapshot"("workspaceId", "planTier");
CREATE INDEX IF NOT EXISTS "CommercialSnapshot_subscriptionId_idx" ON "CommercialSnapshot"("subscriptionId");
