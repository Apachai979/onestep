// ПРЕДПРОСМОТР слияния аукционов в сделки (read-only, ничего не меняет).
//
// Сам перенос данных выполняет SQL внутри миграции
// 20260724074500_drop_auction_models (прогоняется `prisma migrate deploy`).
// Этот скрипт лишь показывает, сколько и как будет перенесено — запускать на
// текущем (ещё не обновлённом) проде, где модель Auction ещё существует:
//
//   node prisma/migrate_auctions_to_deals.js
//
// Логика миграции 2:
//  - Аукцион с 1 сделкой  → параметры аукциона вливаются в эту сделку.
//  - Аукцион без сделки   → создаётся сделка (клиент = поставщик, заказчик =
//    заказчик аукциона), переносятся позиции. Статус WON/IN_PROGRESS →
//    NEGOTIATION; LOST/CANCELLED → CANCELLED + причина «Аукцион отменён».
//  - Задачи аукционов     → перепривязываются на получившуюся сделку.

const { PrismaClient } = require("@prisma/client")

const prisma = new PrismaClient()

function mapStatus(auctionStatus) {
    return auctionStatus === "LOST" || auctionStatus === "CANCELLED"
        ? "CANCELLED"
        : "NEGOTIATION"
}

async function main() {
    if (!prisma.auction) {
        console.error(
            "Модель Auction уже удалена из схемы — предпросмотр запускать до обновления кода/схемы."
        )
        process.exit(1)
    }

    const auctions = await prisma.auction.findMany({
        include: { deals: { select: { id: true } }, items: { select: { id: true } } },
        orderBy: { createdAt: "asc" },
    })

    const withOne = auctions.filter(a => a.deals.length === 1)
    const withNone = auctions.filter(a => a.deals.length === 0)
    const withMany = auctions.filter(a => a.deals.length > 1)
    const taskCount = await prisma.task.count({ where: { auctionId: { not: null } } })

    console.log("=== Предпросмотр слияния аукционов в сделки ===")
    console.log(`Всего аукционов: ${auctions.length}`)
    console.log(`  • с 1 сделкой (влить параметры):      ${withOne.length}`)
    console.log(`  • без сделки (создать сделку):        ${withNone.length}`)
    console.log(`  • с >1 сделкой (ВНИМАНИЕ, разбор):    ${withMany.length}`)
    console.log(`Задач с auctionId (перепривязка):       ${taskCount}`)

    const byStatus = {}
    for (const a of withNone) {
        const s = mapStatus(a.status)
        byStatus[s] = (byStatus[s] || 0) + 1
    }
    if (withNone.length) {
        console.log("Новые сделки по статусам:")
        for (const [s, n] of Object.entries(byStatus)) console.log(`  • ${s}: ${n}`)
    }

    if (withMany.length) {
        console.log(
            "\n⚠ Аукционы с несколькими сделками — миграция вольёт параметры в ПЕРВУЮ найденную сделку. Проверьте:"
        )
        for (const a of withMany) {
            console.log(
                `  - ${a.id} (${a.purchaseNumber ? `№ ${a.purchaseNumber}` : "без номера"}), сделок: ${a.deals.length}`
            )
        }
    }

    console.log("\nЭто только предпросмотр. Перенос выполнит `prisma migrate deploy`.")
    await prisma.$disconnect()
}

main().catch(e => {
    console.error(e)
    process.exit(1)
})
