export const SHIPMENT_STATUSES = ["DRAFT", "SHIPPED"]

export const SHIPMENT_STATUS_LABELS = {
    DRAFT: "Черновик",
    SHIPPED: "Отгружена",
}

export const SHIPMENT_STATUS_COLORS = {
    DRAFT: "bg-neutral-100 text-neutral-600",
    SHIPPED: "bg-emerald-50 text-emerald-700",
}

function parseDecimal(value, { min = 0, label }) {
    if (value === null || value === undefined || value === "") return { value: null }
    const str = String(value).replace(",", ".").trim()
    if (!/^-?\d+(\.\d+)?$/.test(str)) return { error: `${label}: введите число` }
    const num = Number(str)
    if (!Number.isFinite(num)) return { error: `${label}: некорректное число` }
    if (num < min) return { error: `${label}: значение не может быть меньше ${min}` }
    return { value: str }
}

function parseDate(value, { label }) {
    if (value === null || value === undefined || value === "") return { value: null }
    if (typeof value !== "string") return { error: `${label}: некорректная дата` }
    const d = new Date(value)
    if (Number.isNaN(d.getTime())) return { error: `${label}: некорректная дата` }
    return { value: d }
}

export function parseShipmentPayload(body, { partial = false } = {}) {
    if (!body || typeof body !== "object") return { error: "Некорректный запрос" }
    const data = {}

    if (!partial || body.dealId !== undefined) {
        if (typeof body.dealId !== "string" || !body.dealId.trim()) {
            return { error: "Не указана сделка" }
        }
        data.dealId = body.dealId
    }

    if (body.status !== undefined) {
        if (!SHIPMENT_STATUSES.includes(body.status)) {
            return { error: "Некорректный статус отгрузки" }
        }
        data.status = body.status
    }

    if (body.plannedDate !== undefined) {
        const { value, error } = parseDate(body.plannedDate, { label: "Плановая дата" })
        if (error) return { error }
        data.plannedDate = value
    }

    if (body.shippedAt !== undefined) {
        const { value, error } = parseDate(body.shippedAt, {
            label: "Фактическая дата отгрузки",
        })
        if (error) return { error }
        data.shippedAt = value
    }

    for (const field of [
        "deliveryAddress",
        "carrier",
        "trackingNumber",
        "docNumber",
        "note",
        "recipientName",
        "recipientPhone",
        "recipientEmail",
    ]) {
        if (body[field] !== undefined) {
            if (body[field] === null || body[field] === "") data[field] = null
            else if (typeof body[field] !== "string")
                return { error: `${field}: должно быть строкой` }
            else data[field] = body[field].trim() || null
        }
    }

    if (body.recipientContactId !== undefined) {
        if (body.recipientContactId === null || body.recipientContactId === "")
            data.recipientContactId = null
        else if (typeof body.recipientContactId !== "string")
            return { error: "recipientContactId должен быть строкой" }
        else data.recipientContactId = body.recipientContactId
    }

    return { data }
}

export function parseShipmentItemPayload(body, { partial = false } = {}) {
    if (!body || typeof body !== "object") return { error: "Некорректный запрос" }
    const data = {}

    if (!partial || body.dealItemId !== undefined) {
        if (typeof body.dealItemId !== "string" || !body.dealItemId.trim()) {
            return { error: "Не выбрана позиция сделки" }
        }
        data.dealItemId = body.dealItemId
    }

    if (!partial || body.quantity !== undefined) {
        const { value, error } = parseDecimal(body.quantity, {
            min: 0,
            label: "Количество",
        })
        if (error) return { error }
        if (value === null || Number(value) <= 0)
            return { error: "Количество должно быть больше нуля" }
        data.quantity = value
    }

    if (body.note !== undefined) {
        if (body.note === null || body.note === "") data.note = null
        else if (typeof body.note !== "string") return { error: "Комментарий должен быть строкой" }
        else data.note = body.note.trim() || null
    }

    return { data }
}

function toNum(v) {
    if (v === null || v === undefined) return 0
    const s = typeof v === "object" && v.toString ? v.toString() : String(v)
    const n = Number(s.replace(",", "."))
    return Number.isFinite(n) ? n : 0
}

/**
 * Считает прогресс отгрузки по сделке.
 * deal.items — DealItem[] (с поля quantity)
 * deal.shipments — Shipment[] с include items, статус SHIPPED считается отгруженным.
 * Возвращает {
 *   byItem: { [dealItemId]: { ordered, shipped, remaining } },
 *   totalOrdered, totalShipped, totalRemaining,
 *   percent (0..100, с учётом не-нулевого деления),
 *   isFullyShipped
 * }
 */
export function calculateDealShipmentProgress(deal) {
    const byItem = {}
    let totalOrdered = 0
    let totalShipped = 0

    for (const item of deal.items || []) {
        const ordered = toNum(item.quantity)
        byItem[item.id] = { ordered, shipped: 0, remaining: ordered }
        totalOrdered += ordered
    }

    for (const sh of deal.shipments || []) {
        if (sh.status !== "SHIPPED") continue
        for (const si of sh.items || []) {
            const qty = toNum(si.quantity)
            if (!byItem[si.dealItemId]) continue
            byItem[si.dealItemId].shipped += qty
            totalShipped += qty
        }
    }

    for (const id of Object.keys(byItem)) {
        const row = byItem[id]
        row.remaining = Math.max(0, row.ordered - row.shipped)
    }

    const totalRemaining = Math.max(0, totalOrdered - totalShipped)
    const percent =
        totalOrdered > 0 ? Math.min(100, Math.round((totalShipped / totalOrdered) * 100)) : 0
    const isFullyShipped = totalOrdered > 0 && totalRemaining === 0

    return { byItem, totalOrdered, totalShipped, totalRemaining, percent, isFullyShipped }
}

/**
 * Считает остаток к отгрузке по конкретной позиции сделки,
 * с возможностью исключить уже учтённые позиции конкретной отгрузки (нужно при PATCH).
 */
export function calculateDealItemRemaining(dealItem, shipments, { excludeShipmentId } = {}) {
    const ordered = toNum(dealItem.quantity)
    let shipped = 0
    for (const sh of shipments || []) {
        if (sh.status !== "SHIPPED" && sh.status !== "DRAFT") continue
        if (excludeShipmentId && sh.id === excludeShipmentId) continue
        for (const si of sh.items || []) {
            if (si.dealItemId === dealItem.id) shipped += toNum(si.quantity)
        }
    }
    return Math.max(0, ordered - shipped)
}

/**
 * Вес (кг) и объём (м³) одной отгрузки по её позициям.
 * Каждая ShipmentItem ссылается на dealItem.product, где хранятся
 * unitWeightKg / unitVolumeM3 — вес и объём единицы товара.
 * incomplete = true, если у какого-то товара вес/объём не заполнен
 * (такие позиции не учитываются в сумме).
 * @param {object} shipment — с include items.dealItem.product
 * @returns {{ weight: number, volume: number, incomplete: boolean }}
 */
export function calculateShipmentWeightVolume(shipment) {
    let weight = 0
    let volume = 0
    let incomplete = false
    for (const si of shipment?.items || []) {
        const qty = toNum(si.quantity)
        const product = si.dealItem?.product
        const uw = product?.unitWeightKg
        const uv = product?.unitVolumeM3
        if (uw === null || uw === undefined) incomplete = true
        else weight += qty * toNum(uw)
        if (uv === null || uv === undefined) incomplete = true
        else volume += qty * toNum(uv)
    }
    return { weight, volume, incomplete }
}

/**
 * Полный вес/объём заказа по позициям сделки.
 * Каждая позиция — { quantity, unitWeightKg, unitVolumeM3 }
 * (вес/объём единицы товара из карточки товара).
 */
export function calculateOrderWeightVolume(items) {
    let weight = 0
    let volume = 0
    let incomplete = false
    for (const it of items || []) {
        const qty = toNum(it.quantity)
        const uw = it.unitWeightKg
        const uv = it.unitVolumeM3
        if (uw === null || uw === undefined) incomplete = true
        else weight += qty * toNum(uw)
        if (uv === null || uv === undefined) incomplete = true
        else volume += qty * toNum(uv)
    }
    return { weight, volume, incomplete }
}

export function formatWeightKg(kg) {
    const n = toNum(kg)
    return `${(Math.round(n * 1000) / 1000).toString().replace(".", ",")} кг`
}

export function formatVolumeM3(m3) {
    const n = toNum(m3)
    return `${(Math.round(n * 10000) / 10000).toString().replace(".", ",")} м³`
}

export async function generateShipmentNumber(tx) {
    const last = await tx.shipment.findFirst({
        orderBy: { createdAt: "desc" },
        select: { number: true },
    })
    let seq = 1
    if (last?.number) {
        const m = last.number.match(/SH-(\d+)/)
        if (m) seq = parseInt(m[1], 10) + 1
    }
    return `SH-${String(seq).padStart(6, "0")}`
}

export function isShipmentOverdue(shipment) {
    if (!shipment) return false
    if (shipment.status !== "DRAFT") return false
    if (!shipment.plannedDate) return false
    const planned = new Date(shipment.plannedDate)
    if (Number.isNaN(planned.getTime())) return false
    return planned.getTime() < Date.now()
}
