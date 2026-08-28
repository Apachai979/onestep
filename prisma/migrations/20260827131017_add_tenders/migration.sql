-- CreateTable
CREATE TABLE "tenders" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenderlandId" TEXT NOT NULL,
    "regNumber" TEXT,
    "name" TEXT NOT NULL,
    "beginPrice" DECIMAL NOT NULL DEFAULT 0,
    "publishDate" DATETIME,
    "beginDate" DATETIME,
    "endDate" DATETIME,
    "biddingDate" DATETIME,
    "region" TEXT,
    "typeName" TEXT,
    "tenderStatus" TEXT,
    "sourceLink" TEXT,
    "etpName" TEXT,
    "ktru" TEXT,
    "customerName" TEXT,
    "customerInn" TEXT,
    "customerKpp" TEXT,
    "customerOgrn" TEXT,
    "decision" TEXT NOT NULL DEFAULT 'NEW',
    "decisionAt" DATETIME,
    "decisionById" TEXT,
    "skipReason" TEXT,
    "dealId" TEXT,
    "importedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "tenders_decisionById_fkey" FOREIGN KEY ("decisionById") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "tenders_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "deals" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "tenders_tenderlandId_key" ON "tenders"("tenderlandId");

-- CreateIndex
CREATE UNIQUE INDEX "tenders_dealId_key" ON "tenders"("dealId");

-- CreateIndex
CREATE INDEX "tenders_decision_idx" ON "tenders"("decision");

-- CreateIndex
CREATE INDEX "tenders_endDate_idx" ON "tenders"("endDate");

-- CreateIndex
CREATE INDEX "tenders_customerInn_idx" ON "tenders"("customerInn");
