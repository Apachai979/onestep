-- CreateTable
CREATE TABLE "codes" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "neosetId" INTEGER,
    "title" TEXT NOT NULL,
    "transcript" TEXT NOT NULL,
    CONSTRAINT "codes_neosetId_fkey" FOREIGN KEY ("neosetId") REFERENCES "neosets" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Consist" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "codeId" INTEGER,
    "napkin" TEXT,
    "ball" TEXT,
    "pintsetMedium" TEXT,
    "pintsetThin" TEXT,
    "scalpelRemoveFiber" TEXT,
    "scalpelEleven" TEXT,
    "clamp" TEXT,
    "needleHolder" TEXT,
    "container" TEXT,
    "bandage" TEXT,
    "plasterTrip" TEXT,
    "plaster" TEXT,
    "plasterPostOperative" TEXT,
    "plasterFixCatheter" TEXT,
    "cover" TEXT,
    "coverAperture" TEXT,
    "coverAdhesive" TEXT,
    CONSTRAINT "Consist_codeId_fkey" FOREIGN KEY ("codeId") REFERENCES "codes" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
