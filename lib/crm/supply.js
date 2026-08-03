// Отчёт «Обеспечение»: сколько товара лежит на складах и сколько из него уже
// обещано клиентам.
//
// Потребность берём из сделок, где состав уже согласован с клиентом и товар
// фактически обещан: CONFIRMED («Согласовано / Позиции»), CONTRACT («Договор /
// Счёт») и EXECUTION («Выполнение / Отгрузка»). Раньше по воронке состав ещё
// не зафиксирован, позже сделка закрыта и склад ей больше ничего не должен.
// Сделка без позиций в отчёт просто не приносит потребности.
//
// Уже отгруженное по проведённым отгрузкам из потребности вычитается: этот
// товар со склада физически ушёл, и остаток в Stock его больше не содержит —
// иначе он вычелся бы дважды. Именно поэтому «Выполнение / Отгрузка» можно
// держать в отчёте: в резерве остаётся только неотгруженный хвост заказа.
// Черновики отгрузок не в счёт: они ничего не списывают.
//
// Единица измерения везде одна — штуки (наборы): 1С отдаёт коробки, а
// syncStockFromOnec умножает их на вложение и пишет в Stock уже штуки.
import { dealDisplayTitle } from "./deal"

export const SUPPLY_DEAL_STATUSES = ["CONFIRMED", "CONTRACT", "EXECUTION"]
export const SUPPLY_SHIPMENT_STATUS = "SHIPPED"

function num(value) {
    if (value === null || value === undefined || value === "") return 0
    const n = Number(value)
    return Number.isFinite(n) ? n : 0
}

// Копейки/дробные штуки в сумме дают хвосты вида 11.999999999. Округляем при
// сборке итогов, а не при выводе — иначе «свободный остаток» показывает −0.
function round(value, digits = 2) {
    const k = 10 ** digits
    return Math.round(value * k) / k
}

// Сколько по позиции уже ушло проведёнными отгрузками.
export function shippedQtyOfItem(item) {
    return (item?.shipmentItems || []).reduce(
        (sum, si) =>
            si?.shipment?.status === SUPPLY_SHIPMENT_STATUS ? sum + num(si.quantity) : sum,
        0
    )
}

// Цена единицы позиции со скидкой сделки: DealItem.amount — сумма строки до
// скидки, скидка живёт на сделке и применяется ко всему итогу (см.
// dealDiscountedTotal), поэтому распределяем её по строкам пропорционально.
function discountedUnitPrice(item, discount) {
    const qty = num(item.quantity)
    if (qty <= 0) return 0
    const unit = num(item.amount) / qty
    const pct = discount === null || discount === undefined ? 0 : num(discount)
    return unit * (1 - Math.min(100, Math.max(0, pct)) / 100)
}

// Ключ группировки для позиций без привязки к справочнику: артикул, а если и
// его нет — название. Разный регистр и пробелы одного и того же товара не
// должны плодить строки.
function unmatchedKey(item) {
    return (item.sku || item.name || "—").trim().toLowerCase()
}

/**
 * Собирает отчёт из уже загруженных данных (чистая функция — вся выборка
 * остаётся в роуте).
 *
 * products: Product[] c include { stocks: { warehouse, quantity, syncedAt } }
 * deals:    Deal[] в статусах SUPPLY_DEAL_STATUSES c include {
 *     status, counterparty: { id, name, inn }, sourceProject: { internalName },
 *     items: { …, shipmentItems: { quantity, shipment: { status } } }
 * }
 */
export function buildSupplyReport({ products = [], deals = [] } = {}) {
    const warehouses = new Set()
    let syncedAt = null

    // 1. Склады.
    const byProduct = new Map()
    for (const p of products) {
        const stockByWarehouse = {}
        let stockTotal = 0
        for (const s of p.stocks || []) {
            const qty = num(s.quantity)
            stockByWarehouse[s.warehouse] = (stockByWarehouse[s.warehouse] || 0) + qty
            stockTotal += qty
            warehouses.add(s.warehouse)
            const t = s.syncedAt ? new Date(s.syncedAt).getTime() : NaN
            if (Number.isFinite(t) && (syncedAt === null || t > syncedAt)) syncedAt = t
        }
        byProduct.set(p.id, {
            id: p.id,
            sku: p.sku,
            name: p.name,
            category: p.category,
            stockByWarehouse,
            stockTotal,
            needQty: 0,
            needAmount: 0,
            freeQty: stockTotal,
            deals: [],
        })
    }

    // 2. Потребность из согласованных сделок.
    const byCounterparty = new Map()
    const unmatched = new Map()

    for (const deal of deals) {
        const cp = deal.counterparty
        const dealTitle = dealDisplayTitle(deal, cp?.name)

        for (const item of deal.items || []) {
            const orderedQty = num(item.quantity)
            const shippedQty = shippedQtyOfItem(item)
            // Отгрузили больше заказанного — потребности уже нет, в минус не уходим.
            const needQty = Math.max(0, round(orderedQty - shippedQty, 3))
            if (needQty <= 0) continue

            const needAmount = round(discountedUnitPrice(item, deal.discount) * needQty)
            const row = item.productId ? byProduct.get(item.productId) : null

            const source = {
                dealId: deal.id,
                dealTitle,
                dealStatus: deal.status,
                counterpartyId: cp?.id || null,
                counterpartyName: cp?.name || "—",
                counterpartyInn: cp?.inn || null,
                sku: row?.sku || item.sku || null,
                name: row?.name || item.name,
                productId: item.productId || null,
                matched: Boolean(row),
                orderedQty,
                shippedQty,
                needQty,
                needAmount,
            }

            if (row) {
                row.needQty = round(row.needQty + needQty, 3)
                row.needAmount = round(row.needAmount + needAmount)
                row.deals.push(source)
            } else {
                // Позиция вписана руками (или товар удалён из справочника):
                // остатка у неё нет по определению, в баланс склада не идёт.
                const key = unmatchedKey(item)
                const bucket = unmatched.get(key) || {
                    key,
                    sku: item.sku || null,
                    name: item.name,
                    needQty: 0,
                    needAmount: 0,
                    deals: [],
                }
                bucket.needQty = round(bucket.needQty + needQty, 3)
                bucket.needAmount = round(bucket.needAmount + needAmount)
                bucket.deals.push(source)
                unmatched.set(key, bucket)
            }

            // 3. Разрез по контрагентам. Берём клиента сделки, а не плательщика:
            // payerId — на кого оформлены документы, продукцию ждёт клиент.
            const cpKey = cp?.id || "—"
            const cpRow = byCounterparty.get(cpKey) || {
                id: cp?.id || null,
                name: cp?.name || "—",
                inn: cp?.inn || null,
                needQty: 0,
                needAmount: 0,
                dealIds: new Set(),
                items: [],
            }
            cpRow.needQty = round(cpRow.needQty + needQty, 3)
            cpRow.needAmount = round(cpRow.needAmount + needAmount)
            cpRow.dealIds.add(deal.id)
            cpRow.items.push(source)
            byCounterparty.set(cpKey, cpRow)
        }
    }

    // 4. Свободный остаток. Резерв общий по всем складам: сделка к складу не
    // привязана, распределение между складами — задача логистики.
    const productRows = Array.from(byProduct.values()).map(row => ({
        ...row,
        freeQty: round(row.stockTotal - row.needQty, 3),
        dealsCount: new Set(row.deals.map(d => d.dealId)).size,
    }))

    const counterpartyRows = Array.from(byCounterparty.values())
        .map(({ dealIds, ...row }) => ({
            ...row,
            dealsCount: dealIds.size,
            itemsCount: row.items.length,
        }))
        .sort((a, b) => b.needQty - a.needQty)

    const unmatchedRows = Array.from(unmatched.values()).sort((a, b) => b.needQty - a.needQty)

    const stockTotal = productRows.reduce((s, r) => s + r.stockTotal, 0)
    const matchedNeedQty = productRows.reduce((s, r) => s + r.needQty, 0)
    const unmatchedNeedQty = unmatchedRows.reduce((s, r) => s + r.needQty, 0)
    const needAmount =
        productRows.reduce((s, r) => s + r.needAmount, 0) +
        unmatchedRows.reduce((s, r) => s + r.needAmount, 0)

    return {
        warehouses: Array.from(warehouses).sort((a, b) => a.localeCompare(b, "ru")),
        products: productRows,
        counterparties: counterpartyRows,
        unmatched: unmatchedRows,
        totals: {
            stockTotal: round(stockTotal, 3),
            // Итог «к обеспечению» — вместе с несопоставленными позициями:
            // это тоже обещанный клиенту товар, просто без карточки в справочнике.
            needQty: round(matchedNeedQty + unmatchedNeedQty, 3),
            matchedNeedQty: round(matchedNeedQty, 3),
            unmatchedNeedQty: round(unmatchedNeedQty, 3),
            // Свободный остаток считается только по сопоставленным позициям:
            // у несопоставленных нет остатка, из которого их можно вычесть.
            freeQty: round(stockTotal - matchedNeedQty, 3),
            needAmount: round(needAmount),
            deficitCount: productRows.filter(r => r.freeQty < 0).length,
            dealsCount: deals.length,
            counterpartiesCount: counterpartyRows.length,
            syncedAt: syncedAt === null ? null : new Date(syncedAt).toISOString(),
        },
    }
}
