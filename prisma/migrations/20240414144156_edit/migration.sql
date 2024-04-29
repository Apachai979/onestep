/*
  Warnings:

  - You are about to drop the `Consist` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `codes` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "Consist";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "codes";
PRAGMA foreign_keys=on;
