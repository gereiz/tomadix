-- AlterEnum
ALTER TYPE "WorkspaceRole" ADD VALUE IF NOT EXISTS 'VIEWER';

-- AlterTable
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "passwordHash" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "emailConfirmed" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "emailConfirmationToken" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "emailConfirmationExpiresAt" TIMESTAMP(3);
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "passwordResetToken" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "passwordResetExpiresAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE IF NOT EXISTS "Session" (
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
CREATE TABLE IF NOT EXISTS "AuditLog" (
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

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "User_emailConfirmationToken_key" ON "User"("emailConfirmationToken");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "User_passwordResetToken_key" ON "User"("passwordResetToken");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "Session_tokenHash_key" ON "Session"("tokenHash");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Session_userId_expiresAt_idx" ON "Session"("userId", "expiresAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "AuditLog_workspaceId_createdAt_idx" ON "AuditLog"("workspaceId", "createdAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "AuditLog_userId_createdAt_idx" ON "AuditLog"("userId", "createdAt");

-- AddForeignKey
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'Session_userId_fkey'
    ) THEN
        ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

-- AddForeignKey
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'AuditLog_userId_fkey'
    ) THEN
        ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;
