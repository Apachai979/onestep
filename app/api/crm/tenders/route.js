import prisma from "@/lib/client"
import { requireCrmSession } from "@/lib/crm/session"
import { getOwnCompanies } from "@/lib/crm/own-company"
import { crmDayStart, crmToday } from "@/lib/crm/datetime"
import { TENDER_DECISIONS } from "@/lib/crm/tender-map"
import { importTenderByNumber } from "@/lib/crm/tenders"
import { TENDERLAND_ERROR_STATUS } from "@/lib/crm/tenderland"

const TENDER_SELECT = {
    id: true,
    tenderlandId: true,
    regNumber: true,
    name: true,
    beginPrice: true,
    publishDate: true,
    endDate: true,
    biddingDate: true,
    region: true,
    typeName: true,
    tenderStatus: true,
    sourceLink: true,
    etpName: true,
    ktru: true,
    customerName: true,
    customerShortName: true,
    customerInn: true,
    decision: true,
    decisionAt: true,
    skipReason: true,
    importedAt: true,
    winnerInn: true,
    winnerName: true,
    refreshedAt: true,
    // Закупку могли завести вручную по номеру — в списке это подписано.
    source: true,
    dealId: true,
    decisionBy: { select: { id: true, firstName: true, lastName: true } },
    deal: { select: { id: true, title: true, status: true } },
}

export async function GET(request) {
    const { session, response } = await requireCrmSession()
    if (!session) return response

    const { searchParams } = new URL(request.url)
    const decision = searchParams.get("decision") || "NEW"
    const search = (searchParams.get("search") || "").trim()
    const take = Math.min(Number(searchParams.get("take")) || 100, 300)
    // Просроченные — это те же неразобранные, поэтому отдельным решением
    // (decision) они быть не могут: признак вычисляется по дате.
    const expired = searchParams.get("expired") === "1"

    // Граница просроченности — начало сегодняшних суток в зоне CRM, а не
    // текущий момент: закупка с приёмом заявок до сегодня в списке подписана
    // «сегодня» и заявку по ней ещё подают. Просрочено — вчера и раньше.
    const expiredBefore = crmDayStart(crmToday())

    const where = {}
    if (decision !== "ALL") {
        if (!TENDER_DECISIONS.includes(decision)) {
            return Response.json({ error: "Некорректный фильтр" }, { status: 400 })
        }
        where.decision = decision
    }
    // Условия складываем в AND: и отбор по сроку, и поиск разворачиваются в
    // свои OR, а один where.OR на двоих затёр бы одно другим.
    const and = []
    // Разбор делится по сроку: работа — на «Не разобраны», прозеванное — на
    // своей вкладке. Закупка без срока остаётся в работе: отсчитывать не от чего.
    if (decision === "NEW") {
        and.push(
            expired
                ? { endDate: { lt: expiredBefore } }
                : { OR: [{ endDate: null }, { endDate: { gte: expiredBefore } }] },
        )
    }
    if (search) {
        // SQLite в Prisma не поддерживает mode: "insensitive", поэтому ищем как есть:
        // номер закупки и ИНН — цифры, а название чаще копируют из карточки.
        and.push({
            OR: [
                { name: { contains: search } },
                { regNumber: { contains: search } },
                { customerName: { contains: search } },
                // Аббревиатуру («ГБУЗ ВОДКБ») в полном наименовании не найти —
                // там оно расписано словами.
                { customerShortName: { contains: search } },
                { customerInn: { contains: search } },
                // Идентификатор Тендерлэнда — им наводится список после ручного
                // импорта закупки, у которой номер извещения не приехал.
                { tenderlandId: { contains: search } },
            ],
        })
    }
    if (and.length) where.AND = and

    const expiredWhere = { decision: "NEW", endDate: { lt: expiredBefore } }

    const [items, counts, expiredCount, own] = await Promise.all([
        prisma.tender.findMany({
            where,
            select: TENDER_SELECT,
            // Первым делом то, что горит: ближайший срок подачи заявок сверху,
            // закупки без срока — в конец. На вкладке просроченных порядок
            // обратный: сверху те, что истекли только что, — по ним ещё может
            // быть подана заявка, которую забыли отметить.
            orderBy: expired
                ? [{ endDate: "desc" }, { importedAt: "desc" }]
                : [{ endDate: "asc" }, { importedAt: "desc" }],
            take,
        }),
        prisma.tender.groupBy({ by: ["decision"], _count: { _all: true } }),
        prisma.tender.count({ where: expiredWhere }),
        getOwnCompanies(),
    ])

    // Победитель приезжает из Тендерлэнда одинаково и при нашей победе, и при
    // чужой — различить их можно только по ИНН: своё юрлицо в протоколе
    // называют как придётся. Сравнение делаем здесь, чтобы список не тянул
    // справочник «Наши компании» на клиент.
    const ownInns = new Set(own.items.map(i => i.inn).filter(Boolean))

    // Счётчик вкладки должен совпадать с тем, что она показывает: просроченные
    // из «Не разобраны» вычтены и посчитаны отдельной строкой.
    const byDecision = Object.fromEntries(counts.map(c => [c.decision, c._count._all]))
    byDecision.NEW = Math.max((byDecision.NEW || 0) - expiredCount, 0)
    byDecision.EXPIRED = expiredCount

    return Response.json({
        items: items.map(t => ({
            ...t,
            winnerIsOwn: Boolean(t.winnerInn && ownInns.has(t.winnerInn)),
        })),
        counts: byDecision,
    })
}

/**
 * Ручной импорт закупки по номеру: менеджеру прислали номер, а автопоиск эту
 * закупку не поймал.
 *
 *   { query: "0319200064326000007" }        — найти и завести
 *   { query, tenderlandId: "TL2711858763" } — выбор, когда номер не уникален
 *
 * Ответ повторяет статусы importTenderByNumber: IMPORTED / EXISTS / CHOICE.
 * Права обычные, менеджерские: запрос стоит по единице лимита переданных
 * данных на найденную закупку — на фоне ночной выгрузки это ничто.
 */
export async function POST(request) {
    const { session, response } = await requireCrmSession()
    if (!session) return response

    let body
    try {
        body = await request.json()
    } catch {
        return Response.json({ error: "Некорректный JSON" }, { status: 400 })
    }

    const query = String(body?.query || "").trim()
    const tenderlandId = String(body?.tenderlandId || "").trim() || null
    if (!query && !tenderlandId) {
        return Response.json({ error: "Укажите номер закупки" }, { status: 400 })
    }
    // Номер закупки по 44-ФЗ — 19 цифр, у региональных площадок бывает короче и
    // с буквами. Ограничение тут только от случайно вставленной в поле простыни.
    if (query.length > 50) {
        return Response.json({ error: "Слишком длинный номер закупки" }, { status: 400 })
    }

    try {
        const result = await importTenderByNumber({ query, tenderlandId })
        if (result.status === "NOT_FOUND") {
            return Response.json(
                {
                    error: "В Тендерлэнде такой закупки нет. Проверьте номер — "
                        + "он должен быть тем же, что в извещении на площадке.",
                },
                { status: 404 },
            )
        }
        return Response.json({ ok: true, ...result })
    } catch (err) {
        return Response.json(
            { error: err.message, code: err.code },
            { status: TENDERLAND_ERROR_STATUS[err.code] || 502 },
        )
    }
}
