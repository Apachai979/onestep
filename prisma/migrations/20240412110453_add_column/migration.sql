/*
  Warnings:

  - Added the required column `srcImg` to the `neosets` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_neosets" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "pathname" TEXT NOT NULL,
    "srcImg" TEXT NOT NULL
);
INSERT INTO "new_neosets" ("description", "id", "name", "pathname") SELECT "description", "id", "name", "pathname" FROM "neosets";
DROP TABLE "neosets";
ALTER TABLE "new_neosets" RENAME TO "neosets";
PRAGMA foreign_key_check;
PRAGMA foreign_keys=ON;
