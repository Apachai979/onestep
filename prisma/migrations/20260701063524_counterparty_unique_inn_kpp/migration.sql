-- DropIndex
DROP INDEX "counterparties_inn_key";

-- CreateIndex
CREATE UNIQUE INDEX "counterparties_inn_kpp_key" ON "counterparties"("inn", "kpp");
