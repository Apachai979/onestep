-- AlterTable
ALTER TABLE "tenders" ADD COLUMN "refreshedAt" DATETIME;
ALTER TABLE "tenders" ADD COLUMN "tlUpdatedAt" DATETIME;
ALTER TABLE "tenders" ADD COLUMN "winnerInn" TEXT;
ALTER TABLE "tenders" ADD COLUMN "winnerName" TEXT;
