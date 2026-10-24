-- CreateTable ConsentRecord
CREATE TABLE IF NOT EXISTS "ConsentRecord" (
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

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ConsentRecord_userId_consentType_idx" ON "ConsentRecord"("userId", "consentType");
CREATE INDEX IF NOT EXISTS "ConsentRecord_consentType_createdAt_idx" ON "ConsentRecord"("consentType", "createdAt");

-- AddForeignKey
DO $$ BEGIN
    ALTER TABLE "ConsentRecord" ADD CONSTRAINT "ConsentRecord_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- CreateTable DataSubjectRequest
CREATE TABLE IF NOT EXISTS "DataSubjectRequest" (
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

-- CreateIndex
CREATE INDEX IF NOT EXISTS "DataSubjectRequest_email_status_idx" ON "DataSubjectRequest"("email", "status");
CREATE INDEX IF NOT EXISTS "DataSubjectRequest_requestType_status_idx" ON "DataSubjectRequest"("requestType", "status");

-- AddForeignKey
DO $$ BEGIN
    ALTER TABLE "DataSubjectRequest" ADD CONSTRAINT "DataSubjectRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;
