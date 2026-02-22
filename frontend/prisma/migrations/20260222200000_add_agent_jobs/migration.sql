-- CreateEnum
CREATE TYPE "AgentJobStatus" AS ENUM ('QUEUED', 'RUNNING', 'SUCCEEDED', 'FAILED');

-- CreateTable
CREATE TABLE "DatasetAgentJob" (
    "id" TEXT NOT NULL,
    "datasetId" TEXT NOT NULL,
    "attachmentId" TEXT NOT NULL,
    "status" "AgentJobStatus" NOT NULL DEFAULT 'QUEUED',
    "inputJson" JSONB NOT NULL,
    "resultJson" JSONB,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DatasetAgentJob_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DatasetAgentJob_datasetId_idx" ON "DatasetAgentJob"("datasetId");

-- CreateIndex
CREATE INDEX "DatasetAgentJob_status_idx" ON "DatasetAgentJob"("status");

-- AddForeignKey
ALTER TABLE "DatasetAgentJob" ADD CONSTRAINT "DatasetAgentJob_datasetId_fkey" FOREIGN KEY ("datasetId") REFERENCES "Dataset"("id") ON DELETE CASCADE ON UPDATE CASCADE;
