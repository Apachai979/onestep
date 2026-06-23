-- RedefineTables
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_project_items" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "productId" TEXT,
    "sku" TEXT,
    "name" TEXT NOT NULL,
    "quantity" DECIMAL NOT NULL DEFAULT 1,
    "amount" DECIMAL NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "project_items_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "project_items_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_project_items" ("amount", "createdAt", "id", "name", "projectId", "quantity", "sku", "updatedAt") SELECT "amount", "createdAt", "id", "name", "projectId", "quantity", "sku", "updatedAt" FROM "project_items";
DROP TABLE "project_items";
ALTER TABLE "new_project_items" RENAME TO "project_items";
CREATE INDEX "project_items_projectId_idx" ON "project_items"("projectId");
CREATE INDEX "project_items_productId_idx" ON "project_items"("productId");
PRAGMA foreign_key_check("project_items");
PRAGMA foreign_keys=ON;
