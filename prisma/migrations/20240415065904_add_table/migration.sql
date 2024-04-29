-- CreateTable
CREATE TABLE "consistOf" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "codeId" INTEGER,
    "component" TEXT NOT NULL,
    "count" INTEGER NOT NULL,
    CONSTRAINT "consistOf_codeId_fkey" FOREIGN KEY ("codeId") REFERENCES "codes" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
