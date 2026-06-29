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
    const seenKeys = new Set()
    const warehouses = new Set()
    const touchedProductIds = new Set()
    let updated = 0

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

        await prisma.stock.upsert({
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
        })
        seenKeys.add(`${product.id}|${warehouse}`)
        warehouses.add(warehouse)
        touchedProductIds.add(product.id)
        updated += 1
    }

    // Записи, которые перестали приходить из 1С для синхронизированных товаров,
    // считаем устаревшими и удаляем (на этих складах товара больше нет).
    let removed = 0
    if (touchedProductIds.size > 0) {
        const stale = await prisma.stock.findMany({
            where: {
                productId: { in: Array.from(touchedProductIds) },
                syncedAt: { lt: syncedAt },
            },
            select: { id: true },
        })
        if (stale.length) {
            const res = await prisma.stock.deleteMany({
                where: { id: { in: stale.map(s => s.id) } },
            })
            removed = res.count
        }
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
