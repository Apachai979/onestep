export const DEAL_STATUSES = [
    "NEW",
    "IN_PROGRESS",
    "NEGOTIATION",
    "AWAITING_PAYMENT",
    "WON",
    "LOST",
]

export const DEAL_STATUS_LABELS = {
    NEW: "Новая",
    IN_PROGRESS: "В работе",
    NEGOTIATION: "Согласование",
    AWAITING_PAYMENT: "Ожидает оплаты",
    WON: "Выиграна",
    LOST: "Проиграна",
}

export const DEAL_STATUS_COLORS = {
    NEW: "bg-gray-100 text-gray-800",
    IN_PROGRESS: "bg-blue-100 text-blue-800",
    NEGOTIATION: "bg-amber-100 text-amber-800",
    AWAITING_PAYMENT: "bg-violet-100 text-violet-800",
    WON: "bg-green-100 text-green-800",
    LOST: "bg-red-100 text-red-700",
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

export function parseDealPayload(body, { partial = false } = {}) {
    if (!body || typeof body !== "object") return { error: "Некорректный запрос" }
    const data = {}

    if (body.title !== undefined) {
        if (body.title === null || body.title === "") data.title = null
        else if (typeof body.title !== "string") return { error: "Название должно быть строкой" }
        else data.title = body.title.trim() || null
    }

    if (!partial || body.counterpartyId !== undefined) {
        if (typeof body.counterpartyId !== "string" || !body.counterpartyId.trim()) {
            return { error: "Выберите клиента" }
        }
        data.counterpartyId = body.counterpartyId
    }

    if (body.contactId !== undefined) {
        if (body.contactId === null || body.contactId === "") data.contactId = null
        else if (typeof body.contactId !== "string")
            return { error: "contactId должен быть строкой" }
        else data.contactId = body.contactId
    }

    if (!partial || body.managerId !== undefined) {
        if (typeof body.managerId !== "string" || !body.managerId.trim()) {
            return { error: "Выберите ответственного менеджера" }
        }
        data.managerId = body.managerId
    }

    if (body.status !== undefined) {
        if (!DEAL_STATUSES.includes(body.status)) {
            return { error: "Некорректный статус" }
        }
        data.status = body.status
    }

    if (body.totalAmount !== undefined) {
        const { value, error } = parseDecimal(body.totalAmount, {
            min: 0,
            label: "Сумма сделки",
        })
        if (error) return { error }
        data.totalAmount = value ?? "0"
    }

    if (body.note !== undefined) {
        if (body.note === null || body.note === "") data.note = null
        else if (typeof body.note !== "string") return { error: "Примечание должно быть строкой" }
        else data.note = body.note.trim() || null
    }

    return { data }
}

export function parseDealItemPayload(body, { partial = false } = {}) {
    if (!body || typeof body !== "object") return { error: "Некорректный запрос" }
    const data = {}

    if (!partial || body.name !== undefined) {
        if (typeof body.name !== "string" || !body.name.trim()) {
            return { error: "Укажите наименование позиции" }
        }
        data.name = body.name.trim()
    }

    if (body.sku !== undefined) {
        if (body.sku === null || body.sku === "") data.sku = null
        else if (typeof body.sku !== "string") return { error: "Артикул должен быть строкой" }
        else data.sku = body.sku.trim()
    }

    if (body.productId !== undefined) {
        if (body.productId === null || body.productId === "") data.productId = null
        else if (typeof body.productId !== "string")
            return { error: "productId должен быть строкой" }
        else data.productId = body.productId
    }

    if (body.quantity !== undefined) {
        const { value, error } = parseDecimal(body.quantity, { min: 0, label: "Количество" })
        if (error) return { error }
        data.quantity = value ?? "0"
    }

    if (body.amount !== undefined) {
        const { value, error } = parseDecimal(body.amount, { min: 0, label: "Сумма" })
        if (error) return { error }
        data.amount = value ?? "0"
    }

    return { data }
}

export function dealDisplayTitle(deal, counterpartyName) {
    if (deal?.title) return deal.title
    return `Сделка с ${counterpartyName || "клиентом"}`
}
