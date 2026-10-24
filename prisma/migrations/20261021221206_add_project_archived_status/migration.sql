-- AlterTable
ALTER TABLE "Project" ADD COLUMN     "archivedAt" TIMESTAMP(3),
ADD COLUMN     "isArchived" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "Project_workspaceId_isArchived_idx" ON "Project"("workspaceId", "isArchived");
