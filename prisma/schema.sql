-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "WorkspaceRole" AS ENUM ('OWNER', 'ADMIN', 'MEMBER', 'VIEWER');

-- CreateEnum
CREATE TYPE "ParameterType" AS ENUM ('TEXT', 'TEXTAREA', 'SELECT', 'MULTISELECT', 'BOOLEAN', 'NUMBER', 'RANGE', 'DURATION', 'JSON', 'DATE');

-- CreateEnum
CREATE TYPE "ParameterScope" AS ENUM ('GLOBAL', 'CHARACTER', 'ENVIRONMENT', 'SCENE', 'OUTPUT');

-- CreateEnum
CREATE TYPE "GenerationStatus" AS ENUM ('PENDING', 'RUNNING', 'SUCCEEDED', 'FAILED');

-- CreateEnum
CREATE TYPE "PlanTier" AS ENUM ('FREE', 'PRO', 'TEAM', 'ENTERPRISE');

-- CreateEnum
CREATE TYPE "SubscriptionStatus" AS ENUM ('TRIALING', 'ACTIVE', 'PAST_DUE', 'CANCELING', 'CANCELED', 'UNPAID', 'INCOMPLETE');

-- CreateEnum
CREATE TYPE "BillingInterval" AS ENUM ('MONTHLY', 'YEARLY');

-- CreateEnum
CREATE TYPE "InviteStatus" AS ENUM ('PENDING', 'ACCEPTED', 'DECLINED', 'CANCELED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "PlatformRole" AS ENUM ('USER', 'ADMIN', 'SUPER_ADMIN');

-- CreateEnum
CREATE TYPE "CreditOrigin" AS ENUM ('ADHESION', 'MONTHLY_RENEWAL', 'DAILY_RENEWAL', 'PROMOTIONAL', 'PURCHASED', 'ADMIN_OVERRIDE', 'REFUND', 'LEGACY');

-- CreateEnum
CREATE TYPE "CreditLotStatus" AS ENUM ('ACTIVE', 'EXHAUSTED', 'EXPIRED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "SpaceVisibility" AS ENUM ('PRIVATE', 'TEAM', 'SELECTED');

-- CreateEnum
CREATE TYPE "GeminiKeyStatus" AS ENUM ('HEALTHY', 'DEGRADED', 'RATE_LIMITED', 'SUSPENDED', 'INVALID');

-- CreateEnum
CREATE TYPE "GeminiSelectionStrategy" AS ENUM ('SEQUENTIAL_PRIORITY', 'BALANCED', 'LEAST_USED');

-- CreateEnum
CREATE TYPE "ImageProviderStatus" AS ENUM ('CONNECTED', 'UNCONFIGURED', 'INVALID_KEY', 'INSUFFICIENT_BALANCE', 'ERROR', 'UNREACHABLE');

-- CreateEnum
CREATE TYPE "EmailProviderType" AS ENUM ('GMAIL_SMTP', 'OUTLOOK_SMTP', 'CUSTOM_SMTP', 'OFFICE365_OAUTH2', 'GMAIL_OAUTH2');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "authSubject" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "displayName" TEXT,
    "passwordHash" TEXT,
    "platformRole" "PlatformRole" NOT NULL DEFAULT 'USER',
    "isSuspended" BOOLEAN NOT NULL DEFAULT false,
    "suspendedAt" TIMESTAMP(3),
    "suspensionReason" TEXT,
    "emailConfirmed" BOOLEAN NOT NULL DEFAULT false,
    "emailConfirmationToken" TEXT,
    "emailConfirmationExpiresAt" TIMESTAMP(3),
    "passwordResetToken" TEXT,
    "passwordResetExpiresAt" TIMESTAMP(3),
    "preferences" JSONB DEFAULT '{}',
    "onboardingCompleted" BOOLEAN NOT NULL DEFAULT false,
    "onboardingStep" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConsentRecord" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "consentType" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "granted" BOOLEAN NOT NULL DEFAULT true,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ConsentRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DataSubjectRequest" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "email" TEXT NOT NULL,
    "requestType" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "details" TEXT,
    "resolution" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),

    CONSTRAINT "DataSubjectRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlatformAuditLog" (
    "id" TEXT NOT NULL,
    "adminUserId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "targetType" TEXT NOT NULL,
    "targetId" TEXT,
    "result" TEXT NOT NULL DEFAULT 'SUCCESS',
    "details" JSONB,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PlatformAuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "workspaceId" TEXT,
    "action" TEXT NOT NULL,
    "details" JSONB,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Workspace" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "isPersonal" BOOLEAN NOT NULL DEFAULT false,
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "archivedAt" TIMESTAMP(3),
    "settings" JSONB DEFAULT '{}',
    "creditsBalance" INTEGER NOT NULL DEFAULT 20,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Workspace_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Plan" (
    "id" TEXT NOT NULL,
    "tier" "PlanTier" NOT NULL,
    "code" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "badge" TEXT,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "isHighlighted" BOOLEAN NOT NULL DEFAULT false,
    "targetAudience" TEXT,
    "commercialStatus" TEXT NOT NULL DEFAULT 'ACTIVE',
    "isPublic" BOOLEAN NOT NULL DEFAULT true,
    "priceMonthly" INTEGER NOT NULL DEFAULT 0,
    "priceYearly" INTEGER NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'BRL',
    "annualDiscountPercent" INTEGER NOT NULL DEFAULT 0,
    "trialDays" INTEGER NOT NULL DEFAULT 0,
    "promoPriceMonthly" INTEGER,
    "promoPriceYearly" INTEGER,
    "promoStartsAt" TIMESTAMP(3),
    "promoEndsAt" TIMESTAMP(3),
    "isOfferAvailable" BOOLEAN NOT NULL DEFAULT true,
    "externalGatewayIds" JSONB DEFAULT '{}',
    "maxProjects" INTEGER NOT NULL DEFAULT 2,
    "unlimitedProjects" BOOLEAN NOT NULL DEFAULT false,
    "maxMembers" INTEGER NOT NULL DEFAULT 1,
    "unlimitedMembers" BOOLEAN NOT NULL DEFAULT false,
    "maxCharacters" INTEGER,
    "unlimitedCharacters" BOOLEAN NOT NULL DEFAULT true,
    "maxEnvironments" INTEGER,
    "unlimitedEnvironments" BOOLEAN NOT NULL DEFAULT true,
    "maxScenes" INTEGER,
    "unlimitedScenes" BOOLEAN NOT NULL DEFAULT true,
    "monthlyCredits" INTEGER NOT NULL DEFAULT 20,
    "adhesionCredits" INTEGER NOT NULL DEFAULT 0,
    "dailyCredits" INTEGER NOT NULL DEFAULT 0,
    "dailyCreditsAccumulative" BOOLEAN NOT NULL DEFAULT false,
    "isFreePlan" BOOLEAN NOT NULL DEFAULT false,
    "maxConcurrentJobs" INTEGER NOT NULL DEFAULT 1,
    "rateLimitPerMin" INTEGER NOT NULL DEFAULT 30,
    "maxInputChars" INTEGER NOT NULL DEFAULT 10000,
    "generationTypes" JSONB NOT NULL DEFAULT '["TEXT", "DETAILED", "CINEMATIC"]',
    "hasPremiumTemplates" BOOLEAN NOT NULL DEFAULT false,
    "hasAdvancedParameters" BOOLEAN NOT NULL DEFAULT false,
    "historyRetentionDays" INTEGER NOT NULL DEFAULT 30,
    "unlimitedHistory" BOOLEAN NOT NULL DEFAULT false,
    "exportFormats" JSONB NOT NULL DEFAULT '["TXT", "JSON"]',
    "priorityProcessing" BOOLEAN NOT NULL DEFAULT false,
    "features" JSONB NOT NULL DEFAULT '[]',
    "enabledTemplates" JSONB NOT NULL DEFAULT '[]',
    "exportAllowed" BOOLEAN NOT NULL DEFAULT true,
    "visualBibleAdvanced" BOOLEAN NOT NULL DEFAULT false,
    "hasImageGeneration" BOOLEAN NOT NULL DEFAULT false,
    "imageDailyLimit" INTEGER,
    "imageMonthlyLimit" INTEGER,
    "imageTotalLimit" INTEGER,
    "imageDefaultCost" INTEGER NOT NULL DEFAULT 10,
    "imageAllowedModels" JSONB NOT NULL DEFAULT '[]',
    "imageMaxBatchSize" INTEGER NOT NULL DEFAULT 1,
    "imageAllowedResolutions" JSONB NOT NULL DEFAULT '["1024x1024", "1280x720", "720x1280"]',
    "imageAllowReferenceImages" BOOLEAN NOT NULL DEFAULT false,
    "imageRetentionDays" INTEGER NOT NULL DEFAULT 15,
    "unlimitedImageRetention" BOOLEAN NOT NULL DEFAULT false,
    "hasVideoGeneration" BOOLEAN NOT NULL DEFAULT false,
    "videoDailyLimit" INTEGER,
    "videoMonthlyLimit" INTEGER,
    "videoTotalLimit" INTEGER,
    "videoDefaultCost" INTEGER NOT NULL DEFAULT 25,
    "videoAllowedModels" JSONB NOT NULL DEFAULT '[]',
    "videoRetentionDays" INTEGER NOT NULL DEFAULT 15,
    "unlimitedVideoRetention" BOOLEAN NOT NULL DEFAULT false,
    "customRules" JSONB DEFAULT '{}',
    "gatewayProductId" TEXT,
    "gatewayPriceIdMonthly" TEXT,
    "gatewayPriceIdYearly" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Plan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Subscription" (
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
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Subscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Invoice" (
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
CREATE TABLE "CreditLedger" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "balanceAfter" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "lotId" TEXT,
    "origin" "CreditOrigin",
    "operationCode" TEXT,
    "idempotencyKey" TEXT,
    "userId" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CreditLedger_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CreditLot" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "userId" TEXT,
    "origin" "CreditOrigin" NOT NULL,
    "amountGranted" INTEGER NOT NULL,
    "amountAvailable" INTEGER NOT NULL,
    "amountConsumed" INTEGER NOT NULL DEFAULT 0,
    "status" "CreditLotStatus" NOT NULL DEFAULT 'ACTIVE',
    "isAccumulative" BOOLEAN NOT NULL DEFAULT true,
    "validFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),
    "planTier" "PlanTier",
    "subscriptionId" TEXT,
    "eventId" TEXT,
    "reason" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CreditLot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CreditConsumptionConfig" (
    "id" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "categoryPriorities" JSONB NOT NULL,
    "protectedCategories" JSONB NOT NULL DEFAULT '[]',
    "description" TEXT,
    "updatedByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CreditConsumptionConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProcessedWebhookEvent" (
    "id" TEXT NOT NULL,
    "gateway" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "processedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "payload" JSONB,
    "status" TEXT NOT NULL DEFAULT 'PROCESSED',

    CONSTRAINT "ProcessedWebhookEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Membership" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "role" "WorkspaceRole" NOT NULL DEFAULT 'MEMBER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Membership_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkspaceInvite" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" "WorkspaceRole" NOT NULL DEFAULT 'MEMBER',
    "token" TEXT NOT NULL,
    "status" "InviteStatus" NOT NULL DEFAULT 'PENDING',
    "invitedById" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkspaceInvite_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Project" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "ownerUserId" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "genre" TEXT,
    "language" TEXT NOT NULL DEFAULT 'pt-BR',
    "durationSeconds" INTEGER,
    "configuration" JSONB NOT NULL DEFAULT '{}',
    "visualBible" JSONB,
    "visibility" "SpaceVisibility" NOT NULL DEFAULT 'TEAM',
    "thumbnailUrl" TEXT,
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Project_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SpaceMember" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "canEdit" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SpaceMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SpaceBoard" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "name" TEXT NOT NULL DEFAULT 'Page 1',
    "order" INTEGER NOT NULL DEFAULT 0,
    "viewport" JSONB NOT NULL DEFAULT '{"x":0,"y":0,"zoom":1}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SpaceBoard_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BoardNode" (
    "id" TEXT NOT NULL,
    "boardId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "x" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "y" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "width" DOUBLE PRECISION,
    "height" DOUBLE PRECISION,
    "zIndex" INTEGER NOT NULL DEFAULT 0,
    "refType" TEXT,
    "refId" TEXT,
    "data" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BoardNode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BoardEdge" (
    "id" TEXT NOT NULL,
    "boardId" TEXT NOT NULL,
    "sourceNodeId" TEXT NOT NULL,
    "targetNodeId" TEXT NOT NULL,
    "sourceHandle" TEXT,
    "targetHandle" TEXT,
    "label" TEXT,
    "animated" BOOLEAN NOT NULL DEFAULT false,
    "data" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BoardEdge_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ParameterDefinition" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT,
    "key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "description" TEXT,
    "type" "ParameterType" NOT NULL,
    "scope" "ParameterScope" NOT NULL DEFAULT 'GLOBAL',
    "scopes" JSONB,
    "required" BOOLEAN NOT NULL DEFAULT false,
    "defaultValue" JSONB,
    "options" JSONB,
    "validationRules" JSONB,
    "visibilityRules" JSONB,
    "promptMapping" JSONB,
    "order" INTEGER NOT NULL DEFAULT 0,
    "version" INTEGER NOT NULL DEFAULT 1,
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ParameterDefinition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ParameterValue" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "parameterDefinitionId" TEXT NOT NULL,
    "targetType" TEXT NOT NULL DEFAULT 'PROJECT',
    "targetId" TEXT,
    "value" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ParameterValue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Character" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "attributes" JSONB NOT NULL DEFAULT '{}',
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Character_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Environment" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "attributes" JSONB NOT NULL DEFAULT '{}',
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Environment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Scene" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "durationSeconds" INTEGER,
    "description" TEXT NOT NULL DEFAULT '',
    "configuration" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Scene_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SceneCharacter" (
    "sceneId" TEXT NOT NULL,
    "characterId" TEXT NOT NULL,
    "configuration" JSONB NOT NULL DEFAULT '{}',

    CONSTRAINT "SceneCharacter_pkey" PRIMARY KEY ("sceneId","characterId")
);

-- CreateTable
CREATE TABLE "SceneEnvironment" (
    "sceneId" TEXT NOT NULL,
    "environmentId" TEXT NOT NULL,
    "configuration" JSONB NOT NULL DEFAULT '{}',

    CONSTRAINT "SceneEnvironment_pkey" PRIMARY KEY ("sceneId","environmentId")
);

-- CreateTable
CREATE TABLE "PromptTemplate" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "outputSchema" TEXT NOT NULL,
    "instructions" TEXT NOT NULL,
    "sections" JSONB NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "isSystem" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PromptTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PromptVersion" (
    "id" TEXT NOT NULL,
    "sceneId" TEXT,
    "projectId" TEXT NOT NULL,
    "templateKey" TEXT NOT NULL,
    "templateVersion" INTEGER NOT NULL,
    "targetTool" TEXT NOT NULL,
    "modelName" TEXT NOT NULL,
    "inputSnapshot" JSONB NOT NULL,
    "outputJson" JSONB NOT NULL,
    "outputText" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PromptVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GenerationJob" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "status" "GenerationStatus" NOT NULL DEFAULT 'PENDING',
    "modelName" TEXT NOT NULL,
    "request" JSONB NOT NULL,
    "result" JSONB,
    "errorMessage" TEXT,
    "inputTokens" INTEGER,
    "outputTokens" INTEGER,
    "startedAt" TIMESTAMP(3),
    "finishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GenerationJob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CommercialPolicy" (
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
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedBy" TEXT,

    CONSTRAINT "CommercialPolicy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CommercialSnapshot" (
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

-- CreateTable
CREATE TABLE "PaymentGatewayConfig" (
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
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PaymentGatewayConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GatewayPlanPriceMapping" (
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

    CONSTRAINT "GatewayPlanPriceMapping_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentWebhookEvent" (
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

    CONSTRAINT "PaymentWebhookEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CreditOperation" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT NOT NULL,
    "defaultCreditCost" INTEGER NOT NULL DEFAULT 1,
    "isFree" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CreditOperation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CreditPricingRule" (
    "id" TEXT NOT NULL,
    "operationId" TEXT NOT NULL,
    "planTier" "PlanTier",
    "creditCost" INTEGER NOT NULL,
    "isFree" BOOLEAN NOT NULL DEFAULT false,
    "effectiveFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "effectiveUntil" TIMESTAMP(3),
    "priority" INTEGER NOT NULL DEFAULT 1,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CreditPricingRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CreditRenewalPolicy" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "planTier" "PlanTier",
    "creditsAmount" INTEGER NOT NULL,
    "frequency" TEXT NOT NULL,
    "moment" TEXT NOT NULL DEFAULT 'CYCLE_RENEWAL',
    "accumulate" BOOLEAN NOT NULL DEFAULT false,
    "maxAccumulated" INTEGER,
    "expirationDays" INTEGER,
    "priority" INTEGER NOT NULL DEFAULT 1,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "startsAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endsAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CreditRenewalPolicy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserEntitlementOverride" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "workspaceId" TEXT,
    "grantedPlanTier" "PlanTier",
    "courtesyCredits" INTEGER,
    "expiresAt" TIMESTAMP(3),
    "reason" TEXT NOT NULL,
    "adminUserId" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserEntitlementOverride_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProjectOwnershipTransfer" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "fromWorkspaceId" TEXT NOT NULL,
    "toWorkspaceId" TEXT NOT NULL,
    "fromUserId" TEXT,
    "toUserId" TEXT,
    "reason" TEXT NOT NULL,
    "adminUserId" TEXT NOT NULL,
    "transferredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProjectOwnershipTransfer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GeminiApiKey" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "apiKey" TEXT NOT NULL,
    "maskedKey" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "priority" INTEGER NOT NULL DEFAULT 1,
    "status" "GeminiKeyStatus" NOT NULL DEFAULT 'HEALTHY',
    "requestsCount" INTEGER NOT NULL DEFAULT 0,
    "successCount" INTEGER NOT NULL DEFAULT 0,
    "failuresCount" INTEGER NOT NULL DEFAULT 0,
    "consecutiveFailures" INTEGER NOT NULL DEFAULT 0,
    "lastUsedAt" TIMESTAMP(3),
    "lastSuccessAt" TIMESTAMP(3),
    "lastFailedAt" TIMESTAMP(3),
    "cooldownUntil" TIMESTAMP(3),
    "lastErrorCode" TEXT,
    "lastErrorMessage" TEXT,
    "allowedModels" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" TEXT,

    CONSTRAINT "GeminiApiKey_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GeminiSettings" (
    "id" TEXT NOT NULL,
    "selectionStrategy" "GeminiSelectionStrategy" NOT NULL DEFAULT 'SEQUENTIAL_PRIORITY',
    "maxConsecutiveFailures" INTEGER NOT NULL DEFAULT 3,
    "cooldownSeconds" INTEGER NOT NULL DEFAULT 300,
    "requestTimeoutMs" INTEGER NOT NULL DEFAULT 45000,
    "maxAttemptsPerOperation" INTEGER NOT NULL DEFAULT 3,
    "envKeyFallbackAllowed" BOOLEAN NOT NULL DEFAULT true,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedByUserId" TEXT,

    CONSTRAINT "GeminiSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GeminiOperationLog" (
    "id" TEXT NOT NULL,
    "operationId" TEXT NOT NULL,
    "feature" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "workspaceId" TEXT,
    "projectId" TEXT,
    "userId" TEXT,
    "success" BOOLEAN NOT NULL DEFAULT false,
    "usedFallback" BOOLEAN NOT NULL DEFAULT false,
    "attemptsCount" INTEGER NOT NULL DEFAULT 1,
    "primaryKeyName" TEXT,
    "finalKeyName" TEXT,
    "durationMs" INTEGER NOT NULL DEFAULT 0,
    "inputTokens" INTEGER,
    "outputTokens" INTEGER,
    "statusCode" INTEGER,
    "errorCode" TEXT,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GeminiOperationLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GeminiOperationAttempt" (
    "id" TEXT NOT NULL,
    "logId" TEXT NOT NULL,
    "apiKeyId" TEXT,
    "keyName" TEXT NOT NULL,
    "attemptNumber" INTEGER NOT NULL,
    "success" BOOLEAN NOT NULL,
    "durationMs" INTEGER NOT NULL,
    "statusCode" INTEGER,
    "errorCode" TEXT,
    "errorMessage" TEXT,
    "isRecoverable" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GeminiOperationAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ImageProviderConfig" (
    "id" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "apiKey" TEXT NOT NULL,
    "maskedKey" TEXT NOT NULL,
    "baseUrl" TEXT NOT NULL DEFAULT 'https://gen.pollinations.ai',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "defaultModel" TEXT,
    "connectionStatus" "ImageProviderStatus" NOT NULL DEFAULT 'UNCONFIGURED',
    "lastTestedAt" TIMESTAMP(3),
    "lastTestMessage" TEXT,
    "lastUsedAt" TIMESTAMP(3),
    "requestsCount" INTEGER NOT NULL DEFAULT 0,
    "successCount" INTEGER NOT NULL DEFAULT 0,
    "failuresCount" INTEGER NOT NULL DEFAULT 0,
    "customConfig" JSONB DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ImageProviderConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ImageModelConfig" (
    "id" TEXT NOT NULL,
    "providerConfigId" TEXT NOT NULL,
    "modelId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "publisher" TEXT,
    "description" TEXT,
    "capabilities" JSONB NOT NULL DEFAULT '["TEXT_TO_IMAGE"]',
    "supportedSizes" JSONB NOT NULL DEFAULT '["1024x1024", "1280x720", "720x1280"]',
    "supportsReferenceImage" BOOLEAN NOT NULL DEFAULT false,
    "supportsImageEditing" BOOLEAN NOT NULL DEFAULT false,
    "pricingInfo" JSONB DEFAULT '{}',
    "isAvailable" BOOLEAN NOT NULL DEFAULT true,
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "defaultCreditCost" INTEGER,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "lastSyncedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ImageModelConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GeneratedImage" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "projectId" TEXT,
    "characterId" TEXT,
    "environmentId" TEXT,
    "sceneId" TEXT,
    "promptVersionId" TEXT,
    "providerId" TEXT NOT NULL,
    "modelId" TEXT NOT NULL,
    "prompt" TEXT NOT NULL,
    "revisedPrompt" TEXT,
    "negativePrompt" TEXT,
    "parameters" JSONB NOT NULL DEFAULT '{}',
    "aspectRatio" TEXT,
    "resolution" TEXT,
    "imageUrl" TEXT NOT NULL,
    "storageKey" TEXT,
    "creditCost" INTEGER NOT NULL DEFAULT 0,
    "externalCost" DOUBLE PRECISION,
    "externalCostUnit" TEXT,
    "status" TEXT NOT NULL DEFAULT 'SUCCEEDED',
    "errorMessage" TEXT,
    "generationTimeMs" INTEGER NOT NULL DEFAULT 0,
    "metadata" JSONB DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GeneratedImage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ImageOperationLog" (
    "id" TEXT NOT NULL,
    "operationId" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "modelId" TEXT NOT NULL,
    "workspaceId" TEXT,
    "userId" TEXT,
    "projectId" TEXT,
    "success" BOOLEAN NOT NULL DEFAULT false,
    "statusCode" INTEGER,
    "errorCode" TEXT,
    "errorMessage" TEXT,
    "durationMs" INTEGER NOT NULL DEFAULT 0,
    "externalCost" DOUBLE PRECISION,
    "externalCostUnit" TEXT,
    "creditCost" INTEGER NOT NULL DEFAULT 0,
    "requestPayload" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ImageOperationLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmailSettings" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "provider" "EmailProviderType" NOT NULL DEFAULT 'GMAIL_SMTP',
    "isEnabled" BOOLEAN NOT NULL DEFAULT false,
    "smtpHost" TEXT NOT NULL DEFAULT 'smtp.gmail.com',
    "smtpPort" INTEGER NOT NULL DEFAULT 587,
    "smtpSecure" BOOLEAN NOT NULL DEFAULT false,
    "smtpUser" TEXT,
    "smtpPasswordEnc" TEXT,
    "clientId" TEXT,
    "clientSecretEnc" TEXT,
    "refreshTokenEnc" TEXT,
    "tenantId" TEXT,
    "senderEmail" TEXT NOT NULL DEFAULT 'noreply@tomadix.com',
    "senderName" TEXT NOT NULL DEFAULT 'Tomadix',
    "replyTo" TEXT,
    "lastTestedAt" TIMESTAMP(3),
    "lastTestStatus" TEXT,
    "lastTestError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmailSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmailLog" (
    "id" TEXT NOT NULL,
    "recipient" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "messageId" TEXT,
    "errorMessage" TEXT,
    "metadata" JSONB DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmailLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmailMessage" (
    "id" TEXT NOT NULL,
    "mailbox" TEXT NOT NULL DEFAULT 'INBOX',
    "uid" INTEGER NOT NULL,
    "messageId" TEXT,
    "inReplyTo" TEXT,
    "fromName" TEXT,
    "fromAddress" TEXT NOT NULL,
    "toAddresses" TEXT NOT NULL DEFAULT '',
    "subject" TEXT NOT NULL DEFAULT '',
    "snippet" TEXT NOT NULL DEFAULT '',
    "textBody" TEXT,
    "htmlBody" TEXT,
    "receivedAt" TIMESTAMP(3) NOT NULL,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmailMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VideoProviderConfig" (
    "id" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "name" TEXT NOT NULL DEFAULT 'Pollinations Video',
    "apiKeyEncrypted" TEXT,
    "baseUrl" TEXT NOT NULL DEFAULT 'https://gen.pollinations.ai',
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VideoProviderConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VideoModelConfig" (
    "id" TEXT NOT NULL,
    "providerConfigId" TEXT NOT NULL,
    "modelId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "publisher" TEXT,
    "description" TEXT,
    "creditCost" INTEGER NOT NULL DEFAULT 25,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "isAvailable" BOOLEAN NOT NULL DEFAULT true,
    "supportedDurations" JSONB NOT NULL DEFAULT '[5, 10]',
    "supportedAspectRatios" JSONB NOT NULL DEFAULT '["16:9", "9:16"]',
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "lastSyncedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VideoModelConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GeneratedVideo" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "projectId" TEXT,
    "sceneId" TEXT,
    "providerId" TEXT NOT NULL DEFAULT 'pollinations',
    "modelId" TEXT NOT NULL,
    "prompt" TEXT NOT NULL,
    "negativePrompt" TEXT,
    "aspectRatio" TEXT,
    "durationSeconds" INTEGER NOT NULL DEFAULT 5,
    "fps" INTEGER NOT NULL DEFAULT 24,
    "startFrameUrl" TEXT,
    "endFrameUrl" TEXT,
    "parameters" JSONB NOT NULL DEFAULT '{}',
    "videoUrl" TEXT,
    "thumbnailUrl" TEXT,
    "storageKey" TEXT,
    "creditCost" INTEGER NOT NULL DEFAULT 25,
    "externalCost" DOUBLE PRECISION,
    "externalCostUnit" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "taskId" TEXT,
    "errorMessage" TEXT,
    "generationTimeMs" INTEGER NOT NULL DEFAULT 0,
    "metadata" JSONB DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GeneratedVideo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VideoOperationLog" (
    "id" TEXT NOT NULL,
    "operationId" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "modelId" TEXT NOT NULL,
    "workspaceId" TEXT,
    "userId" TEXT,
    "projectId" TEXT,
    "success" BOOLEAN NOT NULL DEFAULT false,
    "statusCode" INTEGER,
    "errorCode" TEXT,
    "errorMessage" TEXT,
    "durationMs" INTEGER NOT NULL DEFAULT 0,
    "externalCost" DOUBLE PRECISION,
    "creditCost" INTEGER NOT NULL DEFAULT 0,
    "requestPayload" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VideoOperationLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_authSubject_key" ON "User"("authSubject");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_emailConfirmationToken_key" ON "User"("emailConfirmationToken");

-- CreateIndex
CREATE UNIQUE INDEX "User_passwordResetToken_key" ON "User"("passwordResetToken");

-- CreateIndex
CREATE INDEX "User_platformRole_idx" ON "User"("platformRole");

-- CreateIndex
CREATE INDEX "User_isSuspended_idx" ON "User"("isSuspended");

-- CreateIndex
CREATE INDEX "User_createdAt_idx" ON "User"("createdAt");

-- CreateIndex
CREATE INDEX "ConsentRecord_userId_consentType_idx" ON "ConsentRecord"("userId", "consentType");

-- CreateIndex
CREATE INDEX "ConsentRecord_consentType_createdAt_idx" ON "ConsentRecord"("consentType", "createdAt");

-- CreateIndex
CREATE INDEX "DataSubjectRequest_email_status_idx" ON "DataSubjectRequest"("email", "status");

-- CreateIndex
CREATE INDEX "DataSubjectRequest_requestType_status_idx" ON "DataSubjectRequest"("requestType", "status");

-- CreateIndex
CREATE INDEX "PlatformAuditLog_adminUserId_createdAt_idx" ON "PlatformAuditLog"("adminUserId", "createdAt");

-- CreateIndex
CREATE INDEX "PlatformAuditLog_targetType_targetId_idx" ON "PlatformAuditLog"("targetType", "targetId");

-- CreateIndex
CREATE INDEX "PlatformAuditLog_action_createdAt_idx" ON "PlatformAuditLog"("action", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Session_tokenHash_key" ON "Session"("tokenHash");

-- CreateIndex
CREATE INDEX "Session_userId_expiresAt_idx" ON "Session"("userId", "expiresAt");

-- CreateIndex
CREATE INDEX "Session_expiresAt_idx" ON "Session"("expiresAt");

-- CreateIndex
CREATE INDEX "AuditLog_workspaceId_createdAt_idx" ON "AuditLog"("workspaceId", "createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_userId_createdAt_idx" ON "AuditLog"("userId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Workspace_slug_key" ON "Workspace"("slug");

-- CreateIndex
CREATE INDEX "Workspace_isArchived_idx" ON "Workspace"("isArchived");

-- CreateIndex
CREATE UNIQUE INDEX "Plan_tier_key" ON "Plan"("tier");

-- CreateIndex
CREATE UNIQUE INDEX "Plan_code_key" ON "Plan"("code");

-- CreateIndex
CREATE UNIQUE INDEX "Subscription_workspaceId_key" ON "Subscription"("workspaceId");

-- CreateIndex
CREATE UNIQUE INDEX "Subscription_gatewaySubscriptionId_key" ON "Subscription"("gatewaySubscriptionId");

-- CreateIndex
CREATE INDEX "Subscription_workspaceId_status_idx" ON "Subscription"("workspaceId", "status");

-- CreateIndex
CREATE INDEX "Subscription_customerId_idx" ON "Subscription"("customerId");

-- CreateIndex
CREATE INDEX "Subscription_gatewaySubscriptionId_idx" ON "Subscription"("gatewaySubscriptionId");

-- CreateIndex
CREATE UNIQUE INDEX "Invoice_gatewayInvoiceId_key" ON "Invoice"("gatewayInvoiceId");

-- CreateIndex
CREATE INDEX "Invoice_workspaceId_createdAt_idx" ON "Invoice"("workspaceId", "createdAt");

-- CreateIndex
CREATE INDEX "Invoice_status_idx" ON "Invoice"("status");

-- CreateIndex
CREATE INDEX "Invoice_subscriptionId_idx" ON "Invoice"("subscriptionId");

-- CreateIndex
CREATE INDEX "CreditLedger_workspaceId_createdAt_idx" ON "CreditLedger"("workspaceId", "createdAt");

-- CreateIndex
CREATE INDEX "CreditLedger_lotId_idx" ON "CreditLedger"("lotId");

-- CreateIndex
CREATE INDEX "CreditLedger_idempotencyKey_idx" ON "CreditLedger"("idempotencyKey");

-- CreateIndex
CREATE INDEX "CreditLedger_userId_idx" ON "CreditLedger"("userId");

-- CreateIndex
CREATE INDEX "CreditLedger_createdAt_amount_idx" ON "CreditLedger"("createdAt", "amount");

-- CreateIndex
CREATE INDEX "CreditLot_workspaceId_status_expiresAt_idx" ON "CreditLot"("workspaceId", "status", "expiresAt");

-- CreateIndex
CREATE INDEX "CreditLot_workspaceId_origin_idx" ON "CreditLot"("workspaceId", "origin");

-- CreateIndex
CREATE INDEX "CreditLot_eventId_idx" ON "CreditLot"("eventId");

-- CreateIndex
CREATE INDEX "CreditLot_userId_idx" ON "CreditLot"("userId");

-- CreateIndex
CREATE INDEX "CreditLot_subscriptionId_idx" ON "CreditLot"("subscriptionId");

-- CreateIndex
CREATE INDEX "CreditLot_status_expiresAt_idx" ON "CreditLot"("status", "expiresAt");

-- CreateIndex
CREATE INDEX "CreditConsumptionConfig_version_idx" ON "CreditConsumptionConfig"("version");

-- CreateIndex
CREATE INDEX "Membership_workspaceId_role_idx" ON "Membership"("workspaceId", "role");

-- CreateIndex
CREATE UNIQUE INDEX "Membership_userId_workspaceId_key" ON "Membership"("userId", "workspaceId");

-- CreateIndex
CREATE UNIQUE INDEX "WorkspaceInvite_token_key" ON "WorkspaceInvite"("token");

-- CreateIndex
CREATE INDEX "WorkspaceInvite_workspaceId_status_idx" ON "WorkspaceInvite"("workspaceId", "status");

-- CreateIndex
CREATE INDEX "WorkspaceInvite_email_status_idx" ON "WorkspaceInvite"("email", "status");

-- CreateIndex
CREATE INDEX "WorkspaceInvite_token_idx" ON "WorkspaceInvite"("token");

-- CreateIndex
CREATE INDEX "WorkspaceInvite_invitedById_idx" ON "WorkspaceInvite"("invitedById");

-- CreateIndex
CREATE INDEX "Project_workspaceId_updatedAt_idx" ON "Project"("workspaceId", "updatedAt");

-- CreateIndex
CREATE INDEX "Project_workspaceId_isArchived_idx" ON "Project"("workspaceId", "isArchived");

-- CreateIndex
CREATE INDEX "Project_workspaceId_visibility_idx" ON "Project"("workspaceId", "visibility");

-- CreateIndex
CREATE INDEX "Project_ownerUserId_idx" ON "Project"("ownerUserId");

-- CreateIndex
CREATE INDEX "Project_workspaceId_createdAt_idx" ON "Project"("workspaceId", "createdAt");

-- CreateIndex
CREATE INDEX "SpaceMember_userId_idx" ON "SpaceMember"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "SpaceMember_projectId_userId_key" ON "SpaceMember"("projectId", "userId");

-- CreateIndex
CREATE INDEX "SpaceBoard_projectId_order_idx" ON "SpaceBoard"("projectId", "order");

-- CreateIndex
CREATE INDEX "BoardNode_boardId_idx" ON "BoardNode"("boardId");

-- CreateIndex
CREATE INDEX "BoardNode_refType_refId_idx" ON "BoardNode"("refType", "refId");

-- CreateIndex
CREATE INDEX "BoardEdge_boardId_idx" ON "BoardEdge"("boardId");

-- CreateIndex
CREATE INDEX "ParameterDefinition_workspaceId_enabled_scope_idx" ON "ParameterDefinition"("workspaceId", "enabled", "scope");

-- CreateIndex
CREATE UNIQUE INDEX "ParameterDefinition_workspaceId_key_version_key" ON "ParameterDefinition"("workspaceId", "key", "version");

-- CreateIndex
CREATE INDEX "ParameterValue_projectId_targetType_targetId_idx" ON "ParameterValue"("projectId", "targetType", "targetId");

-- CreateIndex
CREATE INDEX "ParameterValue_parameterDefinitionId_idx" ON "ParameterValue"("parameterDefinitionId");

-- CreateIndex
CREATE INDEX "Character_projectId_name_idx" ON "Character"("projectId", "name");

-- CreateIndex
CREATE INDEX "Character_projectId_isArchived_idx" ON "Character"("projectId", "isArchived");

-- CreateIndex
CREATE INDEX "Character_projectId_isArchived_updatedAt_idx" ON "Character"("projectId", "isArchived", "updatedAt" DESC);

-- CreateIndex
CREATE INDEX "Environment_projectId_name_idx" ON "Environment"("projectId", "name");

-- CreateIndex
CREATE INDEX "Environment_projectId_isArchived_idx" ON "Environment"("projectId", "isArchived");

-- CreateIndex
CREATE INDEX "Environment_projectId_isArchived_updatedAt_idx" ON "Environment"("projectId", "isArchived", "updatedAt" DESC);

-- CreateIndex
CREATE INDEX "Scene_projectId_order_idx" ON "Scene"("projectId", "order");

-- CreateIndex
CREATE INDEX "Scene_projectId_updatedAt_idx" ON "Scene"("projectId", "updatedAt" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "Scene_projectId_order_key" ON "Scene"("projectId", "order");

-- CreateIndex
CREATE INDEX "SceneCharacter_characterId_idx" ON "SceneCharacter"("characterId");

-- CreateIndex
CREATE INDEX "SceneEnvironment_environmentId_idx" ON "SceneEnvironment"("environmentId");

-- CreateIndex
CREATE INDEX "PromptTemplate_key_enabled_idx" ON "PromptTemplate"("key", "enabled");

-- CreateIndex
CREATE UNIQUE INDEX "PromptTemplate_key_version_key" ON "PromptTemplate"("key", "version");

-- CreateIndex
CREATE INDEX "PromptVersion_projectId_createdAt_idx" ON "PromptVersion"("projectId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "PromptVersion_sceneId_createdAt_idx" ON "PromptVersion"("sceneId", "createdAt");

-- CreateIndex
CREATE INDEX "PromptVersion_projectId_templateKey_sceneId_createdAt_idx" ON "PromptVersion"("projectId", "templateKey", "sceneId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "GenerationJob_projectId_status_createdAt_idx" ON "GenerationJob"("projectId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "GenerationJob_createdAt_idx" ON "GenerationJob"("createdAt");

-- CreateIndex
CREATE INDEX "GenerationJob_status_createdAt_idx" ON "GenerationJob"("status", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "CommercialPolicy_key_key" ON "CommercialPolicy"("key");

-- CreateIndex
CREATE INDEX "CommercialPolicy_category_idx" ON "CommercialPolicy"("category");

-- CreateIndex
CREATE INDEX "CommercialSnapshot_workspaceId_planTier_idx" ON "CommercialSnapshot"("workspaceId", "planTier");

-- CreateIndex
CREATE INDEX "CommercialSnapshot_subscriptionId_idx" ON "CommercialSnapshot"("subscriptionId");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentGatewayConfig_identifier_key" ON "PaymentGatewayConfig"("identifier");

-- CreateIndex
CREATE INDEX "PaymentGatewayConfig_provider_environment_idx" ON "PaymentGatewayConfig"("provider", "environment");

-- CreateIndex
CREATE INDEX "PaymentGatewayConfig_status_environment_idx" ON "PaymentGatewayConfig"("status", "environment");

-- CreateIndex
CREATE INDEX "GatewayPlanPriceMapping_planTier_environment_idx" ON "GatewayPlanPriceMapping"("planTier", "environment");

-- CreateIndex
CREATE UNIQUE INDEX "GatewayPlanPriceMapping_gatewayConfigId_planTier_environmen_key" ON "GatewayPlanPriceMapping"("gatewayConfigId", "planTier", "environment");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentWebhookEvent_eventId_key" ON "PaymentWebhookEvent"("eventId");

-- CreateIndex
CREATE INDEX "PaymentWebhookEvent_gateway_eventType_idx" ON "PaymentWebhookEvent"("gateway", "eventType");

-- CreateIndex
CREATE INDEX "PaymentWebhookEvent_status_createdAt_idx" ON "PaymentWebhookEvent"("status", "createdAt");

-- CreateIndex
CREATE INDEX "PaymentWebhookEvent_environment_idx" ON "PaymentWebhookEvent"("environment");

-- CreateIndex
CREATE UNIQUE INDEX "CreditOperation_code_key" ON "CreditOperation"("code");

-- CreateIndex
CREATE INDEX "CreditOperation_category_isActive_idx" ON "CreditOperation"("category", "isActive");

-- CreateIndex
CREATE INDEX "CreditPricingRule_operationId_planTier_isActive_idx" ON "CreditPricingRule"("operationId", "planTier", "isActive");

-- CreateIndex
CREATE INDEX "CreditRenewalPolicy_planTier_isActive_idx" ON "CreditRenewalPolicy"("planTier", "isActive");

-- CreateIndex
CREATE INDEX "UserEntitlementOverride_userId_isActive_idx" ON "UserEntitlementOverride"("userId", "isActive");

-- CreateIndex
CREATE INDEX "UserEntitlementOverride_workspaceId_isActive_idx" ON "UserEntitlementOverride"("workspaceId", "isActive");

-- CreateIndex
CREATE INDEX "ProjectOwnershipTransfer_projectId_transferredAt_idx" ON "ProjectOwnershipTransfer"("projectId", "transferredAt");

-- CreateIndex
CREATE INDEX "ProjectOwnershipTransfer_fromWorkspaceId_idx" ON "ProjectOwnershipTransfer"("fromWorkspaceId");

-- CreateIndex
CREATE INDEX "ProjectOwnershipTransfer_toWorkspaceId_idx" ON "ProjectOwnershipTransfer"("toWorkspaceId");

-- CreateIndex
CREATE INDEX "GeminiApiKey_isActive_priority_status_idx" ON "GeminiApiKey"("isActive", "priority", "status");

-- CreateIndex
CREATE INDEX "GeminiApiKey_cooldownUntil_idx" ON "GeminiApiKey"("cooldownUntil");

-- CreateIndex
CREATE UNIQUE INDEX "GeminiOperationLog_operationId_key" ON "GeminiOperationLog"("operationId");

-- CreateIndex
CREATE INDEX "GeminiOperationLog_feature_createdAt_idx" ON "GeminiOperationLog"("feature", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "GeminiOperationLog_success_usedFallback_createdAt_idx" ON "GeminiOperationLog"("success", "usedFallback", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "GeminiOperationLog_workspaceId_createdAt_idx" ON "GeminiOperationLog"("workspaceId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "GeminiOperationAttempt_logId_attemptNumber_idx" ON "GeminiOperationAttempt"("logId", "attemptNumber");

-- CreateIndex
CREATE UNIQUE INDEX "ImageProviderConfig_providerId_key" ON "ImageProviderConfig"("providerId");

-- CreateIndex
CREATE INDEX "ImageProviderConfig_providerId_isActive_idx" ON "ImageProviderConfig"("providerId", "isActive");

-- CreateIndex
CREATE INDEX "ImageModelConfig_providerConfigId_isEnabled_isAvailable_idx" ON "ImageModelConfig"("providerConfigId", "isEnabled", "isAvailable");

-- CreateIndex
CREATE UNIQUE INDEX "ImageModelConfig_providerConfigId_modelId_key" ON "ImageModelConfig"("providerConfigId", "modelId");

-- CreateIndex
CREATE INDEX "GeneratedImage_workspaceId_createdAt_idx" ON "GeneratedImage"("workspaceId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "GeneratedImage_userId_createdAt_idx" ON "GeneratedImage"("userId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "GeneratedImage_projectId_createdAt_idx" ON "GeneratedImage"("projectId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "GeneratedImage_status_createdAt_idx" ON "GeneratedImage"("status", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "GeneratedImage_characterId_idx" ON "GeneratedImage"("characterId");

-- CreateIndex
CREATE INDEX "GeneratedImage_environmentId_idx" ON "GeneratedImage"("environmentId");

-- CreateIndex
CREATE INDEX "GeneratedImage_sceneId_idx" ON "GeneratedImage"("sceneId");

-- CreateIndex
CREATE INDEX "GeneratedImage_promptVersionId_idx" ON "GeneratedImage"("promptVersionId");

-- CreateIndex
CREATE UNIQUE INDEX "ImageOperationLog_operationId_key" ON "ImageOperationLog"("operationId");

-- CreateIndex
CREATE INDEX "ImageOperationLog_providerId_createdAt_idx" ON "ImageOperationLog"("providerId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "ImageOperationLog_workspaceId_createdAt_idx" ON "ImageOperationLog"("workspaceId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "EmailLog_status_createdAt_idx" ON "EmailLog"("status", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "EmailLog_recipient_createdAt_idx" ON "EmailLog"("recipient", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "EmailMessage_receivedAt_idx" ON "EmailMessage"("receivedAt" DESC);

-- CreateIndex
CREATE INDEX "EmailMessage_isRead_receivedAt_idx" ON "EmailMessage"("isRead", "receivedAt" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "EmailMessage_mailbox_uid_key" ON "EmailMessage"("mailbox", "uid");

-- CreateIndex
CREATE UNIQUE INDEX "VideoProviderConfig_providerId_key" ON "VideoProviderConfig"("providerId");

-- CreateIndex
CREATE INDEX "VideoModelConfig_providerConfigId_isEnabled_isAvailable_idx" ON "VideoModelConfig"("providerConfigId", "isEnabled", "isAvailable");

-- CreateIndex
CREATE UNIQUE INDEX "VideoModelConfig_providerConfigId_modelId_key" ON "VideoModelConfig"("providerConfigId", "modelId");

-- CreateIndex
CREATE INDEX "GeneratedVideo_workspaceId_createdAt_idx" ON "GeneratedVideo"("workspaceId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "GeneratedVideo_userId_createdAt_idx" ON "GeneratedVideo"("userId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "GeneratedVideo_projectId_createdAt_idx" ON "GeneratedVideo"("projectId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "GeneratedVideo_status_createdAt_idx" ON "GeneratedVideo"("status", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "GeneratedVideo_sceneId_idx" ON "GeneratedVideo"("sceneId");

-- CreateIndex
CREATE UNIQUE INDEX "VideoOperationLog_operationId_key" ON "VideoOperationLog"("operationId");

-- CreateIndex
CREATE INDEX "VideoOperationLog_providerId_createdAt_idx" ON "VideoOperationLog"("providerId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "VideoOperationLog_workspaceId_createdAt_idx" ON "VideoOperationLog"("workspaceId", "createdAt" DESC);

-- AddForeignKey
ALTER TABLE "ConsentRecord" ADD CONSTRAINT "ConsentRecord_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DataSubjectRequest" ADD CONSTRAINT "DataSubjectRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlatformAuditLog" ADD CONSTRAINT "PlatformAuditLog_adminUserId_fkey" FOREIGN KEY ("adminUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_planTier_fkey" FOREIGN KEY ("planTier") REFERENCES "Plan"("tier") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "Subscription"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CreditLedger" ADD CONSTRAINT "CreditLedger_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CreditLedger" ADD CONSTRAINT "CreditLedger_lotId_fkey" FOREIGN KEY ("lotId") REFERENCES "CreditLot"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CreditLot" ADD CONSTRAINT "CreditLot_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CreditLot" ADD CONSTRAINT "CreditLot_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Membership" ADD CONSTRAINT "Membership_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Membership" ADD CONSTRAINT "Membership_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkspaceInvite" ADD CONSTRAINT "WorkspaceInvite_invitedById_fkey" FOREIGN KEY ("invitedById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkspaceInvite" ADD CONSTRAINT "WorkspaceInvite_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SpaceMember" ADD CONSTRAINT "SpaceMember_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SpaceMember" ADD CONSTRAINT "SpaceMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SpaceBoard" ADD CONSTRAINT "SpaceBoard_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BoardNode" ADD CONSTRAINT "BoardNode_boardId_fkey" FOREIGN KEY ("boardId") REFERENCES "SpaceBoard"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BoardEdge" ADD CONSTRAINT "BoardEdge_boardId_fkey" FOREIGN KEY ("boardId") REFERENCES "SpaceBoard"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ParameterValue" ADD CONSTRAINT "ParameterValue_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ParameterValue" ADD CONSTRAINT "ParameterValue_parameterDefinitionId_fkey" FOREIGN KEY ("parameterDefinitionId") REFERENCES "ParameterDefinition"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Character" ADD CONSTRAINT "Character_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Environment" ADD CONSTRAINT "Environment_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Scene" ADD CONSTRAINT "Scene_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SceneCharacter" ADD CONSTRAINT "SceneCharacter_sceneId_fkey" FOREIGN KEY ("sceneId") REFERENCES "Scene"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SceneCharacter" ADD CONSTRAINT "SceneCharacter_characterId_fkey" FOREIGN KEY ("characterId") REFERENCES "Character"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SceneEnvironment" ADD CONSTRAINT "SceneEnvironment_sceneId_fkey" FOREIGN KEY ("sceneId") REFERENCES "Scene"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SceneEnvironment" ADD CONSTRAINT "SceneEnvironment_environmentId_fkey" FOREIGN KEY ("environmentId") REFERENCES "Environment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PromptVersion" ADD CONSTRAINT "PromptVersion_sceneId_fkey" FOREIGN KEY ("sceneId") REFERENCES "Scene"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GenerationJob" ADD CONSTRAINT "GenerationJob_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GatewayPlanPriceMapping" ADD CONSTRAINT "GatewayPlanPriceMapping_gatewayConfigId_fkey" FOREIGN KEY ("gatewayConfigId") REFERENCES "PaymentGatewayConfig"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GatewayPlanPriceMapping" ADD CONSTRAINT "GatewayPlanPriceMapping_planTier_fkey" FOREIGN KEY ("planTier") REFERENCES "Plan"("tier") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentWebhookEvent" ADD CONSTRAINT "PaymentWebhookEvent_gatewayConfigId_fkey" FOREIGN KEY ("gatewayConfigId") REFERENCES "PaymentGatewayConfig"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CreditPricingRule" ADD CONSTRAINT "CreditPricingRule_operationId_fkey" FOREIGN KEY ("operationId") REFERENCES "CreditOperation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserEntitlementOverride" ADD CONSTRAINT "UserEntitlementOverride_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserEntitlementOverride" ADD CONSTRAINT "UserEntitlementOverride_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectOwnershipTransfer" ADD CONSTRAINT "ProjectOwnershipTransfer_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectOwnershipTransfer" ADD CONSTRAINT "ProjectOwnershipTransfer_fromWorkspaceId_fkey" FOREIGN KEY ("fromWorkspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectOwnershipTransfer" ADD CONSTRAINT "ProjectOwnershipTransfer_toWorkspaceId_fkey" FOREIGN KEY ("toWorkspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GeminiApiKey" ADD CONSTRAINT "GeminiApiKey_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GeminiOperationAttempt" ADD CONSTRAINT "GeminiOperationAttempt_logId_fkey" FOREIGN KEY ("logId") REFERENCES "GeminiOperationLog"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GeminiOperationAttempt" ADD CONSTRAINT "GeminiOperationAttempt_apiKeyId_fkey" FOREIGN KEY ("apiKeyId") REFERENCES "GeminiApiKey"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImageModelConfig" ADD CONSTRAINT "ImageModelConfig_providerConfigId_fkey" FOREIGN KEY ("providerConfigId") REFERENCES "ImageProviderConfig"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GeneratedImage" ADD CONSTRAINT "GeneratedImage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GeneratedImage" ADD CONSTRAINT "GeneratedImage_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GeneratedImage" ADD CONSTRAINT "GeneratedImage_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GeneratedImage" ADD CONSTRAINT "GeneratedImage_characterId_fkey" FOREIGN KEY ("characterId") REFERENCES "Character"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GeneratedImage" ADD CONSTRAINT "GeneratedImage_environmentId_fkey" FOREIGN KEY ("environmentId") REFERENCES "Environment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GeneratedImage" ADD CONSTRAINT "GeneratedImage_sceneId_fkey" FOREIGN KEY ("sceneId") REFERENCES "Scene"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GeneratedImage" ADD CONSTRAINT "GeneratedImage_promptVersionId_fkey" FOREIGN KEY ("promptVersionId") REFERENCES "PromptVersion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImageOperationLog" ADD CONSTRAINT "ImageOperationLog_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "ImageProviderConfig"("providerId") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VideoModelConfig" ADD CONSTRAINT "VideoModelConfig_providerConfigId_fkey" FOREIGN KEY ("providerConfigId") REFERENCES "VideoProviderConfig"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GeneratedVideo" ADD CONSTRAINT "GeneratedVideo_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GeneratedVideo" ADD CONSTRAINT "GeneratedVideo_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GeneratedVideo" ADD CONSTRAINT "GeneratedVideo_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GeneratedVideo" ADD CONSTRAINT "GeneratedVideo_sceneId_fkey" FOREIGN KEY ("sceneId") REFERENCES "Scene"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VideoOperationLog" ADD CONSTRAINT "VideoOperationLog_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "VideoProviderConfig"("providerId") ON DELETE SET NULL ON UPDATE CASCADE;

