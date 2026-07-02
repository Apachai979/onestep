import prisma from "@/lib/client"
import { fetchStockFromOnec } from "./onec"

/**
 * Тянет остатки из 1С и сохраняет в нашу БД.
 * Возвращает статистику: { updated, missing[], warehouses[], totalRows }.
 */
export async function syncStockFromOnec() {
    const rows = await fetchStockFromOnec()
    const syncedAt = new Date()

    // Группируем артикулы и подтягиваем их одним запросом.
    const articleSet = new Set(
        rows.map(r => String(r.article || "").trim()).filter(Boolean),
    )
    const products = articleSet.size
        ? await prisma.product.findMany({
              where: { sku: { in: Array.from(articleSet) } },
              select: { id: true, sku: true },
          })
        : []
    const productBySku = new Map(products.map(p => [p.sku, p]))

    const missing = []
    const warehouses = new Set()
    const touchedProductIds = new Set()
    const upserts = []

    for (const r of rows) {
        const article = String(r.article || "").trim()
        if (!article) continue
        const product = productBySku.get(article)
        if (!product) {
            missing.push(article)
            continue
        }
        const warehouse = String(r.warehouse || "").trim() || "Не указан"
        const boxes = Number(r.quantity) || 0
        const perBox = Number(r.quantity_sets_in_box) || 1
        const pieces = Math.max(0, Math.round(boxes * perBox))

        upserts.push(
            prisma.stock.upsert({
                where: {
                    productId_warehouse: { productId: product.id, warehouse },
                },
                create: {
                    productId: product.id,
                    warehouse,
                    quantity: pieces,
                    syncedAt,
                },
                update: { quantity: pieces, syncedAt },
            }),
        )
        warehouses.add(warehouse)
        touchedProductIds.add(product.id)
    }

    // Одна транзакция вместо построчных запросов: один fsync на весь батч
    // и атомарность — при обрыве синка не останется половины остатков.
    if (upserts.length) await prisma.$transaction(upserts)
    const updated = upserts.length

    // Записи, которые перестали приходить из 1С для синхронизированных товаров,
    // считаем устаревшими и удаляем (на этих складах товара больше нет).
    let removed = 0
    if (touchedProductIds.size > 0) {
        const res = await prisma.stock.deleteMany({
            where: {
                productId: { in: Array.from(touchedProductIds) },
                syncedAt: { lt: syncedAt },
            },
        })
        removed = res.count
    }

    return {
        totalRows: rows.length,
        updated,
        removed,
        missingCount: missing.length,
        missing: missing.slice(0, 50),
        warehouses: Array.from(warehouses).sort(),
        syncedAt: syncedAt.toISOString(),
    }
}

export function totalStockPieces(stocks) {
    if (!Array.isArray(stocks)) return 0
    return stocks.reduce((s, x) => s + (Number(x.quantity) || 0), 0)
}
