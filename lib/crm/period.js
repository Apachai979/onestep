// Отчётный период для аналитики.
//
// Период всюду — пара календарных дат "YYYY-MM-DD" в зоне CRM (Москва), а не
// моменты: менеджер выбирает «с 1 по 31 марта», и эти сутки должны быть теми
// же самыми независимо от зоны сервера и браузера. В реальные UTC-моменты для
// запроса пара разворачивается уже в выборке — через crmDayStart/crmDayEnd.
import { crmToday, crmYmd, isYmd } from "./datetime"

// Текущие периоды кончаются сегодняшним днём, а не концом календарного
// месяца/квартала/года: пустой хвост будущих дней растягивал бы график и
// делал сравнение с прошлыми месяцами нечестным. Завершённые периоды
// («Прошлый год») берутся целиком.
export const PERIOD_PRESETS = [
    { key: "month", label: "Месяц" },
    { key: "quarter", label: "Квартал" },
    { key: "year", label: "Год" },
    { key: "prevYear", label: "Прошлый год" },
]

export const DEFAULT_PERIOD_PRESET = "year"

const MONTHS_SHORT = [
    "янв",
    "фев",
    "мар",
    "апр",
    "май",
    "июн",
    "июл",
    "авг",
    "сен",
    "окт",
    "ноя",
    "дек",
]

const MONTHS_FULL = [
    "январь",
    "февраль",
    "март",
    "апрель",
    "май",
    "июнь",
    "июль",
    "август",
    "сентябрь",
    "октябрь",
    "ноябрь",
    "декабрь",
]

function pad(n) {
    return String(n).padStart(2, "0")
}

function ymd(year, month, day) {
    return `${year}-${pad(month)}-${pad(day)}`
}

function lastDayOfMonth(year, month) {
    // Нулевой день следующего месяца = последний день текущего.
    return new Date(Date.UTC(year, month, 0)).getUTCDate()
}

/** Диапазон пресета: { from, to } в "YYYY-MM-DD". */
export function periodPreset(key, today = crmToday()) {
    const base = isYmd(today) ? today : crmToday()
    const year = Number(base.slice(0, 4))
    const month = Number(base.slice(5, 7))

    switch (key) {
        case "month":
            return { from: ymd(year, month, 1), to: base }
        case "quarter": {
            const firstMonth = Math.floor((month - 1) / 3) * 3 + 1
            return { from: ymd(year, firstMonth, 1), to: base }
        }
        case "prevYear":
            return { from: ymd(year - 1, 1, 1), to: ymd(year - 1, 12, 31) }
        case "year":
        default:
            return { from: ymd(year, 1, 1), to: base }
    }
}

/**
 * Какому пресету соответствует диапазон — чтобы подсветить активную кнопку.
 * Ручной период не совпадёт ни с одним и вернёт null.
 */
export function detectPeriodPreset({ from, to }, today = crmToday()) {
    for (const p of PERIOD_PRESETS) {
        const range = periodPreset(p.key, today)
        if (range.from === from && range.to === to) return p.key
    }
    return null
}

/**
 * Разбор периода из query-параметров. Некорректные и перевёрнутые значения не
 * роняют отчёт, а откатываются к пресету по умолчанию — ссылкой на отчёт
 * делятся, и битый параметр в ней не должен приводить к 400.
 */
export function parsePeriodParams(params, today = crmToday()) {
    const from = params?.get ? params.get("from") : params?.from
    const to = params?.get ? params.get("to") : params?.to
    if (isYmd(from) && isYmd(to) && from <= to) return { from, to }
    return periodPreset(DEFAULT_PERIOD_PRESET, today)
}

/** Месяц момента в зоне CRM: "2026-03". */
export function crmMonthKey(value) {
    const day = crmYmd(value)
    return day ? day.slice(0, 7) : null
}

/** Все месяцы периода по порядку: ["2026-01", "2026-02", …]. */
export function monthsBetween(from, to) {
    if (!isYmd(from) || !isYmd(to) || from > to) return []
    const out = []
    let year = Number(from.slice(0, 4))
    let month = Number(from.slice(5, 7))
    const lastKey = to.slice(0, 7)
    // Ограничитель на случай мусорных дат: 50 лет помесячно — заведомо больше
    // любого осмысленного отчёта, но цикл гарантированно завершится.
    for (let i = 0; i < 600; i++) {
        const key = `${year}-${pad(month)}`
        out.push(key)
        if (key >= lastKey) break
        month += 1
        if (month > 12) {
            month = 1
            year += 1
        }
    }
    return out
}

/** "2026-03" → "мар 2026". */
export function formatMonthKey(key) {
    if (typeof key !== "string" || key.length < 7) return ""
    const month = Number(key.slice(5, 7))
    if (!(month >= 1 && month <= 12)) return key
    return `${MONTHS_SHORT[month - 1]} ${key.slice(0, 4)}`
}

/** "2026-03-15" → "15 марта 2026". Для подписи периода в шапке и в Excel. */
export function formatPeriodDate(day) {
    if (!isYmd(day)) return ""
    const month = Number(day.slice(5, 7))
    const genitive = {
        январь: "января",
        февраль: "февраля",
        март: "марта",
        апрель: "апреля",
        май: "мая",
        июнь: "июня",
        июль: "июля",
        август: "августа",
        сентябрь: "сентября",
        октябрь: "октября",
        ноябрь: "ноября",
        декабрь: "декабря",
    }
    return `${Number(day.slice(8, 10))} ${genitive[MONTHS_FULL[month - 1]]} ${day.slice(0, 4)}`
}

export function formatPeriodLabel({ from, to }) {
    if (!isYmd(from) || !isYmd(to)) return ""
    // Целый календарный год подписываем одним словом — «1 января 2025 —
    // 31 декабря 2025» занимает пол-экрана и ничего не добавляет.
    if (from.slice(5) === "01-01" && to.slice(5) === "12-31" && from.slice(0, 4) === to.slice(0, 4)) {
        return `${from.slice(0, 4)} год`
    }
    return `${formatPeriodDate(from)} — ${formatPeriodDate(to)}`
}

/**
 * Предыдущий период той же длины — для сравнения «было / стало».
 * Для полного календарного года это ровно предыдущий год, иначе — окно такой
 * же длины, приставленное встык слева.
 */
export function previousPeriod({ from, to }) {
    if (!isYmd(from) || !isYmd(to) || from > to) return null
    const year = Number(from.slice(0, 4))
    if (from.slice(5) === "01-01" && to.slice(5) === "12-31" && String(year) === to.slice(0, 4)) {
        return { from: ymd(year - 1, 1, 1), to: ymd(year - 1, 12, 31) }
    }
    // Год с начала по сегодня сравниваем с тем же отрезком прошлого года, а не
    // с окном той же длины: «столько же на эту дату год назад» — то, что от
    // отчёта и ждут, а окно уехало бы в май—декабрь и мерило бы другой сезон.
    if (from.slice(5) === "01-01") {
        const toMonth = Number(to.slice(5, 7))
        const toYear = Number(to.slice(0, 4)) - 1
        // 29 февраля в невисокосном году не существует — подрезаем.
        const day = Math.min(Number(to.slice(8, 10)), lastDayOfMonth(toYear, toMonth))
        return { from: ymd(year - 1, 1, 1), to: ymd(toYear, toMonth, day) }
    }
    // Месяц с 1-го числа и квартал — сдвигаем на столько же месяцев назад, а не
    // на N дней: сравнивать март с 28 февралями было бы нечестно.
    if (from.slice(8) === "01") {
        const fromMonth = Number(from.slice(5, 7))
        const toYear = Number(to.slice(0, 4))
        const toMonth = Number(to.slice(5, 7))
        const spanMonths = (toYear - year) * 12 + (toMonth - fromMonth) + 1
        const shift = m => {
            const total = (year * 12 + (m - 1)) - spanMonths
            return { y: Math.floor(total / 12), m: (total % 12) + 1 }
        }
        const start = shift(fromMonth)
        const endTotal = (toYear * 12 + (toMonth - 1)) - spanMonths
        const endY = Math.floor(endTotal / 12)
        const endM = (endTotal % 12) + 1
        const day = Math.min(Number(to.slice(8, 10)), lastDayOfMonth(endY, endM))
        return { from: ymd(start.y, start.m, 1), to: ymd(endY, endM, day) }
    }
    const DAY = 86_400_000
    const fromMs = Date.parse(`${from}T00:00:00.000Z`)
    const toMs = Date.parse(`${to}T00:00:00.000Z`)
    const span = toMs - fromMs + DAY
    return {
        from: new Date(fromMs - span).toISOString().slice(0, 10),
        to: new Date(toMs - span).toISOString().slice(0, 10),
    }
}
