-- CreateTable PaymentGatewayConfig
CREATE TABLE IF NOT EXISTS "PaymentGatewayConfig" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "identifier" TEXT NOT NULL,
  "provider" TEXT NOT NULL,
  "environment" TEXT NOT NULL DEFAULT 'SANDBOX',
  "status" TEXT NOT NULL DEFAULT 'ACTIVE',
  "connectionStatus" TEXT NOT NULL DEFAULT 'UNTESTED',
  "encryptedCredentials" JSONB,
  "supportedCurrencies" JSONB NOT NULL DEFAULT '["BRL", "USD"]',
  "supportedCountries" JSONB NOT NULL DEFAULT '["BR"]',
  "paymentMethods" JSONB NOT NULL DEFAULT '["CREDIT_CARD"]',
  "lastTestedAt" TIMESTAMP(3),
  "lastError" TEXT,
  "isCheckoutDefault" BOOLEAN NOT NULL DEFAULT false,
  "priorityOrder" INTEGER NOT NULL DEFAULT 0,
  "selectionRules" JSONB DEFAULT '{}',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PaymentGatewayConfig_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "PaymentGatewayConfig_identifier_key" ON "PaymentGatewayConfig"("identifier");
CREATE INDEX IF NOT EXISTS "PaymentGatewayConfig_provider_environment_idx" ON "PaymentGatewayConfig"("provider", "environment");
CREATE INDEX IF NOT EXISTS "PaymentGatewayConfig_status_environment_idx" ON "PaymentGatewayConfig"("status", "environment");

-- CreateTable GatewayPlanPriceMapping
CREATE TABLE IF NOT EXISTS "GatewayPlanPriceMapping" (
  "id" TEXT NOT NULL,
  "gatewayConfigId" TEXT NOT NULL,
  "planTier" "PlanTier" NOT NULL,
  "environment" TEXT NOT NULL DEFAULT 'SANDBOX',
  "externalProductId" TEXT,
  "externalPriceIdMonthly" TEXT,
  "externalPriceIdYearly" TEXT,
  "currency" TEXT NOT NULL DEFAULT 'BRL',
  "syncStatus" TEXT NOT NULL DEFAULT 'SYNCED',
  "lastSyncedAt" TIMESTAMP(3),
  CONSTRAINT "GatewayPlanPriceMapping_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "GatewayPlanPriceMapping_gatewayConfigId_fkey" FOREIGN KEY ("gatewayConfigId") REFERENCES "PaymentGatewayConfig"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "GatewayPlanPriceMapping_planTier_fkey" FOREIGN KEY ("planTier") REFERENCES "Plan"("tier") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "GatewayPlanPriceMapping_gatewayConfigId_planTier_environment_key" ON "GatewayPlanPriceMapping"("gatewayConfigId", "planTier", "environment");
CREATE INDEX IF NOT EXISTS "GatewayPlanPriceMapping_planTier_environment_idx" ON "GatewayPlanPriceMapping"("planTier", "environment");

-- CreateTable PaymentWebhookEvent
CREATE TABLE IF NOT EXISTS "PaymentWebhookEvent" (
  "id" TEXT NOT NULL,
  "eventId" TEXT NOT NULL,
  "gatewayConfigId" TEXT,
  "gateway" TEXT NOT NULL,
  "environment" TEXT NOT NULL DEFAULT 'SANDBOX',
  "eventType" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'PROCESSED',
  "attempts" INTEGER NOT NULL DEFAULT 1,
  "lastError" TEXT,
  "rawPayload" JSONB,
  "processedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PaymentWebhookEvent_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "PaymentWebhookEvent_gatewayConfigId_fkey" FOREIGN KEY ("gatewayConfigId") REFERENCES "PaymentGatewayConfig"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "PaymentWebhookEvent_eventId_key" ON "PaymentWebhookEvent"("eventId");
CREATE INDEX IF NOT EXISTS "PaymentWebhookEvent_gateway_eventType_idx" ON "PaymentWebhookEvent"("gateway", "eventType");
CREATE INDEX IF NOT EXISTS "PaymentWebhookEvent_status_createdAt_idx" ON "PaymentWebhookEvent"("status", "createdAt");
CREATE INDEX IF NOT EXISTS "PaymentWebhookEvent_environment_idx" ON "PaymentWebhookEvent"("environment");
