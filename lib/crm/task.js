export const TASK_STATUSES = ["OPEN", "DONE", "FAILED"]

export const TASK_STATUS_LABELS = {
    OPEN: "Открыта",
    DONE: "Выполнена",
    FAILED: "Не выполнена",
}

export const TASK_STATUS_COLORS = {
    OPEN: "bg-blue-100 text-blue-800",
    DONE: "bg-green-100 text-green-800",
    FAILED: "bg-red-100 text-red-700",
}

export const TASK_RELATION_KINDS = ["deal", "project", "distributor", "endCustomer", "auction"]

export const TASK_RELATION_LABELS = {
    deal: "Сделка",
    project: "Проект",
    distributor: "Дистрибьютор",
    endCustomer: "Конечный потребитель",
    auction: "Аукцион",
}

export const TASK_TYPES = [
    {
        key: "CONTACT",
        label: "Связаться",
        icon: "FiPhone",
        bg: "bg-sky-100 text-sky-800",
        dot: "bg-sky-500",
        border: "border-sky-400",
    },
    {
        key: "MEETING",
        label: "Встреча",
        icon: "FiUsers",
        bg: "bg-violet-100 text-violet-800",
        dot: "bg-violet-500",
        border: "border-violet-400",
    },
    {
        key: "PAYMENT_CONTROL",
        label: "Контроль оплаты",
        icon: "FiDollarSign",
        bg: "bg-emerald-100 text-emerald-800",
        dot: "bg-emerald-500",
        border: "border-emerald-400",
    },
    {
        key: "IMPORTANT",
        label: "Важно",
        icon: "FiAlertCircle",
        bg: "bg-red-100 text-red-800",
        dot: "bg-red-500",
        border: "border-red-400",
    },
    {
        key: "WAITING_REPLY",
        label: "Ждём ответа",
        icon: "FiClock",
        bg: "bg-amber-100 text-amber-800",
        dot: "bg-amber-500",
        border: "border-amber-400",
    },
    {
        key: "ADD_INFO",
        label: "Внести инфу",
        icon: "FiEdit",
        bg: "bg-slate-100 text-slate-800",
        dot: "bg-slate-500",
        border: "border-slate-400",
    },
    {
        key: "AUCTION_TRACK",
        label: "Аукцион отслеж.",
        icon: "FiTrendingUp",
        bg: "bg-orange-100 text-orange-800",
        dot: "bg-orange-500",
        border: "border-orange-400",
    },
    {
        key: "NO_ANSWER",
        label: "Нет ответа",
        icon: "FiPhoneMissed",
        bg: "bg-rose-100 text-rose-800",
        dot: "bg-rose-500",
        border: "border-rose-400",
    },
    {
        key: "DEAL_STUCK",
        label: "Сделка зависла",
        icon: "FiPauseCircle",
        bg: "bg-yellow-100 text-yellow-800",
        dot: "bg-yellow-500",
        border: "border-yellow-400",
    },
    {
        key: "PROCESS",
        label: "Обработать",
        icon: "FiInbox",
        bg: "bg-cyan-100 text-cyan-800",
        dot: "bg-cyan-500",
        border: "border-cyan-400",
    },
    {
        key: "CLOSING_DOCS",
        label: "Закрывающие документы",
        icon: "FiFileText",
        bg: "bg-teal-100 text-teal-800",
        dot: "bg-teal-500",
        border: "border-teal-400",
    },
    {
        key: "REMIND_SELF",
        label: "Напомнить о себе",
        icon: "FiBell",
        bg: "bg-pink-100 text-pink-800",
        dot: "bg-pink-500",
        border: "border-pink-400",
    },
]

export const TASK_TYPE_KEYS = TASK_TYPES.map(t => t.key)

export const TASK_TYPE_MAP = Object.fromEntries(TASK_TYPES.map(t => [t.key, t]))

const DATE_TIME_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

function parseDateInput(value) {
    if (typeof value !== "string") return null
    if (DATE_TIME_RE.test(value)) {
        const d = new Date(value)
        return Number.isNaN(d.getTime()) ? null : d
    }
    if (DATE_RE.test(value)) {
        const d = new Date(`${value}T00:00:00.000Z`)
        return Number.isNaN(d.getTime()) ? null : d
    }
    return null
}

function startOfDayUTC(d) {
    return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 0, 0, 0, 0))
}

function endOfDayUTC(d) {
    return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 23, 59, 59, 999))
}

export function parseTaskPayload(body, { partial = false } = {}) {
    if (!body || typeof body !== "object") return { error: "Некорректный запрос" }
    const data = {}

    if (!partial || body.title !== undefined) {
        if (typeof body.title !== "string" || !body.title.trim()) {
            return { error: "Укажите заголовок" }
        }
        data.title = body.title.trim()
    }

    if (body.description !== undefined) {
        if (body.description === null || body.description === "") data.description = null
        else if (typeof body.description !== "string")
            return { error: "Описание должно быть строкой" }
        else data.description = body.description.trim() || null
    }

    if (!partial || body.type !== undefined) {
        if (!TASK_TYPE_KEYS.includes(body.type)) {
            return { error: "Некорректный тип задачи" }
        }
        data.type = body.type
    }

    if (!partial || body.assigneeId !== undefined) {
        if (typeof body.assigneeId !== "string" || !body.assigneeId.trim()) {
            return { error: "Выберите ответственного" }
        }
        data.assigneeId = body.assigneeId
    }

    if (body.allDay !== undefined) {
        data.allDay = !!body.allDay
    }

    const hasStart = body.startAt !== undefined
    const hasEnd = body.endAt !== undefined
    if (hasStart || hasEnd || !partial) {
        if (data.allDay === undefined) data.allDay = true
        const start = parseDateInput(body.startAt)
        const end = parseDateInput(body.endAt) ?? start
        if (!start) return { error: "Укажите дату начала" }
        if (!end) return { error: "Укажите дату окончания" }
        if (data.allDay) {
            data.startAt = startOfDayUTC(start)
            data.endAt = endOfDayUTC(end)
        } else {
            if (end < start) return { error: "Дата окончания раньше даты начала" }
            data.startAt = start
            data.endAt = end
        }
    }

    let relationKey = null
    for (const k of TASK_RELATION_KINDS) {
        const field = `${k}Id`
        if (body[field] === undefined) continue
        if (body[field] === null || body[field] === "") {
            data[field] = null
            continue
        }
        if (typeof body[field] !== "string") {
            return { error: `${TASK_RELATION_LABELS[k]} должен быть строкой` }
        }
        data[field] = body[field]
        if (relationKey) {
            return { error: "Задача может быть привязана только к одной сущности" }
        }
        relationKey = k
    }

    if (!partial && relationKey) {
        for (const k of TASK_RELATION_KINDS) {
            if (k !== relationKey && data[`${k}Id`] === undefined) data[`${k}Id`] = null
        }
    }

    return { data, relationKey }
}

export function parseCloseTaskPayload(body) {
    if (!body || typeof body !== "object") return { error: "Некорректный запрос" }
    if (!["DONE", "FAILED"].includes(body.status)) {
        return { error: "Укажите статус закрытия (DONE или FAILED)" }
    }
    const result = typeof body.result === "string" ? body.result.trim() : ""
    if (body.status === "FAILED" && !result) {
        return { error: "При закрытии «Не выполнена» комментарий обязателен" }
    }
    return { data: { status: body.status, result: result || null } }
}

export function canCloseTask(task, session) {
    if (!session?.user) return false
    if (session.user.role === "ADMIN") return true
    return task.assigneeId === session.user.id || task.createdById === session.user.id
}

export function allDayDateLabel(d) {
    return new Date(d).toLocaleDateString("ru-RU", { timeZone: "UTC" })
}

// Карточки, в чью историю изменений пишутся события задачи.
export function taskLogParents(task) {
    const out = []
    if (task.dealId) out.push({ parentEntityType: "Deal", parentEntityId: task.dealId })
    if (task.projectId)
        out.push({ parentEntityType: "Project", parentEntityId: task.projectId })
    if (task.distributorId)
        out.push({ parentEntityType: "Counterparty", parentEntityId: task.distributorId })
    if (task.endCustomerId)
        out.push({ parentEntityType: "Counterparty", parentEntityId: task.endCustomerId })
    if (task.auctionId)
        out.push({ parentEntityType: "Auction", parentEntityId: task.auctionId })
    return out
}
