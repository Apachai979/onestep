-- AlterTable
ALTER TABLE "change_logs" ADD COLUMN "parentEntityId" TEXT;
ALTER TABLE "change_logs" ADD COLUMN "parentEntityType" TEXT;

-- CreateIndex
CREATE INDEX "change_logs_parentEntityType_parentEntityId_idx" ON "change_logs"("parentEntityType", "parentEntityId");
