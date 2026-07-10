export const AUCTION_STATUSES = ["IN_PROGRESS", "WON", "LOST", "CANCELLED"]

export const AUCTION_STATUS_LABELS = {
    IN_PROGRESS: "В работе",
    WON: "Выиграли",
    LOST: "Проиграли",
    CANCELLED: "Отменён",
}

export const AUCTION_STATUS_COLORS = {
    IN_PROGRESS: "bg-blue-50 text-blue-700",
    WON: "bg-emerald-50 text-emerald-700",
    LOST: "bg-red-50 text-red-700",
    CANCELLED: "bg-neutral-100 text-neutral-500",
}

export const AUCTION_TRACKED_FIELDS = [
    "purchaseNumber",
    "auctionUrl",
    "status",
    "nmck",
    "bidsDeadlineAt",
    "auctionAt",
    "resultsAt",
    "participantsCount",
    "bidsCount",
    "winner",
    "lossComment",
    "supplierContactId",
    "managerId",
]

export const AUCTION_ITEM_TRACKED_FIELDS = ["sku", "name", "quantity", "amount", "productId"]

function parseDecimal(value, { min = 0, label }) {
    if (value === null || value === undefined || value === "") return { value: null }
    const str = String(value).replace(",", ".").trim()
    if (!/^-?\d+(\.\d+)?$/.test(str)) return { error: `${label}: введите число` }
    const num = Number(str)
    if (!Number.isFinite(num)) return { error: `${label}: некорректное число` }
    if (num < min) return { error: `${label}: значение не может быть меньше ${min}` }
    return { value: str }
}

function parseIntField(value, { label }) {
    if (value === null || value === undefined || value === "") return { value: null }
    const num = Number(String(value).trim())
    if (!Number.isInteger(num) || num < 0) return { error: `${label}: введите целое число` }
    return { value: num }
}

// datetime-local присылает "ГГГГ-ММ-ДДTчч:мм" в местном времени браузера —
// new Date() интерпретирует его в TZ сервера, поэтому клиент шлёт ISO (UTC).
function parseDateTime(value, { label }) {
    if (value === null || value === undefined || value === "") return { value: null }
    const d = new Date(value)
    if (Number.isNaN(d.getTime())) return { error: `${label}: некорректная дата` }
    return { value: d }
}

const STRING_FIELDS = [
    ["purchaseNumber", "Номер закупки"],
    ["auctionUrl", "Ссылка на аукцион"],
    ["winner", "Победитель"],
    ["lossComment", "Причина проигрыша"],
]

const DATE_FIELDS = [
    ["bidsDeadlineAt", "Окончание сбора заявок"],
    ["auctionAt", "Проведение аукциона"],
    ["resultsAt", "Подведение итогов"],
]

export function parseAuctionPayload(body, { partial = false } = {}) {
    if (!body || typeof body !== "object") return { error: "Некорректный запрос" }

    const data = {}

    for (const [field, label] of STRING_FIELDS) {
        if (body[field] === undefined) continue
        if (body[field] === null || body[field] === "") data[field] = null
        else if (typeof body[field] !== "string")
            return { error: `${label}: должно быть строкой` }
        else data[field] = body[field].trim()
    }

    if (!partial || body.projectId !== undefined) {
        if (typeof body.projectId !== "string" || !body.projectId.trim()) {
            return { error: "Аукцион должен быть привязан к проекту" }
        }
        data.projectId = body.projectId
    }

    for (const key of ["customerId", "supplierId", "managerId"]) {
        if (!partial || body[key] !== undefined) {
            if (typeof body[key] !== "string" || !body[key].trim()) {
                const labels = {
                    customerId: "Выберите заказчика",
                    supplierId: "Выберите поставщика",
                    managerId: "Выберите ответственного менеджера",
                }
                return { error: labels[key] }
            }
            data[key] = body[key]
        }
    }

    if (body.supplierContactId !== undefined) {
        data.supplierContactId = body.supplierContactId || null
    }

    if (body.status !== undefined) {
        if (!AUCTION_STATUSES.includes(body.status)) {
            return { error: "Некорректный статус" }
        }
        data.status = body.status
    }

    if (body.nmck !== undefined) {
        const { value, error } = parseDecimal(body.nmck, { min: 0, label: "НМЦК" })
        if (error) return { error }
        data.nmck = value ?? "0"
    }

    for (const [field, label] of DATE_FIELDS) {
        if (body[field] === undefined) continue
        const { value, error } = parseDateTime(body[field], { label })
        if (error) return { error }
        data[field] = value
    }

    for (const [field, label] of [
        ["participantsCount", "Количество участников"],
        ["bidsCount", "Количество заявок"],
    ]) {
        if (body[field] === undefined) continue
        const { value, error } = parseIntField(body[field], { label })
        if (error) return { error }
        data[field] = value
    }

    if (body.protocolAttachmentId !== undefined) {
        data.protocolAttachmentId = body.protocolAttachmentId || null
    }

    return { data }
}

export function parseAuctionItemPayload(body, { partial = false } = {}) {
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

export function auctionDisplayTitle(a) {
    if (a?.purchaseNumber) return `Закупка № ${a.purchaseNumber}`
    return "Аукцион"
}
