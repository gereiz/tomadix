-- CreateEnum
DO $$ BEGIN
    CREATE TYPE "PlatformRole" AS ENUM ('USER', 'ADMIN', 'SUPER_ADMIN');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- AlterTable User
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "platformRole" "PlatformRole" NOT NULL DEFAULT 'USER';
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "isSuspended" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "suspendedAt" TIMESTAMP(3);
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "suspensionReason" TEXT;

-- CreateIndex
CREATE INDEX IF NOT EXISTS "User_platformRole_idx" ON "User"("platformRole");
CREATE INDEX IF NOT EXISTS "User_isSuspended_idx" ON "User"("isSuspended");

-- CreateTable PlatformAuditLog
CREATE TABLE IF NOT EXISTS "PlatformAuditLog" (
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

-- CreateIndex
CREATE INDEX IF NOT EXISTS "PlatformAuditLog_adminUserId_createdAt_idx" ON "PlatformAuditLog"("adminUserId", "createdAt");
CREATE INDEX IF NOT EXISTS "PlatformAuditLog_targetType_targetId_idx" ON "PlatformAuditLog"("targetType", "targetId");
CREATE INDEX IF NOT EXISTS "PlatformAuditLog_action_createdAt_idx" ON "PlatformAuditLog"("action", "createdAt");

-- AddForeignKey
DO $$ BEGIN
    ALTER TABLE "PlatformAuditLog" ADD CONSTRAINT "PlatformAuditLog_adminUserId_fkey" FOREIGN KEY ("adminUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;
