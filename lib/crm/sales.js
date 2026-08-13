// Отчёт «Продажи менеджеров».
//
// Продажа = проведённая отгрузка. Отдельного учёта денег в CRM нет, поэтому
// договорились считать, что деньги пришли, когда товар физически ушёл
// клиенту: статус отгрузки SHIPPED. Черновики не в счёт — они ничего не
// списывают со склада (та же граница, что в отчёте «Обеспечение»).
//
// Дата продажи — фактическая дата отгрузки (Shipment.shippedAt). Её
// проставляет сам переход в SHIPPED, а возврат в черновик её очищает, так что
// у проведённых документов она заполнена; отгрузку без даты отчёт пропустит и
// посчитает отдельно (unresolvedCount) — молча терять деньги нельзя.
//
// Продажу засчитываем менеджеру сделки (Deal.managerId), а не тому, кто
// оформил документ: отгрузку может завести логист или коллега на подмене, но
// клиента вёл владелец сделки. Кто оформил — видно в расшифровке.
//
// Сделки в «Не реализована» и «Архив» из отчёта исключены: раз сделку
// отменили, её отгрузки продажей не считаются (обычно это возврат или
// ошибочно проведённый документ). Побочный эффект осознанный — смена статуса
// сделки задним числом меняет цифру прошлого периода.
import { dealDisplayTitle } from "./deal"
import { crmMonthKey, monthsBetween } from "./period"

export const SALES_SHIPMENT_STATUS = "SHIPPED"
export const SALES_EXCLUDED_DEAL_STATUSES = ["CANCELLED", "ARCHIVED"]

function num(value) {
    if (value === null || value === undefined || value === "") return 0
    const n = Number(value)
    return Number.isFinite(n) ? n : 0
}

// Копейки при пропорциональном разнесении скидки дают хвосты вида 11.999999.
// Округляем на сборке итогов, а не при выводе — иначе сумма колонок не сходится
// с итоговой строкой.
function round(value, digits = 2) {
    const k = 10 ** digits
    return Math.round(value * k) / k
}

export function salesUserName(u) {
    if (!u) return "Без менеджера"
    return `${u.firstName ?? ""} ${u.lastName ?? ""}`.trim() || u.email || "Без менеджера"
}

// Цена единицы со скидкой сделки: DealItem.amount — сумма строки до скидки,
// скидка живёт на сделке и применяется ко всему итогу, поэтому разносим её по
// строкам пропорционально. Ровно та же формула, что в отчёте «Обеспечение», —
// иначе «к обеспечению» и «продано» считались бы в разных деньгах.
function discountedUnitPrice(dealItem, discount) {
    const qty = num(dealItem?.quantity)
    if (qty <= 0) return 0
    const unit = num(dealItem?.amount) / qty
    const pct = discount === null || discount === undefined ? 0 : num(discount)
    return unit * (1 - Math.min(100, Math.max(0, pct)) / 100)
}

// Ключ группировки по товару: привязка к справочнику, а для вписанных руками
// позиций — артикул или название. Разный регистр и пробелы одного и того же
// товара не должны плодить строки.
function productKey(dealItem) {
    if (dealItem?.productId) return `p:${dealItem.productId}`
    return `x:${(dealItem?.sku || dealItem?.name || "—").trim().toLowerCase()}`
}

// Накопитель на Map: одна и та же тройка «сумма / количество / документы»
// собирается по менеджерам, клиентам, товарам и месяцам.
function bump(map, key, init) {
    let row = map.get(key)
    if (!row) {
        row = init()
        map.set(key, row)
    }
    return row
}

function byAmountDesc(a, b) {
    return b.amount - a.amount
}

/**
 * Собирает отчёт из уже загруженных отгрузок (чистая функция — вся выборка
 * остаётся в sales-data.js).
 *
 * shipments: Shipment[] со статусом SHIPPED c include {
 *     id, number, shippedAt, createdBy: { … },
 *     deal: { id, title, status, discount, counterparty: { id, name, inn },
 *             sourceProject: { internalName }, manager: { … } },
 *     items: { quantity, dealItem: { productId, sku, name, quantity, amount,
 *              product: { id, sku, name } } }
 * }
 */
export function buildSalesReport({ shipments = [], from = null, to = null } = {}) {
    const managers = new Map()
    const counterparties = new Map()
    const products = new Map()
    const monthly = new Map()

    const dealIds = new Set()
    let totalAmount = 0
    let totalQty = 0
    let shipmentsCount = 0
    // Проведённая отгрузка без фактической даты в период не попадает: класть её
    // «куда-нибудь» значило бы двигать деньги между месяцами.
    let undatedCount = 0

    for (const sh of shipments) {
        const monthKey = crmMonthKey(sh.shippedAt)
        if (!monthKey) {
            undatedCount += 1
            continue
        }

        const deal = sh.deal || {}
        const manager = deal.manager || null
        const managerId = manager?.id || "—"
        const cp = deal.counterparty || null
        const cpId = cp?.id || "—"

        let shipmentAmount = 0
        let shipmentQty = 0
        const positions = []

        for (const item of sh.items || []) {
            const dealItem = item.dealItem
            if (!dealItem) continue
            const qty = num(item.quantity)
            if (qty === 0) continue
            const amount = round(qty * discountedUnitPrice(dealItem, deal.discount))
            shipmentAmount += amount
            shipmentQty += qty
            positions.push({
                key: productKey(dealItem),
                productId: dealItem.productId || null,
                sku: dealItem.product?.sku || dealItem.sku || null,
                name: dealItem.product?.name || dealItem.name || "—",
                qty,
                amount,
            })
        }

        shipmentAmount = round(shipmentAmount)
        totalAmount += shipmentAmount
        totalQty += shipmentQty
        shipmentsCount += 1
        if (deal.id) dealIds.add(deal.id)

        // --- Менеджер
        const m = bump(managers, managerId, () => ({
            id: manager?.id || null,
            name: salesUserName(manager),
            email: manager?.email || null,
            position: manager?.position || null,
            amount: 0,
            qty: 0,
            shipmentsCount: 0,
            deals: new Set(),
            counterpartiesMap: new Map(),
            productsMap: new Map(),
            byMonth: new Map(),
            shipments: [],
        }))
        m.amount += shipmentAmount
        m.qty += shipmentQty
        m.shipmentsCount += 1
        if (deal.id) m.deals.add(deal.id)
        m.byMonth.set(monthKey, round((m.byMonth.get(monthKey) || 0) + shipmentAmount))

        // Клиент — контрагент сделки, а не плательщик: документы могут быть
        // оформлены на другое юрлицо группы, но закупает клиент (та же логика,
        // что в обороте и в «Обеспечении»).
        const cpRow = bump(m.counterpartiesMap, cpId, () => ({
            id: cp?.id || null,
            name: cp?.name || "Без контрагента",
            inn: cp?.inn || null,
            amount: 0,
            qty: 0,
            shipmentsCount: 0,
        }))
        cpRow.amount += shipmentAmount
        cpRow.qty += shipmentQty
        cpRow.shipmentsCount += 1

        for (const p of positions) {
            const pr = bump(m.productsMap, p.key, () => ({
                key: p.key,
                productId: p.productId,
                sku: p.sku,
                name: p.name,
                matched: Boolean(p.productId),
                amount: 0,
                qty: 0,
            }))
            pr.amount += p.amount
            pr.qty += p.qty

            const grand = bump(products, p.key, () => ({
                key: p.key,
                productId: p.productId,
                sku: p.sku,
                name: p.name,
                matched: Boolean(p.productId),
                amount: 0,
                qty: 0,
                managers: new Set(),
            }))
            grand.amount += p.amount
            grand.qty += p.qty
            grand.managers.add(managerId)
        }

        m.shipments.push({
            id: sh.id,
            number: sh.number,
            shippedAt: sh.shippedAt,
            dealId: deal.id || null,
            dealTitle: dealDisplayTitle(deal, cp?.name),
            dealStatus: deal.status || null,
            counterpartyId: cp?.id || null,
            counterpartyName: cp?.name || "Без контрагента",
            createdByName: sh.createdBy ? salesUserName(sh.createdBy) : null,
            // Оформил не тот, кто ведёт сделку, — в расшифровке это стоит
            // видеть, иначе непонятно, почему у менеджера чужой документ.
            createdByOther: Boolean(
                sh.createdBy?.id && manager?.id && sh.createdBy.id !== manager.id,
            ),
            positionsCount: positions.length,
            qty: shipmentQty,
            amount: shipmentAmount,
        })

        // --- Сводные разрезы по всем менеджерам
        const gcp = bump(counterparties, cpId, () => ({
            id: cp?.id || null,
            name: cp?.name || "Без контрагента",
            inn: cp?.inn || null,
            amount: 0,
            qty: 0,
            shipmentsCount: 0,
            managers: new Set(),
        }))
        gcp.amount += shipmentAmount
        gcp.qty += shipmentQty
        gcp.shipmentsCount += 1
        gcp.managers.add(managerId)

        const mo = bump(monthly, monthKey, () => ({
            key: monthKey,
            amount: 0,
            qty: 0,
            shipmentsCount: 0,
        }))
        mo.amount += shipmentAmount
        mo.qty += shipmentQty
        mo.shipmentsCount += 1
    }

    totalAmount = round(totalAmount)

    // Сетка месяцев — от периода, а не от данных: месяц без отгрузок должен
    // быть виден нулём, иначе провал в динамике незаметен.
    const monthKeys = monthsBetween(from, to)
    const months = (monthKeys.length ? monthKeys : Array.from(monthly.keys()).sort()).map(key => {
        const row = monthly.get(key)
        return {
            key,
            amount: round(row?.amount || 0),
            qty: round(row?.qty || 0),
            shipmentsCount: row?.shipmentsCount || 0,
        }
    })

    const managerRows = Array.from(managers.values())
        .map(m => ({
            id: m.id,
            name: m.name,
            email: m.email,
            position: m.position,
            amount: round(m.amount),
            qty: round(m.qty),
            shipmentsCount: m.shipmentsCount,
            dealsCount: m.deals.size,
            counterpartiesCount: m.counterpartiesMap.size,
            share: totalAmount > 0 ? round((m.amount / totalAmount) * 100, 1) : 0,
            byMonth: months.map(mo => round(m.byMonth.get(mo.key) || 0)),
            counterparties: Array.from(m.counterpartiesMap.values())
                .map(c => ({ ...c, amount: round(c.amount), qty: round(c.qty) }))
                .sort(byAmountDesc),
            products: Array.from(m.productsMap.values())
                .map(p => ({ ...p, amount: round(p.amount), qty: round(p.qty) }))
                .sort(byAmountDesc),
            shipments: m.shipments.sort(
                (a, b) => new Date(b.shippedAt) - new Date(a.shippedAt),
            ),
        }))
        .sort(byAmountDesc)

    return {
        period: { from, to },
        months,
        managers: managerRows,
        counterparties: Array.from(counterparties.values())
            .map(({ managers: mset, ...c }) => ({
                ...c,
                amount: round(c.amount),
                qty: round(c.qty),
                managersCount: mset.size,
            }))
            .sort(byAmountDesc),
        products: Array.from(products.values())
            .map(({ managers: mset, ...p }) => ({
                ...p,
                amount: round(p.amount),
                qty: round(p.qty),
                managersCount: mset.size,
            }))
            .sort(byAmountDesc),
        totals: {
            amount: totalAmount,
            qty: round(totalQty),
            shipmentsCount,
            dealsCount: dealIds.size,
            managersCount: managerRows.length,
            counterpartiesCount: counterparties.size,
            productsCount: products.size,
            undatedCount,
            // Средний чек — по отгрузке: «средняя сделка» сбивала бы с толку,
            // сделку могут отгружать частями.
            averageShipment: shipmentsCount > 0 ? round(totalAmount / shipmentsCount) : 0,
        },
    }
}
