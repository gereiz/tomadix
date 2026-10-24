-- CreateEnum
DO $$ BEGIN
  CREATE TYPE "InviteStatus" AS ENUM ('PENDING', 'ACCEPTED', 'DECLINED', 'CANCELED', 'EXPIRED');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- AlterTable
ALTER TABLE "Workspace" ADD COLUMN IF NOT EXISTS "isPersonal" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Workspace" ADD COLUMN IF NOT EXISTS "isArchived" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Workspace" ADD COLUMN IF NOT EXISTS "archivedAt" TIMESTAMP(3);
ALTER TABLE "Workspace" ADD COLUMN IF NOT EXISTS "settings" JSONB DEFAULT '{}';

-- CreateTable
CREATE TABLE IF NOT EXISTS "WorkspaceInvite" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" "WorkspaceRole" NOT NULL DEFAULT 'MEMBER',
    "token" TEXT NOT NULL,
    "status" "InviteStatus" NOT NULL DEFAULT 'PENDING',
    "invitedById" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WorkspaceInvite_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "WorkspaceInvite_token_key" ON "WorkspaceInvite"("token");
CREATE INDEX IF NOT EXISTS "WorkspaceInvite_workspaceId_status_idx" ON "WorkspaceInvite"("workspaceId", "status");
CREATE INDEX IF NOT EXISTS "WorkspaceInvite_email_status_idx" ON "WorkspaceInvite"("email", "status");
CREATE INDEX IF NOT EXISTS "WorkspaceInvite_token_idx" ON "WorkspaceInvite"("token");
CREATE INDEX IF NOT EXISTS "Workspace_isArchived_idx" ON "Workspace"("isArchived");

-- AddForeignKey
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'WorkspaceInvite_invitedById_fkey') THEN
    ALTER TABLE "WorkspaceInvite" ADD CONSTRAINT "WorkspaceInvite_invitedById_fkey" FOREIGN KEY ("invitedById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'WorkspaceInvite_workspaceId_fkey') THEN
    ALTER TABLE "WorkspaceInvite" ADD CONSTRAINT "WorkspaceInvite_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
