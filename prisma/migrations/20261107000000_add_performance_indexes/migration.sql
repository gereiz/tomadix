-- CreateIndex
CREATE INDEX "CreditLedger_userId_idx" ON "CreditLedger"("userId");

-- CreateIndex
CREATE INDEX "CreditLedger_createdAt_amount_idx" ON "CreditLedger"("createdAt", "amount");

-- CreateIndex
CREATE INDEX "CreditLot_userId_idx" ON "CreditLot"("userId");

-- CreateIndex
CREATE INDEX "CreditLot_subscriptionId_idx" ON "CreditLot"("subscriptionId");

-- CreateIndex
CREATE INDEX "CreditLot_status_expiresAt_idx" ON "CreditLot"("status", "expiresAt");

-- CreateIndex
CREATE INDEX "GeneratedImage_characterId_idx" ON "GeneratedImage"("characterId");

-- CreateIndex
CREATE INDEX "GeneratedImage_environmentId_idx" ON "GeneratedImage"("environmentId");

-- CreateIndex
CREATE INDEX "GeneratedImage_sceneId_idx" ON "GeneratedImage"("sceneId");

-- CreateIndex
CREATE INDEX "GeneratedImage_promptVersionId_idx" ON "GeneratedImage"("promptVersionId");

-- CreateIndex
CREATE INDEX "GeneratedVideo_sceneId_idx" ON "GeneratedVideo"("sceneId");

-- CreateIndex
CREATE INDEX "GenerationJob_createdAt_idx" ON "GenerationJob"("createdAt");

-- CreateIndex
CREATE INDEX "GenerationJob_status_createdAt_idx" ON "GenerationJob"("status", "createdAt");

-- CreateIndex
CREATE INDEX "Invoice_status_idx" ON "Invoice"("status");

-- CreateIndex
CREATE INDEX "Invoice_subscriptionId_idx" ON "Invoice"("subscriptionId");

-- CreateIndex
CREATE INDEX "Project_workspaceId_createdAt_idx" ON "Project"("workspaceId", "createdAt");

-- CreateIndex
CREATE INDEX "PromptVersion_projectId_templateKey_sceneId_createdAt_idx" ON "PromptVersion"("projectId", "templateKey", "sceneId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "Session_expiresAt_idx" ON "Session"("expiresAt");

-- CreateIndex
CREATE INDEX "User_createdAt_idx" ON "User"("createdAt");

-- CreateIndex
CREATE INDEX "WorkspaceInvite_invitedById_idx" ON "WorkspaceInvite"("invitedById");

