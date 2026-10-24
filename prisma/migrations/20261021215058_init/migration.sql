-- CreateEnum
CREATE TYPE "WorkspaceRole" AS ENUM ('OWNER', 'ADMIN', 'MEMBER');

-- CreateEnum
CREATE TYPE "ParameterType" AS ENUM ('TEXT', 'TEXTAREA', 'SELECT', 'MULTISELECT', 'BOOLEAN', 'NUMBER', 'RANGE', 'DURATION', 'JSON');

-- CreateEnum
CREATE TYPE "ParameterScope" AS ENUM ('GLOBAL', 'CHARACTER', 'ENVIRONMENT', 'SCENE', 'OUTPUT');

-- CreateEnum
CREATE TYPE "GenerationStatus" AS ENUM ('PENDING', 'RUNNING', 'SUCCEEDED', 'FAILED');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "authSubject" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "displayName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Workspace" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Workspace_pkey" PRIMARY KEY ("id")
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
CREATE TABLE "Project" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "genre" TEXT,
    "language" TEXT NOT NULL DEFAULT 'pt-BR',
    "durationSeconds" INTEGER,
    "configuration" JSONB NOT NULL DEFAULT '{}',
    "visualBible" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Project_pkey" PRIMARY KEY ("id")
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
    "required" BOOLEAN NOT NULL DEFAULT false,
    "defaultValue" JSONB,
    "options" JSONB,
    "validationRules" JSONB,
    "visibilityRules" JSONB,
    "promptMapping" JSONB,
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

    CONSTRAINT "SceneCharacter_pkey" PRIMARY KEY ("sceneId","characterId")
);

-- CreateTable
CREATE TABLE "SceneEnvironment" (
    "sceneId" TEXT NOT NULL,
    "environmentId" TEXT NOT NULL,

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

-- CreateIndex
CREATE UNIQUE INDEX "User_authSubject_key" ON "User"("authSubject");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Workspace_slug_key" ON "Workspace"("slug");

-- CreateIndex
CREATE INDEX "Membership_workspaceId_role_idx" ON "Membership"("workspaceId", "role");

-- CreateIndex
CREATE UNIQUE INDEX "Membership_userId_workspaceId_key" ON "Membership"("userId", "workspaceId");

-- CreateIndex
CREATE INDEX "Project_workspaceId_updatedAt_idx" ON "Project"("workspaceId", "updatedAt");

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
CREATE INDEX "Environment_projectId_name_idx" ON "Environment"("projectId", "name");

-- CreateIndex
CREATE INDEX "Scene_projectId_order_idx" ON "Scene"("projectId", "order");

-- CreateIndex
CREATE UNIQUE INDEX "Scene_projectId_order_key" ON "Scene"("projectId", "order");

-- CreateIndex
CREATE INDEX "PromptTemplate_key_enabled_idx" ON "PromptTemplate"("key", "enabled");

-- CreateIndex
CREATE UNIQUE INDEX "PromptTemplate_key_version_key" ON "PromptTemplate"("key", "version");

-- CreateIndex
CREATE INDEX "PromptVersion_projectId_createdAt_idx" ON "PromptVersion"("projectId", "createdAt");

-- CreateIndex
CREATE INDEX "PromptVersion_sceneId_createdAt_idx" ON "PromptVersion"("sceneId", "createdAt");

-- CreateIndex
CREATE INDEX "GenerationJob_projectId_status_createdAt_idx" ON "GenerationJob"("projectId", "status", "createdAt");

-- AddForeignKey
ALTER TABLE "Membership" ADD CONSTRAINT "Membership_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Membership" ADD CONSTRAINT "Membership_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

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
