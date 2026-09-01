// Отчёт «Коммерческие предложения» — реестр выставленных КП за период.
//
// Отдельной сущности «КП» в базе нет: документ собирается на лету в
// ProposalView и живёт СЛЕДАМИ — сохранённым в документы сделки PDF
// (Attachment с именем «Коммерческое предложение № … от …») и записью об
// отправке письмом (ChangeLog entityType="Email"). Отчёт склеивает эти следы
// в строки реестра.
//
// Чего отчёт не видит и видеть не может: КП, которое менеджер просто скачал —
// роуты /proposal/pdf и /proposal/xlsx в базу не пишут ничего, и если такой
// файл ушёл клиенту из личной почты, следа не осталось. Это цена решения не
// заводить модель Proposal; когда она появится, меняется источник
// (proposals-report-data.js), а форма отчёта остаётся прежней.
//
// Денег в отчёте нет вовсе. Сумма КП нигде не хранится: в имени файла её нет,
// в payload письма тоже. Подставить сюда сумму сделки было бы враньём — состав
// сделки после КП правят, и колонка, подписанная «Сумма КП», показывала бы
// совсем другую цифру.
//
// Ось времени одна — момент появления следа (когда КП сформировали). Дата,
// напечатанная в самом документе, правится менеджером руками и приезжает не из
// каждого следа (в письме её нет), поэтому периодом она не управляет и живёт
// отдельной подписью.
import { DEAL_STATUSES } from "./deal"
import { displayName } from "./profile"

// Метка КП в имени файла. Ею же отбираются вложения в выборке — обычные
// документы сделки (счета, договоры, ТЗ) в отчёт попадать не должны.
export const PROPOSAL_FILE_MARK = "Коммерческое предложение"

// Сколько строк отдаём в UI. Реестр за год у активного отдела — тысячи строк,
// а таблица всё равно листается постранично; полный список берут из Excel,
// поэтому обрезку подписываем, а не прячем.
export const PROPOSALS_REPORT_LIMIT = 500

/**
 * Разбор имени файла: «Коммерческое предложение № XKJP/3 от 30.08.2026.pdf»
 * → { number: "XKJP/3", dateText: "30.08.2026" }.
 *
 * Номер менеджер правит руками (поле в форме КП), поэтому не разбираем его на
 * базу и версию и не проверяем по шаблону — берём как есть. Файл без «от …»
 * (переименовали, обрезали дату) номер всё равно отдаёт: строка реестра важнее
 * подписи под ней. Не КП — null.
 */
export function parseProposalFileName(fileName) {
    const name = String(fileName || "")
        .replace(/\.(pdf|xlsx|docx?)$/i, "")
        .trim()
    if (!name.toLowerCase().startsWith(PROPOSAL_FILE_MARK.toLowerCase())) return null

    const rest = name.slice(PROPOSAL_FILE_MARK.length).replace(/^\s*№?\s*/, "")
    const m = rest.match(/^(.*?)\s+от\s+(\d{1,2}\.\d{1,2}\.\d{4})\s*$/i)
    if (m) return { number: m[1].trim(), dateText: m[2] }
    return { number: rest.trim(), dateText: "" }
}

/**
 * Отбор из query-параметров. Общий для страницы и Excel-выгрузки: файл должен
 * повторять то, что менеджер видит на экране, а не весь период целиком.
 * Мусорное значение не роняет отчёт, а просто не отбирает — ссылкой на реестр
 * делятся, и битый параметр в ней не должен приводить к 400.
 */
export function parseProposalsFilters(params) {
    const get = key => {
        const raw = params?.get ? params.get(key) : params?.[key]
        return String(raw || "").trim()
    }
    const status = get("status")
    return {
        managerId: get("managerId"),
        counterpartyId: get("counterpartyId"),
        status: DEAL_STATUSES.includes(status) ? status : "",
    }
}

function personName(user) {
    return user ? displayName(user) || "" : ""
}

function minDate(a, b) {
    if (!a) return b
    if (!b) return a
    return new Date(a) <= new Date(b) ? a : b
}

function maxDate(a, b) {
    if (!a) return b
    if (!b) return a
    return new Date(a) >= new Date(b) ? a : b
}

function emptyRow(key, deal) {
    return {
        key,
        number: "",
        documentDate: "",
        at: null,
        lastAt: null,
        saved: false,
        sent: false,
        sentCount: 0,
        sentTo: [],
        attachmentId: null,
        fileName: "",
        mimeType: "",
        authors: [],
        dealId: deal.id,
        dealTitle: deal.title || "",
        dealStatus: deal.status,
        managerId: deal.manager?.id || "",
        managerName: personName(deal.manager),
        counterpartyId: deal.counterparty?.id || "",
        counterpartyName: deal.counterparty?.name || "",
    }
}

/**
 * Собирает реестр КП из уже загруженных следов (чистая функция — выборка живёт
 * в proposals-report-data.js).
 *
 * traces: [{ kind: "FILE" | "EMAIL", id, dealId, at, author, … }]
 * deals:  [{ id, title, status, manager, counterparty }] — карточки следов.
 *
 * Фильтры применяются здесь, а не в запросе: значения для выпадашек («какие
 * менеджеры вообще выставляли КП за период») считаются по НЕотобранным
 * строкам, иначе выбор менеджера вычищал бы из фильтра остальных.
 */
export function buildProposalsReport({
    traces = [],
    deals = [],
    from = null,
    to = null,
    managerId = "",
    counterpartyId = "",
    status = "",
    limit = PROPOSALS_REPORT_LIMIT,
} = {}) {
    const dealsById = new Map(deals.map(d => [d.id, d]))
    const rows = new Map()

    for (const trace of traces) {
        const deal = dealsById.get(trace.dealId)
        // Карточку удалили — показывать след не в чем: ни клиента, ни
        // менеджера у него своих нет.
        if (!deal) continue

        const parsed = trace.kind === "FILE" ? parseProposalFileName(trace.fileName) : null
        if (trace.kind === "FILE" && !parsed) continue
        const number = String(trace.kind === "FILE" ? parsed.number : trace.number || "").trim()

        // Один номер по одной сделке — одна строка: сохранённый файл и письмо
        // с ним же это одно КП, а не два. Номера нет (файл переименовали,
        // письмо без него) — след живёт отдельной строкой: слить его не с чем.
        const key = number ? `${deal.id}::${number.toLowerCase()}` : `${trace.kind}:${trace.id}`
        let row = rows.get(key)
        if (!row) {
            row = emptyRow(key, deal)
            row.number = number
            rows.set(key, row)
        }

        row.at = minDate(row.at, trace.at)
        row.lastAt = maxDate(row.lastAt, trace.at)

        if (trace.kind === "FILE") {
            row.saved = true
            // Ссылка ведёт на первый сохранённый файл: пересохранение под тем
            // же номером кладёт рядом копию, и разбирать их в реестре незачем.
            if (!row.attachmentId) {
                row.attachmentId = trace.id
                row.fileName = trace.fileName
                row.mimeType = trace.mimeType || ""
            }
            if (!row.documentDate && parsed.dateText) row.documentDate = parsed.dateText
        } else {
            row.sent = true
            row.sentCount += 1
            for (const address of trace.to || []) {
                if (address && !row.sentTo.includes(address)) row.sentTo.push(address)
            }
        }

        const author = personName(trace.author)
        if (author && !row.authors.includes(author)) row.authors.push(author)
    }

    const all = [...rows.values()]

    // Значения фильтров — по всем строкам периода, до отбора.
    const managers = uniqueOptions(all, r => [r.managerId, r.managerName])
    const counterparties = uniqueOptions(all, r => [r.counterpartyId, r.counterpartyName])
    const presentStatuses = new Set(all.map(r => r.dealStatus))
    const statuses = DEAL_STATUSES.filter(s => presentStatuses.has(s))

    const filtered = all
        .filter(r => !managerId || r.managerId === managerId)
        .filter(r => !counterpartyId || r.counterpartyId === counterpartyId)
        .filter(r => !status || r.dealStatus === status)
        .sort((a, b) => new Date(b.at) - new Date(a.at))

    const totals = {
        total: filtered.length,
        sent: filtered.filter(r => r.sent).length,
        saved: filtered.filter(r => r.saved).length,
        // КП, которое скачали и отправили из личной почты, отчёт не видит
        // вовсе. А вот сформированное и никуда из CRM не ушедшее — видит:
        // файл в сделке лежит, письма нет.
        notSent: filtered.filter(r => !r.sent).length,
        dealsCount: new Set(filtered.map(r => r.dealId)).size,
        counterpartiesCount: new Set(filtered.map(r => r.counterpartyId).filter(Boolean)).size,
        managersCount: new Set(filtered.map(r => r.managerId).filter(Boolean)).size,
    }

    const limited = Number.isFinite(limit) ? filtered.slice(0, limit) : filtered

    return {
        from,
        to,
        rows: limited,
        rowsCount: filtered.length,
        truncated: limited.length < filtered.length,
        filters: { managers, counterparties, statuses },
        totals,
    }
}

function uniqueOptions(rows, pick) {
    const map = new Map()
    for (const row of rows) {
        const [id, label] = pick(row)
        if (!id || map.has(id)) continue
        map.set(id, { value: id, label: label || "—" })
    }
    return [...map.values()].sort((a, b) => a.label.localeCompare(b.label, "ru"))
}
