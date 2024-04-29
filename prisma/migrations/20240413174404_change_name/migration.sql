/*
  Warnings:

  - You are about to drop the column `pintset` on the `Compose` table. All the data in the column will be lost.

*/
-- RedefineTables
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Compose" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "codeId" INTEGER,
    "gauzeballCount" TEXT,
    "adhesivestripCount" TEXT,
    "bandageCount" TEXT,
    "clipCount" TEXT,
    "coatingCount" TEXT,
    "containerCount" TEXT,
    "gauzepadCount" TEXT,
    "needleholderCount" TEXT,
    "plasterfixedCount" TEXT,
    "plastermainCount" TEXT,
    "plasterwithCount" TEXT,
    "scalpelCount" TEXT,
    "scalpelsharptipCount" TEXT,
    "tweezersCount" TEXT,
    "withapertureCount" TEXT,
    "withaperturemainCount" TEXT,
    "pintsetCount" TEXT,
    CONSTRAINT "Compose_codeId_fkey" FOREIGN KEY ("codeId") REFERENCES "Code" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Compose" ("adhesivestripCount", "bandageCount", "clipCount", "coatingCount", "codeId", "containerCount", "gauzeballCount", "gauzepadCount", "id", "needleholderCount", "plasterfixedCount", "plastermainCount", "plasterwithCount", "scalpelCount", "scalpelsharptipCount", "tweezersCount", "withapertureCount", "withaperturemainCount") SELECT "adhesivestripCount", "bandageCount", "clipCount", "coatingCount", "codeId", "containerCount", "gauzeballCount", "gauzepadCount", "id", "needleholderCount", "plasterfixedCount", "plastermainCount", "plasterwithCount", "scalpelCount", "scalpelsharptipCount", "tweezersCount", "withapertureCount", "withaperturemainCount" FROM "Compose";
DROP TABLE "Compose";
ALTER TABLE "new_Compose" RENAME TO "Compose";
PRAGMA foreign_key_check;
PRAGMA foreign_keys=ON;
