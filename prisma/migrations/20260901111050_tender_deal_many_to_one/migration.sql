-- DropIndex
DROP INDEX "tenders_dealId_key";

-- CreateIndex
CREATE INDEX "tenders_dealId_idx" ON "tenders"("dealId");
