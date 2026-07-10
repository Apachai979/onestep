export const DEAL_TRACKED_FIELDS = [
    "title",
    "status",
    "totalAmount",
    "discount",
    "note",
    "deliveryAddress",
    "counterpartyId",
    "contactId",
    "managerId",
    "sourceProjectId",
    "sourceAuctionId",
    "lossReason",
    "lossComment",
]

export const DEAL_LOSS_REASONS = [
    "PRICE",
    "COMPETITOR",
    "TIMING",
    "NO_BUDGET",
    "NO_RESPONSE",
    "NO_NEED",
    "OTHER",
]

export const DEAL_LOSS_REASON_LABELS = {
    PRICE: "Не устроила цена",
    COMPETITOR: "Выбрали конкурента",
    TIMING: "Не устроили сроки поставки",
    NO_BUDGET: "Нет бюджета / закупка перенесена",
    NO_RESPONSE: "Клиент перестал отвечать",
    NO_NEED: "Потребность отпала",
    OTHER: "Другое",
}

export const DEAL_ITEM_TRACKED_FIELDS = ["sku", "name", "quantity", "amount", "productId"]

export const DEAL_STATUSES = [
    "NEGOTIATION",
    "CONTRACT",
    "EXECUTION",
    "CLOSED",
    "CANCELLED",
    "ARCHIVED",
]

export const DEAL_STATUS_LABELS = {
    NEGOTIATION: "Переговоры / КП",
    CONTRACT: "Договор / Счёт",
    EXECUTION: "Выполнение / Отгрузка",
    CLOSED: "Закрыто",
    CANCELLED: "Не реализована",
    ARCHIVED: "Архив",
}

export const DEAL_STATUS_HINTS = {
    CLOSED: "Акт + Оплата + Закрывающие документы",
    CANCELLED: "Клиент отказался / срыв сделки",
}

export const DEAL_STATUS_COLORS = {
    NEGOTIATION: "bg-sky-50 text-sky-700",
    CONTRACT: "bg-violet-50 text-violet-700",
    EXECUTION: "bg-amber-50 text-amber-700",
    CLOSED: "bg-emerald-50 text-emerald-700",
    CANCELLED: "bg-red-50 text-red-700",
    ARCHIVED: "bg-neutral-100 text-neutral-500",
}

// Через сколько дней сделки в терминальных статусах уезжают в архив.
// Меряется от updatedAt (последнего изменения).
export const DEAL_AUTO_ARCHIVE_DAYS = 45

// Ленивая архивация: переводит все CLOSED/CANCELLED, которые не менялись
// дольше порога, в ARCHIVED. Вызывается из GET-запросов сделок — один
// UPDATE на запрос, дешево. Возвращает число обновлённых.
export async function autoArchiveStaleFinalDeals(prisma) {
    const threshold = new Date(Date.now() - DEAL_AUTO_ARCHIVE_DAYS * 24 * 3600 * 1000)
    const res = await prisma.deal.updateMany({
        where: {
            status: { in: ["CLOSED", "CANCELLED"] },
            updatedAt: { lt: threshold },
        },
        data: { status: "ARCHIVED" },
    })
    return res.count
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

    if (body.discount !== undefined) {
        if (body.discount === null || body.discount === "") {
            data.discount = null
        } else {
            const { value, error } = parseDecimal(body.discount, {
                min: 0,
                label: "Скидка",
            })
            if (error) return { error }
            const n = Number(value)
            if (n > 100) return { error: "Скидка не может быть больше 100%" }
            data.discount = value
        }
    }

    if (body.note !== undefined) {
        if (body.note === null || body.note === "") data.note = null
        else if (typeof body.note !== "string") return { error: "Примечание должно быть строкой" }
        else data.note = body.note.trim() || null
    }

    if (body.deliveryAddress !== undefined) {
        if (body.deliveryAddress === null || body.deliveryAddress === "")
            data.deliveryAddress = null
        else if (typeof body.deliveryAddress !== "string")
            return { error: "Адрес доставки должен быть строкой" }
        else data.deliveryAddress = body.deliveryAddress.trim() || null
    }

    if (body.sourceProjectId !== undefined) {
        if (body.sourceProjectId === null || body.sourceProjectId === "")
            data.sourceProjectId = null
        else if (typeof body.sourceProjectId !== "string")
            return { error: "sourceProjectId должен быть строкой" }
        else data.sourceProjectId = body.sourceProjectId
    }

    if (body.sourceAuctionId !== undefined) {
        if (body.sourceAuctionId === null || body.sourceAuctionId === "")
            data.sourceAuctionId = null
        else if (typeof body.sourceAuctionId !== "string")
            return { error: "sourceAuctionId должен быть строкой" }
        else data.sourceAuctionId = body.sourceAuctionId
    }

    if (body.lossReason !== undefined) {
        if (body.lossReason === null || body.lossReason === "") data.lossReason = null
        else if (!DEAL_LOSS_REASONS.includes(body.lossReason))
            return { error: "Некорректная причина проигрыша" }
        else data.lossReason = body.lossReason
    }

    if (body.lossComment !== undefined) {
        if (body.lossComment === null || body.lossComment === "") data.lossComment = null
        else if (typeof body.lossComment !== "string")
            return { error: "Комментарий должен быть строкой" }
        else data.lossComment = body.lossComment.trim().slice(0, 1000) || null
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
        if (value !== null && !Number.isInteger(Number(value))) {
            return { error: "Количество: введите целое число" }
        }
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
