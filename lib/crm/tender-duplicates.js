import prisma from "@/lib/client"
import { DEAL_OPEN_STATUSES } from "./deal"
import { logChange } from "./change-log"

/**
 * Поиск сделки, которая уже ведётся по этой закупке.
 *
 * Зачем: аукционную сделку заводят с двух сторон. Менеджер отдела продаж
 * создаёт её после разговора с врачом — ещё до публикации закупки, поэтому
 * номера у него нет, а НМЦК и дата торгов проставлены на глазок. Менеджер,
 * который разбирает входящий поток из Тендерлэнда, ту же закупку видит уже
 * опубликованной и жмёт «Участвуем» — и в CRM появляется вторая сделка по той
 * же продаже. Дальше по ней отдельно считаются обеспечение, продажи и доска
 * аукционов, то есть цифры двоятся.
 *
 * Отсюда же решается вторая половина задачи: по одному предмету заказчик
 * сначала объявляет запрос цен, потом электронный аукцион. Это две закупки и
 * одна сделка — вторую менеджер привязывает к существующей (Tender.dealId
 * намеренно не уникален).
 *
 * Функция ничего не решает сама: она возвращает кандидатов, а выбор — привязать
 * или всё-таки завести новую сделку — делает менеджер. Автоматическая привязка
 * тут опаснее дубля: разные закупки одного ЛПУ похожи между собой сильнее, чем
 * кажется, а разлепить склеенные сделки некому.
 */

// Насколько могут разойтись даты, чтобы это всё ещё считалось одной закупкой.
// Менеджер продаж ставит срок со слов заказчика («торги в середине месяца»),
// и точного попадания от такой даты ждать нельзя.
export const DUP_DATE_WINDOW_DAYS = 10

// Насколько может разойтись сумма. НМЦК до публикации известна так же
// приблизительно, как и дата.
export const DUP_PRICE_TOLERANCE = 0.1

const DAY_MS = 24 * 60 * 60 * 1000

// Уверенность совпадения — ею список кандидатов отсортирован и подписан:
//   EXACT  — совпал номер закупки, это она и есть;
//   STRONG — тот же заказчик и сходятся дата торгов или сумма;
//   WEAK   — тот же заказчик, больше ничего общего.
const RANK = { EXACT: 0, STRONG: 1, WEAK: 2 }

/** Номер закупки для сравнения: в карточку его вбивают руками, с пробелами. */
function normalizeNumber(value) {
    if (!value) return null
    const normalized = String(value).replace(/\s+/g, "").toLowerCase()
    return normalized || null
}

function toNumber(value) {
    if (value === null || value === undefined) return null
    const n = Number(value)
    return Number.isFinite(n) ? n : null
}

function datesClose(a, b) {
    if (!a || !b) return false
    const diff = Math.abs(new Date(a).getTime() - new Date(b).getTime())
    return diff <= DUP_DATE_WINDOW_DAYS * DAY_MS
}

function pricesClose(a, b) {
    const left = toNumber(a)
    const right = toNumber(b)
    if (!left || !right) return false
    return Math.abs(left - right) <= Math.max(left, right) * DUP_PRICE_TOLERANCE
}

const CANDIDATE_SELECT = {
    id: true,
    title: true,
    status: true,
    isAuction: true,
    purchaseNumber: true,
    auctionCustomerId: true,
    nmck: true,
    bidsDeadlineAt: true,
    auctionAt: true,
    counterparty: { select: { id: true, name: true } },
    auctionCustomer: { select: { id: true, name: true } },
    manager: { select: { id: true, firstName: true, lastName: true } },
    tenders: { select: { id: true, tenderlandId: true, regNumber: true, typeName: true } },
}

/**
 * Сделки, в которые эта закупка могла бы уже быть заведена.
 *
 * Заказчика ищем по ИНН, а не по id найденной карточки: ensureCustomerCounterparty
 * заводит карточку на пару ИНН+КПП, и у филиала ЛПУ она своя — сделка менеджера
 * продаж вполне может смотреть на соседнюю карточку того же учреждения.
 *
 * Возвращает массив { deal, confidence, reasons }, отсортированный по
 * уверенности; сделки, к которым эта же закупка уже привязана, отброшены.
 */
export async function findDealCandidates(tender) {
    const number = normalizeNumber(tender.regNumber)

    // Все карточки этого ЛПУ: одно учреждение — несколько КПП.
    const customerIds = tender.customerInn
        ? (
              await prisma.counterparty.findMany({
                  where: { inn: tender.customerInn },
                  select: { id: true },
              })
          ).map(c => c.id)
        : []

    const or = []
    // Номер закупки ищем и у неаукционных сделок: если номер совпал, тип
    // карточки уже не важен — это та же закупка. Отбираем все открытые сделки
    // с номером, а сравниваем в памяти: номер вбивают руками, и совпадение
    // «через пробел» запросом не поймать.
    if (number) or.push({ purchaseNumber: { not: null } })
    // По заказчику сверяемся только с аукционами: у обычной сделки нет ни
    // заказчика, ни НМЦК, ни дат, то есть сверять нечем, а «любая открытая
    // сделка по этому ЛПУ» — это шум на каждой второй закупке.
    if (customerIds.length) {
        or.push({ isAuction: true, auctionCustomerId: { in: customerIds } })
    }
    if (!or.length) return []

    const deals = await prisma.deal.findMany({
        where: { status: { in: DEAL_OPEN_STATUSES }, OR: or },
        select: CANDIDATE_SELECT,
        orderBy: { createdAt: "desc" },
    })

    const candidates = []
    for (const deal of deals) {
        // Закупка уже в этой сделке — предлагать привязать её второй раз незачем.
        if (deal.tenders.some(t => t.id === tender.id)) continue

        const reasons = []
        let confidence = null

        if (number && normalizeNumber(deal.purchaseNumber) === number) {
            confidence = "EXACT"
            reasons.push("совпал номер закупки")
        } else if (deal.auctionCustomerId && customerIds.includes(deal.auctionCustomerId)) {
            const sameDate =
                datesClose(deal.bidsDeadlineAt, tender.endDate) ||
                datesClose(deal.auctionAt, tender.biddingDate) ||
                datesClose(deal.auctionAt, tender.endDate) ||
                datesClose(deal.bidsDeadlineAt, tender.biddingDate)
            const samePrice = pricesClose(deal.nmck, tender.beginPrice)

            reasons.push("тот же заказчик")
            if (sameDate) reasons.push(`даты расходятся не больше ${DUP_DATE_WINDOW_DAYS} дней`)
            if (samePrice) reasons.push("сумма примерно та же")
            confidence = sameDate || samePrice ? "STRONG" : "WEAK"
        }

        if (!confidence) continue
        candidates.push({ deal, confidence, reasons })
    }

    candidates.sort((a, b) => RANK[a.confidence] - RANK[b.confidence])
    return candidates
}

/**
 * Есть ли по заказчику закупки открытая аукционная сделка.
 *
 * Нужно списку закупок: значок «по этому заказчику уже есть сделка» менеджер
 * должен видеть до того, как нажмёт «Участвуем», а не в диалоге после. Считаем
 * пачкой на страницу — по ИНН заказчиков, потому что карточек у ЛПУ может быть
 * несколько.
 *
 * Возвращает Map: ИНН → { dealId, title, managerName }.
 */
export async function dealsByCustomerInn(inns) {
    const list = [...new Set(inns.filter(Boolean))]
    if (!list.length) return new Map()

    const deals = await prisma.deal.findMany({
        where: {
            isAuction: true,
            status: { in: DEAL_OPEN_STATUSES },
            auctionCustomer: { inn: { in: list } },
        },
        select: {
            id: true,
            title: true,
            auctionCustomer: { select: { inn: true } },
            manager: { select: { firstName: true, lastName: true } },
        },
        orderBy: { createdAt: "desc" },
    })

    const map = new Map()
    for (const deal of deals) {
        const inn = deal.auctionCustomer?.inn
        if (!inn) continue
        const entry = map.get(inn)
        if (entry) {
            entry.count += 1
            continue
        }
        map.set(inn, {
            count: 1,
            dealId: deal.id,
            title: deal.title,
            managerName:
                [deal.manager?.lastName, deal.manager?.firstName].filter(Boolean).join(" ") || null,
        })
    }
    return map
}

// Что закупка может дозаполнить в сделке: слева — поле сделки, справа — поле
// закупки. Тот же набор, что ведёт syncDealFromTender, плюс номер и ссылка:
// у сделки, заведённой до публикации, их просто нет.
const FILL_FROM_TENDER = {
    purchaseNumber: "regNumber",
    auctionUrl: "sourceLink",
    nmck: "beginPrice",
    bidsDeadlineAt: "endDate",
    auctionAt: "biddingDate",
}

const FILL_LABELS = {
    purchaseNumber: "номер закупки",
    auctionUrl: "ссылка на аукцион",
    nmck: "НМЦК",
    bidsDeadlineAt: "окончание сбора заявок",
    auctionAt: "дата аукциона",
    auctionCustomerId: "заказчик",
    isAuction: "признак аукциона",
}

/** Пустое ли поле сделки: у НМЦК «пусто» — это ноль, поле не nullable. */
function isBlank(field, value) {
    if (value === null || value === undefined) return true
    if (field === "nmck") return toNumber(value) === 0
    return value === ""
}

/**
 * Привязывает закупку к уже существующей сделке.
 *
 * Заполняем только пустые поля сделки — то же правило, что у syncDealFromTender:
 * заполненное менеджер поставил руками, и автоматика его не перетирает, даже
 * если данные с площадки «правильнее». Расхождение он увидит сам — обе даты
 * теперь в одной карточке.
 *
 * Сделку, заведённую без флага аукциона (менеджер продаж вёл её как обычную),
 * привязка делает аукционной: закупка появилась, и без флага карточка не
 * покажет ни номер, ни доску аукционов.
 *
 * Возвращает { filled } — подписи заполненных полей для тоста.
 */
export async function linkTenderToDeal(tx, { tender, deal, auctionCustomerId, userId }) {
    const data = {}
    for (const [dealField, tenderField] of Object.entries(FILL_FROM_TENDER)) {
        const value = tender[tenderField]
        if (value === null || value === undefined) continue
        if (!isBlank(dealField, deal[dealField])) continue
        data[dealField] = value
    }
    if (!deal.auctionCustomerId && auctionCustomerId) {
        data.auctionCustomerId = auctionCustomerId
    }
    if (!deal.isAuction) data.isAuction = true

    if (Object.keys(data).length) {
        await tx.deal.update({ where: { id: deal.id }, data })
    }

    await tx.tender.update({
        where: { id: tender.id },
        data: {
            decision: "TAKEN",
            decisionAt: new Date(),
            decisionById: userId,
            dealId: deal.id,
        },
    })

    const payload = {}
    for (const key of Object.keys(data)) {
        payload[key] = {
            from: deal[key] instanceof Date ? deal[key].toISOString() : deal[key],
            to: data[key] instanceof Date ? data[key].toISOString() : data[key],
        }
    }
    // Писем по закупкам в CRM нет намеренно — след остаётся в журнале сделки,
    // и менеджер сделки видит его в карточке и в отчёте «Активность».
    await logChange(tx, {
        entityType: "Deal",
        entityId: deal.id,
        action: "UPDATE",
        payload: {
            source: "Tenderland",
            tenderlandId: tender.tenderlandId,
            linkedTender: tender.regNumber || tender.tenderlandId,
            ...payload,
        },
        authorId: userId,
    })

    return { filled: Object.keys(data).map(key => FILL_LABELS[key] || key) }
}
