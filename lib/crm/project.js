export const PROJECT_TRACKED_FIELDS = [
    "internalName",
    "status",
    "duplicateComment",
    "distributorId",
    "endCustomerId",
    "managerId",
]

export const PROJECT_LOSS_REASONS = [
    "PRICE",
    "COMPETITOR",
    "REJECTED",
    "NO_PARTICIPATION",
    "OTHER",
]

export const PROJECT_LOSS_REASON_LABELS = {
    PRICE: "Проиграли по цене",
    COMPETITOR: "Победил сильный конкурент",
    REJECTED: "Заявку отклонили",
    NO_PARTICIPATION: "Не участвовали / не успели",
    OTHER: "Другое",
}

export const PROJECT_ITEM_TRACKED_FIELDS = [
    "sku",
    "name",
    "quantity",
    "amount",
    "productId",
]

// Действующие статусы. В LABELS/COLORS остаются и устаревшие ключи
// (WON/LOST/CANCELLED) — для чтения старых записей истории изменений.
export const PROJECT_STATUSES = ["DRAFT", "APPROBATION", "IN_PROGRESS", "NO_NEED"]

export const PROJECT_STATUS_LABELS = {
    DRAFT: "Черновик",
    APPROBATION: "Апробация",
    IN_PROGRESS: "В работе",
    NO_NEED: "Проработано, нет потребности",
    WON: "Выиграли",
    LOST: "Проиграли",
    CANCELLED: "Отменён",
}

export const PROJECT_STATUS_COLORS = {
    DRAFT: "bg-gray-100 text-gray-600",
    APPROBATION: "bg-violet-100 text-violet-800",
    IN_PROGRESS: "bg-blue-100 text-blue-800",
    WON: "bg-green-100 text-green-800",
    LOST: "bg-red-100 text-red-700",
    NO_NEED: "bg-amber-100 text-amber-800",
    CANCELLED: "bg-gray-200 text-gray-700",
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

function parseDecimal(value, { min = 0, label }) {
    if (value === null || value === undefined || value === "") return { value: null }
    const str = String(value).replace(",", ".").trim()
    if (!/^-?\d+(\.\d+)?$/.test(str)) return { error: `${label}: введите число` }
    const num = Number(str)
    if (!Number.isFinite(num)) return { error: `${label}: некорректное число` }
    if (num < min) return { error: `${label}: значение не может быть меньше ${min}` }
    return { value: str }
}

export function buildInternalName(distributorName, endCustomerName) {
    return `${distributorName || "—"} – ${endCustomerName || "—"}`
}

export function parseProjectPayload(body, { partial = false } = {}) {
    if (!body || typeof body !== "object") return { error: "Некорректный запрос" }

    const data = {}

    // Поле аукциона больше не используется в UI, но принимаем для
    // совместимости (старые данные, внешние вызовы).
    if (body.externalAuctionId !== undefined) {
        if (body.externalAuctionId === null || body.externalAuctionId === "") {
            data.externalAuctionId = null
        } else if (typeof body.externalAuctionId !== "string") {
            return { error: "Идентификатор аукциона должен быть строкой" }
        } else {
            data.externalAuctionId = body.externalAuctionId.trim()
        }
    }

    if (!partial || body.distributorId !== undefined) {
        if (typeof body.distributorId !== "string" || !body.distributorId.trim()) {
            return { error: "Выберите дистрибьютора" }
        }
        data.distributorId = body.distributorId
    }

    if (!partial || body.endCustomerId !== undefined) {
        if (typeof body.endCustomerId !== "string" || !body.endCustomerId.trim()) {
            return { error: "Выберите конечного потребителя" }
        }
        data.endCustomerId = body.endCustomerId
    }

    if (!partial || body.managerId !== undefined) {
        if (typeof body.managerId !== "string" || !body.managerId.trim()) {
            return { error: "Выберите ответственного менеджера" }
        }
        data.managerId = body.managerId
    }

    if (body.internalName !== undefined) {
        if (body.internalName === null || body.internalName === "") {
            data.internalName = null
        } else if (typeof body.internalName !== "string") {
            return { error: "Внутреннее название должно быть строкой" }
        } else {
            data.internalName = body.internalName.trim()
        }
    }

    if (body.status !== undefined) {
        if (!PROJECT_STATUSES.includes(body.status)) {
            return { error: "Некорректный статус" }
        }
        data.status = body.status
    }

    if (body.totalAmount !== undefined) {
        const { value, error } = parseDecimal(body.totalAmount, {
            min: 0,
            label: "Сумма проекта",
        })
        if (error) return { error }
        data.totalAmount = value ?? "0"
    }

    if (body.auctionDate !== undefined) {
        if (body.auctionDate === null || body.auctionDate === "") {
            data.auctionDate = null
        } else if (typeof body.auctionDate !== "string" || !DATE_RE.test(body.auctionDate)) {
            return { error: "Дата аукциона должна быть в формате ГГГГ-ММ-ДД" }
        } else {
            const d = new Date(`${body.auctionDate}T00:00:00.000Z`)
            if (Number.isNaN(d.getTime())) return { error: "Некорректная дата аукциона" }
            data.auctionDate = d
        }
    }

    if (body.duplicateComment !== undefined) {
        if (body.duplicateComment === null || body.duplicateComment === "") {
            data.duplicateComment = null
        } else if (typeof body.duplicateComment !== "string") {
            return { error: "Комментарий должен быть строкой" }
        } else {
            data.duplicateComment = body.duplicateComment.trim()
        }
    }

    if (body.contactIds !== undefined) {
        if (!Array.isArray(body.contactIds)) {
            return { error: "contactIds должен быть массивом" }
        }
        if (body.contactIds.some(x => typeof x !== "string")) {
            return { error: "contactIds должен содержать строки" }
        }
        data.contactIds = Array.from(new Set(body.contactIds))
    }

    return { data }
}

export function looksLikeUrl(s) {
    return typeof s === "string" && /^https?:\/\/\S+$/i.test(s.trim())
}

export function parseProjectItemPayload(body, { partial = false } = {}) {
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
