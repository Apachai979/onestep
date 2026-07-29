// Единый часовой пояс CRM.
//
// Сервер (PM2) и браузеры менеджеров могут стоять в разных зонах, поэтому ни
// «сегодня», ни «просрочено» нигде не считаются через локальную зону процесса —
// только через хелперы отсюда. В базе при этом всегда лежат реальные UTC-моменты:
// задача «на весь день» — это [00:00:00.000, 23:59:59.999] московских суток.

export const CRM_TIMEZONE = "Europe/Moscow"
// Россия не переходит на летнее время с 2014 года — сдвиг фиксированный.
export const CRM_UTC_OFFSET_MINUTES = 180

const OFFSET_MS = CRM_UTC_OFFSET_MINUTES * 60_000
export const DAY_MS = 86_400_000

const YMD_RE = /^\d{4}-\d{2}-\d{2}$/
const DATE_TIME_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/
const ZONED_RE = /(?:Z|[+-]\d{2}:?\d{2})$/

export function isYmd(value) {
    return typeof value === "string" && YMD_RE.test(value)
}

function toDate(value) {
    if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value
    if (value === null || value === undefined || value === "") return null
    const d = new Date(value)
    return Number.isNaN(d.getTime()) ? null : d
}

/** Календарная дата момента в зоне CRM: "2026-07-29". */
export function crmYmd(value = new Date()) {
    const d = toDate(value)
    if (!d) return null
    return new Date(d.getTime() + OFFSET_MS).toISOString().slice(0, 10)
}

/** Время момента в зоне CRM: "09:30". */
export function crmHm(value = new Date()) {
    const d = toDate(value)
    if (!d) return null
    return new Date(d.getTime() + OFFSET_MS).toISOString().slice(11, 16)
}

/** Сегодняшняя дата в зоне CRM. */
export function crmToday() {
    return crmYmd(new Date())
}

/** Начало суток зоны CRM как реальный момент. */
export function crmDayStart(ymd) {
    if (!isYmd(ymd)) return null
    const ms = Date.parse(`${ymd}T00:00:00.000Z`)
    return Number.isNaN(ms) ? null : new Date(ms - OFFSET_MS)
}

/** Последняя миллисекунда суток зоны CRM. */
export function crmDayEnd(ymd) {
    const start = crmDayStart(ymd)
    return start ? new Date(start.getTime() + DAY_MS - 1) : null
}

/**
 * Значение input[type=datetime-local] ("2026-07-29T09:30") — как момент в зоне
 * CRM. Строку с явной зоной ("…Z", "…+03:00") берём как есть.
 */
export function crmParseDateTime(value) {
    if (typeof value !== "string" || !DATE_TIME_RE.test(value)) return null
    if (ZONED_RE.test(value)) {
        const ms = Date.parse(value)
        return Number.isNaN(ms) ? null : new Date(ms)
    }
    const ms = Date.parse(`${value.slice(0, 16)}:00.000Z`)
    return Number.isNaN(ms) ? null : new Date(ms - OFFSET_MS)
}

/** Дата ± n суток; вход и выход — "YYYY-MM-DD". */
export function addDaysYmd(ymd, n) {
    if (!isYmd(ymd)) return null
    return new Date(Date.parse(`${ymd}T00:00:00.000Z`) + n * DAY_MS)
        .toISOString()
        .slice(0, 10)
}

/** Сколько суток от a до b; обе — "YYYY-MM-DD". */
export function daysBetweenYmd(a, b) {
    if (!isYmd(a) || !isYmd(b)) return null
    return Math.round(
        (Date.parse(`${b}T00:00:00.000Z`) - Date.parse(`${a}T00:00:00.000Z`)) / DAY_MS,
    )
}

/** Минуты от начала московских суток — для позиционирования в часовой сетке. */
export function crmMinutesOfDay(value) {
    const hm = crmHm(value)
    if (!hm) return null
    return Number(hm.slice(0, 2)) * 60 + Number(hm.slice(3, 5))
}

// --- Форматирование для UI: всегда в зоне CRM ---------------------------

export function formatCrmDate(value) {
    const d = toDate(value)
    return d ? d.toLocaleDateString("ru-RU", { timeZone: CRM_TIMEZONE }) : ""
}

export function formatCrmTime(value) {
    const d = toDate(value)
    return d
        ? d.toLocaleTimeString("ru-RU", {
              timeZone: CRM_TIMEZONE,
              hour: "2-digit",
              minute: "2-digit",
          })
        : ""
}

export function formatCrmDateTime(value) {
    const d = toDate(value)
    return d
        ? d.toLocaleString("ru-RU", {
              timeZone: CRM_TIMEZONE,
              dateStyle: "short",
              timeStyle: "short",
          })
        : ""
}
