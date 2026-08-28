import { crmParseDateTime } from "./datetime"

// Чистый разбор выгрузки Tenderland: никаких обращений к базе и сети, чтобы
// логику склейки лотов можно было проверять на сохранённом ответе API.
// Работа с базой — в tenders.js (та же пара, что supply.js / supply-data.js).

/** Решения менеджера по входящей закупке. */
export const TENDER_DECISIONS = ["NEW", "TAKEN", "SKIPPED"]

export const TENDER_DECISION_LABELS = {
    NEW: "Не разобрана",
    TAKEN: "Участвуем",
    SKIPPED: "Мимо",
}

/**
 * Тендерлэнд подсвечивает найденные слова разметкой прямо в названии
 * (<span class='tl-highliter'>...</span>) — в базу она попадать не должна.
 */
export function stripHighlight(value) {
    if (typeof value !== "string") return ""
    return value
        .replace(/<[^>]+>/g, "")
        .replace(/\s+/g, " ")
        .trim()
}

// Незаполненную дату Тендерлэнд отдаёт не пустым значением, а нулём календаря —
// "0001-01-01T00:00:00+03:00". Пропустить её в базу нельзя: закупка без даты
// торгов уехала бы на доске аукционов в «Прошли» с первым годом нашей эры.
const MIN_REASONABLE_DATE_MS = Date.parse("2000-01-01T00:00:00.000Z")

/**
 * Даты приезжают либо со смещением ("2026-01-05T12:58:18+03:00"), либо без него
 * ("2026-09-02T12:00:00") — во втором случае это московское время. Ровно эту
 * пару случаев и разбирает crmParseDateTime, поэтому своего парсера тут нет.
 */
function parseDate(value) {
    if (!value) return null
    const parsed = crmParseDateTime(String(value))
    if (!parsed || parsed.getTime() < MIN_REASONABLE_DATE_MS) return null
    return parsed
}

function firstFilled(list, key) {
    if (!Array.isArray(list)) return null
    for (const item of list) {
        const value = item?.[key]
        if (value !== undefined && value !== null && String(value).trim() !== "") {
            return String(value).trim()
        }
    }
    return null
}

/**
 * Сырая строка выгрузки → поля нашей записи.
 *
 * У одной закупки может быть несколько лотов, заказчиков и позиций КТРУ; строк
 * в выгрузке при этом тоже несколько (их документация про дублирование говорит
 * прямо). Здесь разбирается одна строка, склейка — в mergeRows.
 */
export function mapTenderRow(row) {
    const t = row?.tender || row
    if (!t) return null

    const tenderlandId = String(t.id || "").trim()
    if (!tenderlandId) return null

    const ktru = Array.isArray(t.products)
        ? t.products
              .map(p => stripHighlight(p?.lotKtruName || p?.lotKtruCode || ""))
              .filter(Boolean)
        : []

    return {
        tenderlandId,
        regNumber: t.regNumber ? String(t.regNumber).trim() : null,
        name: stripHighlight(t.name) || "Без названия",
        beginPrice: Number(t.beginPrice) || 0,
        publishDate: parseDate(t.publishDate),
        beginDate: parseDate(t.beginDate),
        endDate: parseDate(t.endDate),
        biddingDate: parseDate(t.biddingDate),
        region: t.region ? String(t.region).trim() : null,
        typeName: t.typeName ? String(t.typeName).trim() : null,
        tenderStatus: t.status ? String(t.status).trim() : null,
        sourceLink: t.sourceLink ? String(t.sourceLink).trim() : null,
        etpName: t.etpName ? String(t.etpName).trim() : null,
        ktru,
        customerName: firstFilled(t.customers, "lotCustomerFullName")
            || firstFilled(t.customers, "lotCustomerShortName"),
        customerInn: firstFilled(t.customers, "lotCustomerInn"),
        customerKpp: firstFilled(t.customers, "lotCustomerKpp"),
        customerOgrn: firstFilled(t.customers, "lotCustomerOgrn"),
    }
}

/**
 * Схлопывает строки одной закупки в одну запись.
 *
 * Многолотовая закупка приезжает несколькими строками с одним и тем же
 * идентификатором — менеджеру она должна показаться одной карточкой. Позиции
 * КТРУ при этом накапливаем: по ним он и отличает наш набор от чужого.
 */
export function mergeRows(rows) {
    const byId = new Map()
    for (const row of rows) {
        const mapped = mapTenderRow(row)
        if (!mapped) continue
        const existing = byId.get(mapped.tenderlandId)
        if (!existing) {
            byId.set(mapped.tenderlandId, { ...mapped, ktru: [...mapped.ktru] })
            continue
        }
        for (const code of mapped.ktru) {
            if (!existing.ktru.includes(code)) existing.ktru.push(code)
        }
        // Пустые поля в соседней строке заполнены чаще, чем в первой попавшейся.
        for (const key of Object.keys(mapped)) {
            if (key === "ktru") continue
            if (existing[key] === null || existing[key] === undefined) existing[key] = mapped[key]
        }
    }
    return Array.from(byId.values())
}
