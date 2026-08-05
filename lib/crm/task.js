import {
    addDaysYmd,
    crmDayEnd,
    crmDayStart,
    crmHm,
    crmParseDateTime,
    crmToday,
    crmYmd,
    daysBetweenYmd,
    formatCrmDate,
    formatCrmDateTime,
    formatCrmTime,
    isYmd,
} from "./datetime"

export const TASK_STATUSES = ["OPEN", "DONE", "FAILED"]

export const TASK_STATUS_LABELS = {
    OPEN: "Открыта",
    DONE: "Выполнена",
    FAILED: "Не выполнена",
}

export const TASK_STATUS_COLORS = {
    OPEN: "bg-blue-50 text-blue-700",
    DONE: "bg-emerald-50 text-emerald-700",
    FAILED: "bg-red-50 text-red-700",
}

export const TASK_RELATION_KINDS = ["deal", "project", "distributor", "endCustomer"]

export const TASK_RELATION_LABELS = {
    deal: "Сделка",
    project: "Проект",
    distributor: "Дистрибьютор",
    endCustomer: "Конечный потребитель",
}

export const TASK_TYPES = [
    {
        key: "CONTACT",
        label: "Связаться",
        icon: "FiPhone",
        bg: "bg-sky-50 text-sky-700",
        dot: "bg-sky-500",
        border: "border-sky-400",
    },
    {
        key: "MEETING",
        label: "Встреча",
        icon: "FiUsers",
        bg: "bg-violet-50 text-violet-700",
        dot: "bg-violet-500",
        border: "border-violet-400",
    },
    {
        key: "PAYMENT_CONTROL",
        label: "Контроль оплаты",
        icon: "FiDollarSign",
        bg: "bg-emerald-50 text-emerald-700",
        dot: "bg-emerald-500",
        border: "border-emerald-400",
    },
    {
        key: "IMPORTANT",
        label: "Важно",
        icon: "FiAlertCircle",
        bg: "bg-red-50 text-red-700",
        dot: "bg-red-500",
        border: "border-red-400",
    },
    {
        key: "WAITING_REPLY",
        label: "Ждём ответа",
        icon: "FiClock",
        bg: "bg-amber-50 text-amber-700",
        dot: "bg-amber-500",
        border: "border-amber-400",
    },
    {
        key: "ADD_INFO",
        label: "Внести инфу",
        icon: "FiEdit",
        bg: "bg-slate-50 text-slate-700",
        dot: "bg-slate-500",
        border: "border-slate-400",
    },
    {
        key: "AUCTION_TRACK",
        label: "Аукцион отслеж.",
        icon: "FiTrendingUp",
        bg: "bg-orange-50 text-orange-700",
        dot: "bg-orange-500",
        border: "border-orange-400",
    },
    {
        key: "NO_ANSWER",
        label: "Нет ответа",
        icon: "FiPhoneMissed",
        bg: "bg-rose-50 text-rose-700",
        dot: "bg-rose-500",
        border: "border-rose-400",
    },
    {
        key: "DEAL_STUCK",
        label: "Сделка зависла",
        icon: "FiPauseCircle",
        bg: "bg-yellow-50 text-yellow-700",
        dot: "bg-yellow-500",
        border: "border-yellow-400",
    },
    {
        key: "PROCESS",
        label: "Обработать",
        icon: "FiInbox",
        bg: "bg-cyan-50 text-cyan-700",
        dot: "bg-cyan-500",
        border: "border-cyan-400",
    },
    {
        key: "CLOSING_DOCS",
        label: "Закрывающие документы",
        icon: "FiFileText",
        bg: "bg-teal-50 text-teal-700",
        dot: "bg-teal-500",
        border: "border-teal-400",
    },
    {
        key: "REMIND_SELF",
        label: "Напомнить о себе",
        icon: "FiBell",
        bg: "bg-pink-50 text-pink-700",
        dot: "bg-pink-500",
        border: "border-pink-400",
    },
]

export const TASK_TYPE_KEYS = TASK_TYPES.map(t => t.key)

export const TASK_TYPE_MAP = Object.fromEntries(TASK_TYPES.map(t => [t.key, t]))

// Дата срока из того, что прислал клиент: "2026-07-29" или "2026-07-29T09:30".
function inputYmd(value) {
    if (isYmd(value)) return value
    if (typeof value === "string" && value.length >= 10) {
        const parsed = crmParseDateTime(value)
        if (parsed) return crmYmd(parsed)
    }
    return null
}

// Значение уже сохранённой задачи в том виде, в каком его присылает форма —
// нужно, чтобы при частичном обновлении достроить недостающую половину срока.
function scheduleInput(value, allDay) {
    return allDay ? crmYmd(value) : `${crmYmd(value)}T${crmHm(value)}`
}

/**
 * Срок задачи. Задача «на весь день» занимает московские сутки целиком,
 * задача со временем — реальный интервал; в базу в обоих случаях идут
 * настоящие моменты.
 *
 * `current` — текущая задача при частичном обновлении: без неё PATCH с одним
 * только `endAt` не знал бы ни даты начала, ни режима `allDay`.
 */
function parseSchedule(body, current) {
    const allDay =
        body.allDay !== undefined ? !!body.allDay : current ? !!current.allDay : true

    const rawStart =
        body.startAt !== undefined
            ? body.startAt
            : current
              ? scheduleInput(current.startAt, allDay)
              : undefined
    const rawEnd =
        body.endAt !== undefined
            ? body.endAt
            : current
              ? scheduleInput(current.endAt, allDay)
              : undefined

    if (allDay) {
        const startYmd = inputYmd(rawStart)
        const endYmd = inputYmd(rawEnd) ?? startYmd
        if (!startYmd) return { error: "Укажите дату начала" }
        if (!endYmd) return { error: "Укажите дату окончания" }
        if (endYmd < startYmd) return { error: "Дата окончания раньше даты начала" }
        return {
            data: {
                allDay: true,
                startAt: crmDayStart(startYmd),
                endAt: crmDayEnd(endYmd),
            },
        }
    }

    // Голая дата в режиме со временем — это целые сутки: так переключение
    // «весь день → время» не теряет уже выбранный день.
    const start = crmParseDateTime(rawStart) ?? (isYmd(rawStart) ? crmDayStart(rawStart) : null)
    const end =
        crmParseDateTime(rawEnd) ?? (isYmd(rawEnd) ? crmDayEnd(rawEnd) : null) ?? start
    if (!start) return { error: "Укажите дату начала" }
    if (!end) return { error: "Укажите дату окончания" }
    if (end.getTime() < start.getTime()) {
        return { error: "Дата окончания раньше даты начала" }
    }
    return { data: { allDay: false, startAt: start, endAt: end } }
}

export function parseTaskPayload(body, { partial = false, current = null } = {}) {
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

    const touchesSchedule =
        body.startAt !== undefined || body.endAt !== undefined || body.allDay !== undefined
    if (!partial || touchesSchedule) {
        const schedule = parseSchedule(body, partial ? current : null)
        if (schedule.error) return { error: schedule.error }
        Object.assign(data, schedule.data)
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

/**
 * Правка комментария у уже закрытой задачи. Менеджер часто вспоминает деталь
 * после закрытия, а «вернуть в работу» стирает результат — поэтому комментарий
 * остаётся редактируемым, но больше у закрытой задачи менять нечего.
 */
export function parseTaskResultPayload(body, task) {
    if (!body || typeof body !== "object") return { error: "Некорректный запрос" }
    if (Object.keys(body).some(k => k !== "result")) {
        return { error: "У закрытой задачи можно изменить только комментарий" }
    }
    const result = typeof body.result === "string" ? body.result.trim() : ""
    if (task.status === "FAILED" && !result) {
        return { error: "У невыполненной задачи комментарий обязателен" }
    }
    return { data: { result: result || null } }
}

/** Менять и закрывать задачу может её ответственный, автор или админ. */
export function canManageTask(task, session) {
    if (!session?.user) return false
    if (session.user.role === "ADMIN") return true
    return task.assigneeId === session.user.id || task.createdById === session.user.id
}

// --- Срок задачи -------------------------------------------------------
// Единственный источник правды о том, что такое «срок», «сегодня» и
// «просрочено». Раньше это считалось в четырёх местах по-разному — часть в
// UTC, часть в зоне браузера, часть в зоне сервера.

/** Календарная дата (МСК), к которой задача должна быть сделана. */
export function taskDueYmd(task) {
    return crmYmd(task.endAt)
}

export function taskStartYmd(task) {
    return crmYmd(task.startAt)
}

export function isTaskOverdue(task, now = new Date()) {
    if (task.status !== "OPEN") return false
    return new Date(task.endAt).getTime() < now.getTime()
}

/** Задача в работе сегодня: её интервал пересекает текущие московские сутки. */
export function isTaskToday(task, today = crmToday()) {
    return taskStartYmd(task) <= today && taskDueYmd(task) >= today
}

/** "overdue" | "today" | "soon" (≤3 дней) | "later" | "closed" */
export function taskDueState(task, now = new Date()) {
    if (task.status !== "OPEN") return "closed"
    if (isTaskOverdue(task, now)) return "overdue"
    const diff = daysBetweenYmd(crmYmd(now), taskDueYmd(task))
    if (diff === 0) return "today"
    if (diff !== null && diff <= 3) return "soon"
    return "later"
}

export const TASK_DUE_COLORS = {
    overdue: "text-red-600",
    today: "text-amber-600",
    soon: "text-neutral-700",
    later: "text-neutral-700",
    closed: "text-neutral-400",
}

/** Срок задачи одной строкой. */
export function taskRangeLabel(task) {
    const startDay = taskStartYmd(task)
    const endDay = taskDueYmd(task)
    if (task.allDay) {
        const s = formatCrmDate(task.startAt)
        return startDay === endDay ? s : `${s} — ${formatCrmDate(task.endAt)}`
    }
    const s = formatCrmDateTime(task.startAt)
    return startDay === endDay
        ? `${s} — ${formatCrmTime(task.endAt)}`
        : `${s} — ${formatCrmDateTime(task.endAt)}`
}

function pluralDays(n) {
    const abs = Math.abs(n)
    const tail = abs % 100
    const last = tail % 10
    if (tail > 10 && tail < 20) return "дней"
    if (last === 1) return "день"
    if (last > 1 && last < 5) return "дня"
    return "дней"
}

/** Короткая подпись к сроку: «сегодня», «завтра», «просрочена на 2 дня». */
export function taskDueRelativeLabel(task, now = new Date()) {
    if (task.status !== "OPEN") return ""
    const diff = daysBetweenYmd(crmYmd(now), taskDueYmd(task))
    if (diff === null) return ""
    if (diff < 0) return `просрочена на ${-diff} ${pluralDays(diff)}`
    if (diff === 0) return isTaskOverdue(task, now) ? "срок прошёл" : "сегодня"
    if (diff === 1) return "завтра"
    return `через ${diff} ${pluralDays(diff)}`
}

// --- Колонки канбана ----------------------------------------------------
// Статусов всего три, и два из них — это закрытие, поэтому канбан по статусам
// ничего не показывал. Колонки собираются по сроку, и живут в них только
// открытые задачи: закрытые смотрят в списке с фильтром по статусу.

export const TASK_BUCKETS = ["overdue", "today", "tomorrow", "later"]

export const TASK_BUCKET_LABELS = {
    overdue: "Просроченные",
    today: "На сегодня",
    tomorrow: "На завтра",
    later: "На будущее",
}

// Сколько карточек показываем в колонке сразу; остальные — по кнопке.
// В отличие от сделок и проектов, здесь режется только отрисовка: колонка —
// это не статус в базе, а срок, посчитанный от московского «сегодня», поэтому
// разложить задачи по колонкам может только клиент. Грузятся при этом лишь
// открытые задачи, так что объём выборки ограничен сам по себе.
export const TASK_KANBAN_PER_BUCKET = 20

/**
 * Колонка канбана: строго по календарному дню срока (МСК). Сегодняшняя задача
 * с истёкшим временем остаётся в «На сегодня» — её выделяет цвет срока
 * (`taskDueState`), а не переезд в «Просроченные».
 */
export function taskBucket(task, today = crmToday()) {
    if (task.status !== "OPEN") return null
    const due = taskDueYmd(task)
    if (!due) return "later"
    if (due < today) return "overdue"
    if (due === today) return "today"
    if (due === addDaysYmd(today, 1)) return "tomorrow"
    return "later"
}

/** Дата, на которую переносит бросок в колонку; null — колонка без своей даты. */
export function taskBucketTargetYmd(bucket, today = crmToday()) {
    if (bucket === "today") return today
    if (bucket === "tomorrow") return addDaysYmd(today, 1)
    return null
}

/** Первый день, попадающий в «На будущее» — минимум для выбора даты. */
export function taskLaterMinYmd(today = crmToday()) {
    return addDaysYmd(today, 2)
}

/**
 * Новый срок задачи для PATCH: задача целиком сдвигается так, чтобы её
 * последний день пришёлся на `targetYmd` — длительность и время сохраняются.
 * Возвращает значения в том виде, в каком их шлёт форма (МСК).
 */
export function taskRescheduleInput(task, targetYmd) {
    const shift = daysBetweenYmd(taskDueYmd(task), targetYmd)
    if (shift === null || shift === 0) return null
    const startYmd = addDaysYmd(taskStartYmd(task), shift)
    if (!startYmd) return null
    if (task.allDay) return { allDay: true, startAt: startYmd, endAt: targetYmd }
    return {
        allDay: false,
        startAt: `${startYmd}T${crmHm(task.startAt)}`,
        endAt: `${targetYmd}T${crmHm(task.endAt)}`,
    }
}

/** Быстрые варианты срока в форме. */
export const TASK_DUE_PRESETS = [
    { label: "Сегодня", days: 0 },
    { label: "Завтра", days: 1 },
    { label: "+3 дня", days: 3 },
    { label: "Неделя", days: 7 },
]

export function taskDuePresetYmd(days, today = crmToday()) {
    return addDaysYmd(today, days)
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
    return out
}
