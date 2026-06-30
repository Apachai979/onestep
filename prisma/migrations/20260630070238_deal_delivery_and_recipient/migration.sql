-- AlterTable
ALTER TABLE "deals" ADD COLUMN "deliveryAddress" TEXT;

-- AlterTable
ALTER TABLE "shipments" ADD COLUMN "recipientEmail" TEXT;
ALTER TABLE "shipments" ADD COLUMN "recipientName" TEXT;
ALTER TABLE "shipments" ADD COLUMN "recipientPhone" TEXT;
