import prisma from "@/lib/client"
import { fetchTenders, MAX_RECORDS_PER_SYNC } from "./tenderland"
import { mergeRows } from "./tender-map"

/**
 * Тянет закупки из Tenderland и складывает во входящий список.
 *
 * Решение менеджера (decision, skipReason, связанная сделка) при повторной
 * загрузке не трогается: закупка могла обновиться на площадке, но «мимо»
 * остаётся «мимо», иначе разобранная карточка вернулась бы в работу.
 *
 * Возвращает { created, updated, totalCount, truncated, limit }.
 */
export async function syncTenders({ since = null, limit = MAX_RECORDS_PER_SYNC } = {}) {
    const { rows, totalCount, truncated } = await fetchTenders({ since, limit })
    const tenders = mergeRows(rows)

    let created = 0
    let updated = 0

    for (const t of tenders) {
        const { tenderlandId, ktru, ...rest } = t
        const data = { ...rest, ktru: ktru.length ? ktru.join("\n") : null }

        const existing = await prisma.tender.findUnique({
            where: { tenderlandId },
            select: { id: true },
        })

        if (existing) {
            await prisma.tender.update({ where: { tenderlandId }, data })
            updated += 1
        } else {
            await prisma.tender.create({ data: { tenderlandId, ...data } })
            created += 1
        }
    }

    return { created, updated, totalCount, truncated, limit, received: tenders.length }
}

/** Время последней загруженной закупки — от него отсчитывается следующая синхронизация. */
export async function lastSyncPoint() {
    const last = await prisma.tender.findFirst({
        orderBy: { importedAt: "desc" },
        select: { importedAt: true },
    })
    return last?.importedAt || null
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
