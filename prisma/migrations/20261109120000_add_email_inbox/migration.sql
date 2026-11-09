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

-- CreateIndex
CREATE UNIQUE INDEX "EmailMessage_mailbox_uid_key" ON "EmailMessage"("mailbox", "uid");

-- CreateIndex
CREATE INDEX "EmailMessage_receivedAt_idx" ON "EmailMessage"("receivedAt" DESC);

-- CreateIndex
CREATE INDEX "EmailMessage_isRead_receivedAt_idx" ON "EmailMessage"("isRead", "receivedAt" DESC);
