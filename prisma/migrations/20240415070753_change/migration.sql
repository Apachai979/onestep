/*
  Warnings:

  - Added the required column `class` to the `consistOf` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_consistOf" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "codeId" INTEGER,
    "component" TEXT NOT NULL,
    "count" TEXT NOT NULL,
    "class" TEXT NOT NULL,
    CONSTRAINT "consistOf_codeId_fkey" FOREIGN KEY ("codeId") REFERENCES "codes" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_consistOf" ("codeId", "component", "count", "id") SELECT "codeId", "component", "count", "id" FROM "consistOf";
DROP TABLE "consistOf";
ALTER TABLE "new_consistOf" RENAME TO "consistOf";
PRAGMA foreign_key_check;
PRAGMA foreign_keys=ON;
