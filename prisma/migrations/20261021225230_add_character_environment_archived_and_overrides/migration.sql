-- AlterTable
ALTER TABLE "Character" ADD COLUMN     "archivedAt" TIMESTAMP(3),
ADD COLUMN     "isArchived" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Environment" ADD COLUMN     "archivedAt" TIMESTAMP(3),
ADD COLUMN     "isArchived" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "SceneCharacter" ADD COLUMN     "configuration" JSONB NOT NULL DEFAULT '{}';

-- AlterTable
ALTER TABLE "SceneEnvironment" ADD COLUMN     "configuration" JSONB NOT NULL DEFAULT '{}';

-- CreateIndex
CREATE INDEX "Character_projectId_isArchived_idx" ON "Character"("projectId", "isArchived");

-- CreateIndex
CREATE INDEX "Environment_projectId_isArchived_idx" ON "Environment"("projectId", "isArchived");
