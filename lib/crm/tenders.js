import prisma from "@/lib/client"
import { fetchByKeys, fetchEvents, fetchTenders, MAX_RECORDS_PER_SYNC } from "./tenderland"
import { maxTenderId, mergeRows, tenderChanges, tenderIdNumber } from "./tender-map"
import { getDefaultOwnCompany } from "./own-company"
import { logChange } from "./change-log"

/**
 * Загрузка и отслеживание закупок из Tenderland.
 *
 * Раздел живёт в двух режимах, и оба запускает одна кнопка «Обновить закупки»
 * (а ночью — планировщик):
 *
 *   syncTenders    — забрать новые закупки, которых у нас ещё нет;
 *   refreshTenders — сверить те, что уже взяты в работу, с площадкой.
 *
 * Решение менеджера (decision, skipReason, связанная сделка) не трогается
 * никогда: закупка на площадке меняется, но «мимо» остаётся «мимо», иначе
 * разобранная карточка вернулась бы в работу.
 */

// Сколько дней после торгов ещё ждём итог. Победитель приезжает от Тендерлэнда
// только со статусом «Закупка завершена», а до него доходит хорошо если
// половина закупок — остальные висят в «Работе комиссии» месяцами. Без этого
// срока такая закупка опрашивалась бы вечно.
export const TENDER_TRACK_DAYS_AFTER_AUCTION = 14

// Предохранитель для догоняющей загрузки: 10 проходов по 100 — тысяча закупок
// за вызов, больше суточного лимита данных всё равно не выбрать.
const MAX_SYNC_PASSES = 10

const DAY_MS = 24 * 60 * 60 * 1000

// Откуда закупка попала в список: из автопоиска или заведена вручную по номеру.
export const AUTOSEARCH_SOURCE = "AUTOSEARCH"
export const MANUAL_SOURCE = "MANUAL"

/** Самый большой известный идентификатор — точка следующей синхронизации. */
export async function lastTenderId() {
    // Идентификатор строковый ("TL2711858763"), сортировкой в базе максимум не
    // взять: "TL999" оказался бы больше "TL1000". Записей тут тысячи, так что
    // считаем по числовой части на своей стороне.
    //
    // Закупки, заведённые вручную по номеру, в расчёт не идут: автопоиск их не
    // приносил, а идентификатор у такой закупки может быть свежее всего, что мы
    // из него забрали. Сдвинутый ими курсор молча отрезал бы хвост автопоиска —
    // ровно та потеря данных, ради которой инкремент и перевели с даты на id.
    const rows = await prisma.tender.findMany({
        where: { source: AUTOSEARCH_SOURCE },
        select: { tenderlandId: true },
    })
    return maxTenderId(rows.map(r => r.tenderlandId))
}

/** Строка выгрузки → данные для записи (ktru в базе лежит одной строкой). */
function toRecord(mapped) {
    const { tenderlandId, ktru, ...rest } = mapped
    return { ...rest, ktru: ktru.length ? ktru.join("\n") : null }
}

/** Проставляет дату последнего изменения на стороне Тендерлэнда. */
async function stampEvents(tenderlandIds) {
    if (!tenderlandIds.length) return
    // Запрос событий не тратит лимит переданных данных, поэтому свежим записям
    // отметку ставим сразу: без неё первая же сверка сочла бы их изменившимися
    // и полезла бы добирать данные, которые только что забрали.
    const events = await fetchEvents(tenderlandIds)
    for (const [tenderlandId, info] of events) {
        if (!info.lastUpdateDate) continue
        await prisma.tender.updateMany({
            where: { tenderlandId },
            data: { tlUpdatedAt: info.lastUpdateDate },
        })
    }
}

/**
 * Тянет новые закупки и складывает во входящий список.
 *
 * Инкремент идёт по идентификатору (searchAfterId), а не по времени нашего
 * импорта: идентификатор выдаётся при добавлении закупки в Тендерлэнд и растёт
 * монотонно, так что «всё после последнего известного» ничего не пропускает.
 * Раньше точкой служило importedAt, и недобранный из-за потолка хвост терялся
 * навсегда — фильтр по дате отсекал его на следующем же запуске.
 *
 * При пустой базе архив автопоиска (тысячи закупок за все месяцы) не тянем:
 * берём страницу самых свежих. Полная выгрузка — только явным full.
 *
 * Возвращает { created, updated, truncated, passes }.
 */
export async function syncTenders({
    limit = MAX_RECORDS_PER_SYNC,
    full = false,
    maxPasses = MAX_SYNC_PASSES,
} = {}) {
    let cursor = full ? null : await lastTenderId()
    const firstRun = !cursor

    let created = 0
    let updated = 0
    let truncated = false
    let passes = 0
    const fresh = []

    for (let pass = 0; pass < maxPasses; pass++) {
        passes += 1
        const { rows, truncated: hitCeiling } = await fetchTenders({
            sinceId: cursor,
            limit,
            // Стартовая страница при пустой базе — самые свежие закупки.
            // Дальше сортировка по возрастанию: потолок должен отрезать свежий
            // верх, который заберёт следующий проход, а не старый хвост.
            orderBy: firstRun && !full ? "tender_publishDate.desc" : undefined,
        })

        const tenders = mergeRows(rows)
        if (!tenders.length) break

        for (const mapped of tenders) {
            const data = toRecord(mapped)
            const existing = await prisma.tender.findUnique({
                where: { tenderlandId: mapped.tenderlandId },
                select: { id: true },
            })

            if (existing) {
                await prisma.tender.update({
                    where: { tenderlandId: mapped.tenderlandId },
                    // Закупку могли завести вручную раньше, чем её принёс
                    // автопоиск. Раз она пришла оттуда — она законно участвует
                    // в курсоре, и держать пометку «вручную» больше незачем.
                    data: { ...data, source: AUTOSEARCH_SOURCE },
                })
                updated += 1
            } else {
                await prisma.tender.create({
                    data: { tenderlandId: mapped.tenderlandId, ...data },
                })
                created += 1
                fresh.push(mapped.tenderlandId)
            }
        }

        truncated = hitCeiling
        // Не упёрлись в потолок — забрали всё, что было.
        if (!hitCeiling) break
        // Стартовая страница отсортирована по убыванию, продолжать по ней
        // нельзя: следующий проход пойдёт от нового максимума на общих
        // правилах, уже по возрастанию.
        if (firstRun && !full) break

        const next = maxTenderId(tenders.map(t => t.tenderlandId))
        // Курсор не сдвинулся — дальше только зациклиться на той же странице.
        if (!next || (cursor && tenderIdNumber(next) <= tenderIdNumber(cursor))) break
        cursor = next
    }

    await stampEvents(fresh)

    return { created, updated, truncated, passes }
}

/**
 * Ключ для сравнения номеров: в номер закупки менеджер может добавить пробелы
 * или скопировать его с переносом, а идентификатор Тендерлэнда написать
 * строчными.
 */
function normalizeKey(value) {
    return String(value || "")
        .replace(/[^0-9a-zA-Zа-яА-ЯёЁ]/g, "")
        .toUpperCase()
}

/**
 * Ручной импорт закупки по номеру — для тех, что автопоиск не поймал (минус-
 * слово в названии, чужой регион, нетипичный тип процедуры), а менеджеру их
 * прислали со стороны.
 *
 * Search/Get ищет по всей базе Тендерлэнда, а не по нашему автопоиску, и
 * принимает как их идентификатор (TL…), так и регистрационный номер закупки.
 * Отчёт тот же самый («CRM-импорт»), поэтому строка разбирается общим
 * mergeRows и запись ничем не отличается от приехавшей ночью — дальше она
 * живёт по общим правилам: попадает в разбор, отслеживается сверкой, кнопкой
 * «Участвуем» разворачивается в сделку.
 *
 * Номер не уникален: на один и тот же номер приезжают разные процедуры (у
 * заказчика повторился внутренний номер, закупку перепубликовали). Поэтому при
 * нескольких попаданиях выбирает менеджер — вторым вызовом с tenderlandId.
 *
 * Стоимость — единица лимита переданных данных на каждую найденную закупку.
 *
 * Возвращает:
 *   { status: "IMPORTED", tender }   — завели новую запись
 *   { status: "EXISTS", tender }     — такая закупка уже в списке
 *   { status: "CHOICE", candidates } — совпадений несколько, нужен выбор
 *   { status: "NOT_FOUND" }          — в Тендерлэнде такой закупки нет
 */
export async function importTenderByNumber({ query, tenderlandId = null } = {}) {
    const key = String(tenderlandId || query || "").trim()
    if (!key) return { status: "NOT_FOUND" }

    const found = mergeRows(await fetchByKeys([key]))

    // strictMatch на их стороне точного совпадения не гарантирует, поэтому
    // сверяем сами: чужая закупка в списке хуже, чем честное «не найдено».
    const wanted = normalizeKey(key)
    const candidates = found.filter(
        t => normalizeKey(t.tenderlandId) === wanted || normalizeKey(t.regNumber) === wanted,
    )
    if (!candidates.length) return { status: "NOT_FOUND" }

    const existing = await prisma.tender.findMany({
        where: { tenderlandId: { in: candidates.map(c => c.tenderlandId) } },
        // Номер и название нужны вызывающему: по ним список наводится на
        // найденную закупку, когда она уже была заведена раньше.
        select: {
            id: true,
            tenderlandId: true,
            regNumber: true,
            name: true,
            decision: true,
            dealId: true,
        },
    })
    const existingById = new Map(existing.map(e => [e.tenderlandId, e]))

    if (candidates.length > 1 && !tenderlandId) {
        return {
            status: "CHOICE",
            candidates: candidates.map(c => ({
                ...c,
                // Что из найденного уже в списке — видно сразу, чтобы менеджер
                // не выбирал закупку, которую и так может открыть.
                existing: existingById.get(c.tenderlandId) || null,
            })),
        }
    }

    const mapped =
        candidates.find(c => c.tenderlandId === tenderlandId) || candidates[0]
    const already = existingById.get(mapped.tenderlandId)
    if (already) return { status: "EXISTS", tender: already }

    const created = await prisma.tender.create({
        data: {
            tenderlandId: mapped.tenderlandId,
            source: MANUAL_SOURCE,
            ...toRecord(mapped),
        },
    })
    // Та же отметка, что и новым закупкам из автопоиска: без неё первая же
    // сверка сочла бы запись изменившейся и полезла бы добирать данные, за
    // которые мы только что заплатили.
    await stampEvents([created.tenderlandId])

    return { status: "IMPORTED", tender: created }
}

/**
 * Отслеживаем ли закупку — то есть стоит ли тратить на неё запросы.
 *
 *   «Мимо»          — нет, разобрана и закрыта.
 *   победитель есть — нет, итог зафиксирован.
 *   «Участвуем»     — до торгов и ещё TENDER_TRACK_DAYS_AFTER_AUCTION дней после.
 *   «Не разобрана»  — пока не закрыт приём заявок: позже менеджер её уже не возьмёт.
 *
 * Без дат отсчитывать не от чего, поэтому точкой отсчёта становится импорт —
 * иначе закупка без сроков осталась бы в отслеживании навсегда.
 */
export function isTenderTracked(tender, now = new Date()) {
    if (tender.decision === "SKIPPED") return false
    if (tender.winnerInn || tender.winnerName) return false

    if (tender.decision === "TAKEN") {
        const ref = tender.biddingDate || tender.endDate || tender.importedAt
        if (!ref) return true
        return new Date(ref).getTime() + TENDER_TRACK_DAYS_AFTER_AUCTION * DAY_MS >= now.getTime()
    }

    if (!tender.endDate) {
        const ref = tender.importedAt
        if (!ref) return true
        return new Date(ref).getTime() + TENDER_TRACK_DAYS_AFTER_AUCTION * DAY_MS >= now.getTime()
    }
    return new Date(tender.endDate).getTime() >= now.getTime()
}

const TRACK_SELECT = {
    id: true,
    tenderlandId: true,
    decision: true,
    dealId: true,
    importedAt: true,
    tlUpdatedAt: true,
    regNumber: true,
    name: true,
    beginPrice: true,
    publishDate: true,
    beginDate: true,
    endDate: true,
    biddingDate: true,
    region: true,
    typeName: true,
    tenderStatus: true,
    sourceLink: true,
    etpName: true,
    ktru: true,
    customerName: true,
    customerInn: true,
    customerKpp: true,
    customerOgrn: true,
    winnerInn: true,
    winnerName: true,
}

/** Закупки, за которыми следим прямо сейчас. */
export async function trackedTenders(now = new Date()) {
    const rows = await prisma.tender.findMany({
        where: { decision: { not: "SKIPPED" }, winnerInn: null },
        select: TRACK_SELECT,
    })
    return rows.filter(t => isTenderTracked(t, now))
}

// Поля сделки, которые ведёт закупка: слева — в сделке, справа — в закупке.
const DEAL_MIRROR = {
    bidsDeadlineAt: "endDate",
    auctionAt: "biddingDate",
    nmck: "beginPrice",
}

function sameValue(a, b) {
    if (a === null || a === undefined) return b === null || b === undefined
    if (b === null || b === undefined) return false
    if (a instanceof Date || b instanceof Date) {
        return new Date(a).getTime() === new Date(b).getTime()
    }
    return String(a) === String(b)
}

/**
 * Переносит изменения закупки в заведённую по ней сделку.
 *
 * Поле обновляется, только если в сделке до сих пор лежит прежнее значение из
 * закупки. Разошлось — значит менеджер правил руками, и его правку автоматика
 * не перетирает. Победителя пишем лишь в пустое поле и статус сделки не
 * трогаем: итог аукциона в CRM читается по статусу, а двигать воронку — дело
 * менеджера.
 */
async function syncDealFromTender(tx, dealId, before, after) {
    const deal = await tx.deal.findUnique({
        where: { id: dealId },
        select: { id: true, bidsDeadlineAt: true, auctionAt: true, nmck: true, winner: true },
    })
    if (!deal) return null

    const data = {}
    for (const [dealField, tenderField] of Object.entries(DEAL_MIRROR)) {
        if (sameValue(before?.[tenderField], after[tenderField])) continue
        if (!sameValue(deal[dealField], before?.[tenderField])) continue
        data[dealField] = after[tenderField]
    }
    if (after.winnerName && !deal.winner) data.winner = after.winnerName

    if (!Object.keys(data).length) return null

    await tx.deal.update({ where: { id: deal.id }, data })

    const payload = {}
    for (const key of Object.keys(data)) {
        payload[key] = {
            from: deal[key] instanceof Date ? deal[key].toISOString() : deal[key],
            to: data[key] instanceof Date ? data[key].toISOString() : data[key],
        }
    }
    // Автор не указан — правка пришла с площадки, а не от пользователя.
    await logChange(tx, {
        entityType: "Deal",
        entityId: deal.id,
        action: "UPDATE",
        payload: { source: "Tenderland", ...payload },
        authorId: null,
    })

    return payload
}

/**
 * Сверяет отслеживаемые закупки с площадкой.
 *
 * Дешёвая часть — Entity/GetEvents: одним запросом на всю пачку он отдаёт дату
 * последнего изменения и не тратит лимит переданных данных. Полные данные
 * добираем только по тем закупкам, где дата сдвинулась с прошлой сверки, —
 * вот за них уже платим по единице.
 *
 * Возвращает { tracked, changed, updated, deals }.
 */
export async function refreshTenders({ now = new Date() } = {}) {
    const tracked = await trackedTenders(now)
    if (!tracked.length) return { tracked: 0, changed: 0, updated: 0, deals: 0 }

    const events = await fetchEvents(tracked.map(t => t.tenderlandId))

    const stale = tracked.filter(t => {
        const info = events.get(t.tenderlandId)
        if (!info?.lastUpdateDate) return false
        if (!t.tlUpdatedAt) return true
        return info.lastUpdateDate.getTime() > new Date(t.tlUpdatedAt).getTime()
    })
    if (!stale.length) return { tracked: tracked.length, changed: 0, updated: 0, deals: 0 }

    const rows = await fetchByKeys(stale.map(t => t.tenderlandId))
    const byId = new Map(mergeRows(rows).map(m => [m.tenderlandId, m]))

    let updated = 0
    let deals = 0

    for (const tender of stale) {
        const mapped = byId.get(tender.tenderlandId)
        const stamp = events.get(tender.tenderlandId)?.lastUpdateDate || null

        // Пришло событие, но данные закупки те же — отметку всё равно двигаем,
        // иначе на каждой сверке будем добирать её заново.
        if (!mapped) {
            await prisma.tender.update({
                where: { id: tender.id },
                data: { tlUpdatedAt: stamp },
            })
            continue
        }

        const data = toRecord(mapped)
        const changes = tenderChanges(tender, data)
        if (!Object.keys(changes).length) {
            await prisma.tender.update({
                where: { id: tender.id },
                data: { tlUpdatedAt: stamp },
            })
            continue
        }

        await prisma.$transaction(async tx => {
            await tx.tender.update({
                where: { id: tender.id },
                data: { ...data, tlUpdatedAt: stamp, refreshedAt: new Date() },
            })
            if (tender.dealId) {
                const dealChanges = await syncDealFromTender(tx, tender.dealId, tender, data)
                if (dealChanges) deals += 1
            }
        })
        updated += 1
    }

    return { tracked: tracked.length, changed: stale.length, updated, deals }
}

// Запасное юрлицо на случай, если в справочнике «Наши компании» (/crm/settings)
// основная компания ещё не выбрана: то же, что продавец в КП (SELLER в
// proposal-doc.js). Ищем по ИНН, а не по названию: название в справочнике могли
// поправить руками.
export const OWN_COMPANY_INN = "7017475333"

/**
 * Кто станет клиентом сделки по выигранной закупке.
 *
 * Заказчик закупки — это конечный потребитель, и продаём мы ему не всегда
 * напрямую: если по этому ЛПУ уже ведётся проект, поставка пойдёт через
 * дистрибьютора из проекта — с ним и заключается сделка. Проекта нет —
 * поставляем сами, клиентом становится наша организация.
 *
 * Возвращает { counterpartyId, source, project }, где source:
 *   PROJECT_DISTRIBUTOR — дистрибьютор из проекта по этому потребителю
 *   OWN                 — наше юрлицо, основное из «Наших компаний» (прямая
 *                         поставка)
 *   CUSTOMER            — запасной вариант: сам заказчик, если своей карточки
 *                         в справочнике не нашлось
 */
export async function resolveDealClient(endCustomerId) {
    // Закрытые проекты («нет потребности») в расчёт не берём: дистрибьютор
    // оттуда к этому заказчику отношения уже не имеет. Из живых берём самый
    // свежий — он отражает текущую договорённость.
    const project = endCustomerId
        ? await prisma.project.findFirst({
              where: { endCustomerId, status: { not: "NO_NEED" } },
              orderBy: { createdAt: "desc" },
              select: {
                  id: true,
                  internalName: true,
                  discount: true,
                  distributorId: true,
                  // Нужен для проверки сторон при привязке сделки к проекту
                  // (dealProjectPartiesError).
                  endCustomerId: true,
                  distributor: {
                      select: {
                          id: true,
                          name: true,
                          discount: true,
                          group: { select: { name: true, discount: true } },
                      },
                  },
              },
          })
        : null

    if (project?.distributorId) {
        return {
            counterpartyId: project.distributorId,
            source: "PROJECT_DISTRIBUTOR",
            project,
        }
    }

    // Своё юрлицо берём из справочника «Наши компании»: основную компанию
    // выбирает администратор в настройках, менять её правкой кода не должно
    // приходиться. Реквизиты клиента (скидка, группа) дочитывает вызывающий —
    // здесь нужен только id.
    const own = await getDefaultOwnCompany()
    if (own) return { counterpartyId: own.id, source: "OWN", project: null }

    // Основную не отметили — падаем на юрлицо из константы.
    const fallback = await prisma.counterparty.findFirst({
        where: { inn: OWN_COMPANY_INN },
        select: { id: true },
    })
    if (fallback) return { counterpartyId: fallback.id, source: "OWN", project: null }

    return { counterpartyId: endCustomerId, source: "CUSTOMER", project: null }
}

/**
 * Заказчик закупки как контрагент: ищем по ИНН+КПП (пара уникальна в базе),
 * иначе заводим карточку конечного потребителя.
 *
 * Реквизиты приходят из ЕИС вместе с закупкой, так что DaData здесь не нужна.
 */
export async function ensureCustomerCounterparty(tender, userId) {
    if (!tender.customerInn) return null

    const kpp = tender.customerKpp || null
    const existing = await prisma.counterparty.findFirst({
        where: { inn: tender.customerInn, kpp },
        select: { id: true },
    })
    if (existing) return existing.id

    const created = await prisma.counterparty.create({
        data: {
            type: "END_CUSTOMER",
            name: tender.customerName || `ИНН ${tender.customerInn}`,
            region: tender.region || "Не указан",
            inn: tender.customerInn,
            kpp,
            ogrn: tender.customerOgrn || null,
            source: "Tenderland",
            createdById: userId,
        },
        select: { id: true },
    })
    return created.id
}
