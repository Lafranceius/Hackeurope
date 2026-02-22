-- CreateTable
CREATE TABLE "DatasetPricingConfig" (
    "id" TEXT NOT NULL,
    "datasetId" TEXT NOT NULL,
    "autoPricingEnabled" BOOLEAN NOT NULL DEFAULT false,
    "minPrice" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "maxPrice" DECIMAL(12,2) NOT NULL DEFAULT 1000000,
    "maxWeeklyChangePct" INTEGER NOT NULL DEFAULT 10,
    "lastAppliedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DatasetPricingConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DatasetPricingSnapshot" (
    "id" TEXT NOT NULL,
    "datasetId" TEXT NOT NULL,
    "recommendedPrice" DECIMAL(12,2) NOT NULL,
    "appliedPrice" DECIMAL(12,2),
    "inputsJson" JSONB NOT NULL,
    "explanationJson" JSONB NOT NULL,
    "computedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DatasetPricingSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PriceChangeAudit" (
    "id" TEXT NOT NULL,
    "datasetId" TEXT NOT NULL,
    "actorUserId" TEXT NOT NULL,
    "oldPrice" DECIMAL(12,2) NOT NULL,
    "newPrice" DECIMAL(12,2) NOT NULL,
    "reason" TEXT NOT NULL,
    "appliedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PriceChangeAudit_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DatasetPricingConfig_datasetId_key" ON "DatasetPricingConfig"("datasetId");

-- CreateIndex
CREATE INDEX "DatasetPricingSnapshot_datasetId_idx" ON "DatasetPricingSnapshot"("datasetId");

-- CreateIndex
CREATE INDEX "DatasetPricingSnapshot_computedAt_idx" ON "DatasetPricingSnapshot"("computedAt");

-- CreateIndex
CREATE INDEX "PriceChangeAudit_datasetId_idx" ON "PriceChangeAudit"("datasetId");

-- CreateIndex
CREATE INDEX "PriceChangeAudit_appliedAt_idx" ON "PriceChangeAudit"("appliedAt");

-- AddForeignKey
ALTER TABLE "DatasetPricingConfig" ADD CONSTRAINT "DatasetPricingConfig_datasetId_fkey" FOREIGN KEY ("datasetId") REFERENCES "Dataset"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DatasetPricingSnapshot" ADD CONSTRAINT "DatasetPricingSnapshot_datasetId_fkey" FOREIGN KEY ("datasetId") REFERENCES "Dataset"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PriceChangeAudit" ADD CONSTRAINT "PriceChangeAudit_datasetId_fkey" FOREIGN KEY ("datasetId") REFERENCES "Dataset"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PriceChangeAudit" ADD CONSTRAINT "PriceChangeAudit_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
