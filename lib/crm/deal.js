export const DEAL_TRACKED_FIELDS = [
    "title",
    "status",
    "totalAmount",
    "discount",
    "note",
    "deliveryAddress",
    "counterpartyId",
    "payerId",
    "contactId",
    "managerId",
    "sourceProjectId",
    "lossReason",
    "lossComment",
    // Аукцион
    "isAuction",
    "purchaseNumber",
    "auctionUrl",
    "nmck",
    "bidsDeadlineAt",
    "auctionAt",
    "resultsAt",
    "participantsCount",
    "bidsCount",
    "winner",
    "auctionCustomerId",
    "auctionCustomerContactId",
]

export const DEAL_LOSS_REASONS = [
    "PRICE",
    "COMPETITOR",
    "TIMING",
    "NO_BUDGET",
    "NO_RESPONSE",
    "NO_NEED",
    "DATA_ERROR",
    "AUCTION_CANCELLED",
    "OTHER",
]

export const DEAL_LOSS_REASON_LABELS = {
    PRICE: "Не устроила цена",
    COMPETITOR: "Выбрали конкурента",
    TIMING: "Не устроили сроки поставки",
    NO_BUDGET: "Нет бюджета / закупка перенесена",
    NO_RESPONSE: "Клиент перестал отвечать",
    NO_NEED: "Потребность отпала",
    DATA_ERROR: "Ошибка заполнения",
    AUCTION_CANCELLED: "Аукцион отменён",
    OTHER: "Другое",
}

export const DEAL_ITEM_TRACKED_FIELDS = ["sku", "name", "quantity", "amount", "productId"]

export const DEAL_STATUSES = [
    "NEGOTIATION",
    "CONTRACT",
    "EXECUTION",
    "AWAITING",
    "CLOSED",
    "CANCELLED",
    "ARCHIVED",
]

// Колонки доски: ARCHIVED — свалка старых CANCELLED, на доске ей не место.
export const DEAL_KANBAN_STATUSES = DEAL_STATUSES.filter(s => s !== "ARCHIVED")

// Сколько карточек грузим в одну колонку канбана. Полное количество и сумма
// по колонке приходят отдельными числами — см. GET /api/crm/deals?view=kanban.
export const DEAL_KANBAN_PER_STATUS = 20

// Порядок внутри колонки. В рабочих статусах сверху свежие сделки, в
// завершённых — недавно закрытые: дата создания у них может быть давней, и
// сортировка по ней прятала бы под лимит как раз самое интересное.
export function dealKanbanOrderField(status) {
    return status === "CLOSED" || status === "CANCELLED" ? "updatedAt" : "createdAt"
}

export const DEAL_STATUS_LABELS = {
    NEGOTIATION: "Переговоры / КП",
    CONTRACT: "Договор / Счёт",
    EXECUTION: "Выполнение / Отгрузка",
    AWAITING: "Ожидание / Подтверждение",
    CLOSED: "Закрыто",
    CANCELLED: "Не реализована",
    ARCHIVED: "Архив",
}

// AWAITING — сбор закрывающих документов и ожидание оплаты; CLOSED — сделка
// полностью исполнена и контроля не требует. В архив исполненные сделки не
// уезжают: это история отгрузок и денег, она остаётся на виду.
export const DEAL_STATUS_HINTS = {
    AWAITING: "Акт + Оплата + Закрывающие документы",
    CLOSED: "Исполнена, контроль не требуется",
    CANCELLED: "Клиент отказался / срыв сделки",
}

export const DEAL_STATUS_COLORS = {
    NEGOTIATION: "bg-sky-50 text-sky-700",
    CONTRACT: "bg-violet-50 text-violet-700",
    EXECUTION: "bg-amber-50 text-amber-700",
    AWAITING: "bg-teal-50 text-teal-700",
    CLOSED: "bg-emerald-50 text-emerald-700",
    CANCELLED: "bg-red-50 text-red-700",
    ARCHIVED: "bg-neutral-100 text-neutral-500",
}

// Через сколько дней нереализованные сделки уезжают в архив.
// Меряется от updatedAt (последнего изменения).
export const DEAL_AUTO_ARCHIVE_DAYS = 45

// Ленивая архивация: переводит в ARCHIVED все CANCELLED, которые не менялись
// дольше порога. Вызывается из GET-запросов сделок — один UPDATE на запрос,
// дешево. Возвращает число обновлённых.
//
// CLOSED сюда не входит: исполненная сделка остаётся в своей колонке навсегда.
// Иначе запрет на её удаление (см. DEAL_DELETABLE_STATUSES) обходился бы
// ожиданием — через 45 дней сделка становилась архивной и удаляемой.
export async function autoArchiveStaleCancelledDeals(prisma) {
    const threshold = new Date(Date.now() - DEAL_AUTO_ARCHIVE_DAYS * 24 * 3600 * 1000)
    const res = await prisma.deal.updateMany({
        where: {
            status: "CANCELLED",
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

function parseIntField(value, { label }) {
    if (value === null || value === undefined || value === "") return { value: null }
    const num = Number(String(value).trim())
    if (!Number.isInteger(num) || num < 0) return { error: `${label}: введите целое число` }
    return { value: num }
}

// datetime-local шлём с клиента как ISO (UTC); new Date разбирает обратно.
function parseDateTime(value, { label }) {
    if (value === null || value === undefined || value === "") return { value: null }
    const d = new Date(value)
    if (Number.isNaN(d.getTime())) return { error: `${label}: некорректная дата` }
    return { value: d }
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

    // Плательщик — юрлицо, на которое оформляют документы. Пусто = плательщик
    // совпадает с клиентом.
    if (body.payerId !== undefined) {
        if (body.payerId === null || body.payerId === "") data.payerId = null
        else if (typeof body.payerId !== "string")
            return { error: "payerId должен быть строкой" }
        else data.payerId = body.payerId
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

    // --- Аукцион ---

    if (body.isAuction !== undefined) {
        data.isAuction = Boolean(body.isAuction)
    }

    for (const [field, label] of [
        ["purchaseNumber", "Номер закупки"],
        ["auctionUrl", "Ссылка на аукцион"],
        ["winner", "Победитель"],
    ]) {
        if (body[field] === undefined) continue
        if (body[field] === null || body[field] === "") data[field] = null
        else if (typeof body[field] !== "string") return { error: `${label}: должно быть строкой` }
        else data[field] = body[field].trim() || null
    }

    if (body.nmck !== undefined) {
        const { value, error } = parseDecimal(body.nmck, { min: 0, label: "НМЦК" })
        if (error) return { error }
        data.nmck = value ?? "0"
    }

    for (const [field, label] of [
        ["bidsDeadlineAt", "Окончание сбора заявок"],
        ["auctionAt", "Проведение аукциона"],
        ["resultsAt", "Подведение итогов"],
    ]) {
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

    if (body.auctionCustomerId !== undefined) {
        if (body.auctionCustomerId === null || body.auctionCustomerId === "")
            data.auctionCustomerId = null
        else if (typeof body.auctionCustomerId !== "string")
            return { error: "auctionCustomerId должен быть строкой" }
        else data.auctionCustomerId = body.auctionCustomerId
    }

    if (body.auctionCustomerContactId !== undefined) {
        if (body.auctionCustomerContactId === null || body.auctionCustomerContactId === "")
            data.auctionCustomerContactId = null
        else if (typeof body.auctionCustomerContactId !== "string")
            return { error: "auctionCustomerContactId должен быть строкой" }
        else data.auctionCustomerContactId = body.auctionCustomerContactId
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

// Название сделки из проекта не копируется в поле title, а собирается на лету:
// проект могут переименовать (в том числе автоматически, при смене сторон), и
// замороженная копия начала бы противоречить карточке проекта.
export function dealDisplayTitle(deal, counterpartyName) {
    if (deal?.title) return deal.title
    if (deal?.sourceProject?.internalName) {
        return `По проекту: ${deal.sourceProject.internalName}`
    }
    return dealOwnTitle(deal, counterpartyName)
}

// То же, но без подстановки проекта — для карточки сделки, где проект показан
// отдельной строкой-ссылкой и в заголовке только дублировался бы.
export function dealOwnTitle(deal, counterpartyName) {
    if (deal?.title) return deal.title
    return `Сделка с ${counterpartyName || "клиентом"}`
}

// Поиск по сделкам идёт в памяти: заголовок собирается на лету (dealDisplayTitle),
// а искать хочется и по клиенту, и по плательщику — одним SQL-условием не выразить.
// Нужны поля title, counterparty.name, payer.name/inn, sourceProject.internalName.
export function matchesDealSearch(deal, q) {
    const ql = (q || "").trim().toLowerCase()
    if (!ql) return true
    return [
        dealDisplayTitle(deal, deal.counterparty?.name),
        deal.counterparty?.name,
        deal.payer?.name,
        deal.payer?.inn,
    ].some(v => (v || "").toLowerCase().includes(ql))
}

// Сумма сделки за вычетом скидки (deal.discount — проценты, 0..100).
// Без скидки возвращает исходную сумму.
export function dealDiscountedTotal(deal) {
    const total = Number(deal?.totalAmount) || 0
    if (deal?.discount === null || deal?.discount === undefined) return total
    const pct = Number(deal.discount)
    if (!Number.isFinite(pct)) return total
    return total * (1 - Math.min(100, Math.max(0, pct)) / 100)
}
