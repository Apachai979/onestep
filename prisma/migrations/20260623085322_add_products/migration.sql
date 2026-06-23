-- CreateTable
CREATE TABLE "products" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sku" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "basePrice" DECIMAL NOT NULL DEFAULT 0,
    "packagePrice" DECIMAL NOT NULL DEFAULT 0,
    "recommendedLpuPrice" DECIMAL,
    "transportPackQty" INTEGER NOT NULL DEFAULT 0,
    "contents" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "products_sku_key" ON "products"("sku");

-- CreateIndex
CREATE INDEX "products_category_idx" ON "products"("category");
