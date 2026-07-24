-- Слияние аукционов со сделками: сначала переносим данные в deals, затем
-- удаляем таблицы auctions/auction_items, колонку deals.sourceAuctionId и
-- tasks.auctionId. Перенос сделан на чистом SQL, чтобы `prisma migrate deploy`
-- на проде выполнил его атомарно ДО удаления таблиц (иначе данные пропали бы).
--
-- Предпросмотр объёма переноса можно снять до деплоя:
--   node prisma/migrate_auctions_to_deals.js   (использует ещё не удалённую модель Auction)

PRAGMA foreign_keys=OFF;

-- 1) Аукцион, у которого уже есть связанная сделка (в проде связь всегда 1:1):
--    вливаем параметры аукциона в эту сделку.
UPDATE "deals" SET
    "isAuction" = 1,
    "purchaseNumber" = (SELECT a."purchaseNumber" FROM "auctions" a WHERE a."id" = "deals"."sourceAuctionId"),
    "auctionUrl" = (SELECT a."auctionUrl" FROM "auctions" a WHERE a."id" = "deals"."sourceAuctionId"),
    "nmck" = COALESCE((SELECT a."nmck" FROM "auctions" a WHERE a."id" = "deals"."sourceAuctionId"), 0),
    "bidsDeadlineAt" = (SELECT a."bidsDeadlineAt" FROM "auctions" a WHERE a."id" = "deals"."sourceAuctionId"),
    "auctionAt" = (SELECT a."auctionAt" FROM "auctions" a WHERE a."id" = "deals"."sourceAuctionId"),
    "resultsAt" = (SELECT a."resultsAt" FROM "auctions" a WHERE a."id" = "deals"."sourceAuctionId"),
    "participantsCount" = (SELECT a."participantsCount" FROM "auctions" a WHERE a."id" = "deals"."sourceAuctionId"),
    "bidsCount" = (SELECT a."bidsCount" FROM "auctions" a WHERE a."id" = "deals"."sourceAuctionId"),
    "winner" = (SELECT a."winner" FROM "auctions" a WHERE a."id" = "deals"."sourceAuctionId"),
    "auctionCustomerId" = (SELECT a."customerId" FROM "auctions" a WHERE a."id" = "deals"."sourceAuctionId"),
    "auctionCustomerContactId" = (SELECT a."customerContactId" FROM "auctions" a WHERE a."id" = "deals"."sourceAuctionId")
WHERE "sourceAuctionId" IS NOT NULL
    AND EXISTS (SELECT 1 FROM "auctions" a WHERE a."id" = "deals"."sourceAuctionId");

-- 2) Аукцион без связанной сделки → создаём сделку. sourceAuctionId ставим
--    временно (эта колонка удаляется ниже) — нужен для переноса позиций/задач.
INSERT INTO "deals" (
    "id", "title", "status", "lossReason", "lossComment", "totalAmount", "isAuction",
    "purchaseNumber", "auctionUrl", "nmck", "bidsDeadlineAt", "auctionAt", "resultsAt",
    "participantsCount", "bidsCount", "winner", "counterpartyId", "contactId",
    "auctionCustomerId", "auctionCustomerContactId", "managerId", "createdById",
    "sourceProjectId", "sourceAuctionId", "createdAt", "updatedAt"
)
SELECT
    'mig' || lower(hex(randomblob(13))),
    CASE WHEN a."purchaseNumber" IS NOT NULL THEN 'По закупке № ' || a."purchaseNumber" ELSE 'По аукциону' END,
    CASE WHEN a."status" IN ('LOST', 'CANCELLED') THEN 'CANCELLED' ELSE 'NEGOTIATION' END,
    CASE WHEN a."status" IN ('LOST', 'CANCELLED') THEN 'AUCTION_CANCELLED' ELSE NULL END,
    CASE WHEN a."status" IN ('LOST', 'CANCELLED') THEN a."lossComment" ELSE NULL END,
    COALESCE((SELECT SUM(ai."amount") FROM "auction_items" ai WHERE ai."auctionId" = a."id"), 0),
    1,
    a."purchaseNumber", a."auctionUrl", a."nmck", a."bidsDeadlineAt", a."auctionAt", a."resultsAt",
    a."participantsCount", a."bidsCount", a."winner", a."supplierId", a."supplierContactId",
    a."customerId", a."customerContactId", a."managerId", COALESCE(a."createdById", a."managerId"),
    a."projectId", a."id", a."createdAt", a."updatedAt"
FROM "auctions" a
WHERE NOT EXISTS (SELECT 1 FROM "deals" d WHERE d."sourceAuctionId" = a."id");

-- 3) Позиции аукционов без сделки → в новосозданные сделки (связь по sourceAuctionId).
INSERT INTO "deal_items" ("id", "dealId", "productId", "sku", "name", "quantity", "amount", "createdAt", "updatedAt")
SELECT 'mig' || lower(hex(randomblob(13))), d."id", ai."productId", ai."sku", ai."name", ai."quantity", ai."amount", ai."createdAt", ai."updatedAt"
FROM "auction_items" ai
JOIN "deals" d ON d."sourceAuctionId" = ai."auctionId"
WHERE d."id" LIKE 'mig%';

-- 4) Задачи аукционов → на получившуюся сделку.
UPDATE "tasks" SET "dealId" = (
    SELECT d."id" FROM "deals" d WHERE d."sourceAuctionId" = "tasks"."auctionId" LIMIT 1
)
WHERE "auctionId" IS NOT NULL AND "dealId" IS NULL
    AND EXISTS (SELECT 1 FROM "deals" d WHERE d."sourceAuctionId" = "tasks"."auctionId");

-- deals без sourceAuctionId
CREATE TABLE "new_deals" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT,
    "status" TEXT NOT NULL DEFAULT 'NEGOTIATION',
    "totalAmount" DECIMAL NOT NULL DEFAULT 0,
    "discount" DECIMAL,
    "note" TEXT,
    "deliveryAddress" TEXT,
    "lossReason" TEXT,
    "lossComment" TEXT,
    "isAuction" BOOLEAN NOT NULL DEFAULT false,
    "purchaseNumber" TEXT,
    "auctionUrl" TEXT,
    "nmck" DECIMAL NOT NULL DEFAULT 0,
    "bidsDeadlineAt" DATETIME,
    "auctionAt" DATETIME,
    "resultsAt" DATETIME,
    "participantsCount" INTEGER,
    "bidsCount" INTEGER,
    "winner" TEXT,
    "counterpartyId" TEXT NOT NULL,
    "contactId" TEXT,
    "auctionCustomerId" TEXT,
    "auctionCustomerContactId" TEXT,
    "managerId" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "updatedById" TEXT,
    "sourceProjectId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "deals_counterpartyId_fkey" FOREIGN KEY ("counterpartyId") REFERENCES "counterparties" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "deals_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "contacts" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "deals_auctionCustomerId_fkey" FOREIGN KEY ("auctionCustomerId") REFERENCES "counterparties" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "deals_auctionCustomerContactId_fkey" FOREIGN KEY ("auctionCustomerContactId") REFERENCES "contacts" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "deals_managerId_fkey" FOREIGN KEY ("managerId") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "deals_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "deals_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "deals_sourceProjectId_fkey" FOREIGN KEY ("sourceProjectId") REFERENCES "projects" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_deals" ("id", "title", "status", "totalAmount", "discount", "note", "deliveryAddress", "lossReason", "lossComment", "isAuction", "purchaseNumber", "auctionUrl", "nmck", "bidsDeadlineAt", "auctionAt", "resultsAt", "participantsCount", "bidsCount", "winner", "counterpartyId", "contactId", "auctionCustomerId", "auctionCustomerContactId", "managerId", "createdById", "updatedById", "sourceProjectId", "createdAt", "updatedAt") SELECT "id", "title", "status", "totalAmount", "discount", "note", "deliveryAddress", "lossReason", "lossComment", "isAuction", "purchaseNumber", "auctionUrl", "nmck", "bidsDeadlineAt", "auctionAt", "resultsAt", "participantsCount", "bidsCount", "winner", "counterpartyId", "contactId", "auctionCustomerId", "auctionCustomerContactId", "managerId", "createdById", "updatedById", "sourceProjectId", "createdAt", "updatedAt" FROM "deals";
DROP TABLE "deals";
ALTER TABLE "new_deals" RENAME TO "deals";
CREATE INDEX "deals_status_idx" ON "deals"("status");
CREATE INDEX "deals_counterpartyId_idx" ON "deals"("counterpartyId");
CREATE INDEX "deals_managerId_idx" ON "deals"("managerId");
CREATE INDEX "deals_sourceProjectId_idx" ON "deals"("sourceProjectId");
CREATE INDEX "deals_isAuction_idx" ON "deals"("isAuction");

-- tasks без auctionId
CREATE TABLE "new_tasks" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "result" TEXT,
    "startAt" DATETIME NOT NULL,
    "endAt" DATETIME NOT NULL,
    "allDay" BOOLEAN NOT NULL DEFAULT true,
    "assigneeId" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "dealId" TEXT,
    "projectId" TEXT,
    "distributorId" TEXT,
    "endCustomerId" TEXT,
    "closedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "tasks_assigneeId_fkey" FOREIGN KEY ("assigneeId") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "tasks_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "tasks_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "deals" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "tasks_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "tasks_distributorId_fkey" FOREIGN KEY ("distributorId") REFERENCES "counterparties" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "tasks_endCustomerId_fkey" FOREIGN KEY ("endCustomerId") REFERENCES "counterparties" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_tasks" ("id", "title", "description", "type", "status", "result", "startAt", "endAt", "allDay", "assigneeId", "createdById", "dealId", "projectId", "distributorId", "endCustomerId", "closedAt", "createdAt", "updatedAt") SELECT "id", "title", "description", "type", "status", "result", "startAt", "endAt", "allDay", "assigneeId", "createdById", "dealId", "projectId", "distributorId", "endCustomerId", "closedAt", "createdAt", "updatedAt" FROM "tasks";
DROP TABLE "tasks";
ALTER TABLE "new_tasks" RENAME TO "tasks";
CREATE INDEX "tasks_status_idx" ON "tasks"("status");
CREATE INDEX "tasks_assigneeId_idx" ON "tasks"("assigneeId");
CREATE INDEX "tasks_startAt_idx" ON "tasks"("startAt");
CREATE INDEX "tasks_dealId_idx" ON "tasks"("dealId");
CREATE INDEX "tasks_projectId_idx" ON "tasks"("projectId");
CREATE INDEX "tasks_distributorId_idx" ON "tasks"("distributorId");
CREATE INDEX "tasks_endCustomerId_idx" ON "tasks"("endCustomerId");

-- Таблицы аукционов больше не нужны (данные перелиты в deals).
DROP TABLE "auction_items";
DROP TABLE "auctions";

PRAGMA foreign_key_check;
PRAGMA foreign_keys=ON;
