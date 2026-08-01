// Оборот контрагента — факт: сумма его закрытых сделок (статус CLOSED) со
// скидкой. Нигде не хранится, а считается по сделкам при каждом чтении.
//
// Накопительное поле («закрыли сделку — прибавили сумму») здесь не годится:
// статус можно снять и вернуть, сумму — поправить после закрытия, сделку —
// удалить. Каждое такое действие разъезжается с накопителем, а починить его
// нечем — истории сумм нет. Пересчёт от сделок самовосстанавливается.
//
// Бюджет (Counterparty.totalRevenue) — другое: это ручная оценка потенциала
// клиента, сколько он в принципе закупает. Автоматически он не меняется.
import { dealDiscountedTotal } from "./deal"

export const REVENUE_DEAL_STATUS = "CLOSED"

// Оборот считаем по клиенту сделки (counterpartyId), а не по плательщику:
// payerId — это на кого оформлены документы, закупает всё равно клиент. По
// группе компаний оборот собирается суммой по её юрлицам.
export async function closedRevenueByCounterparty(prisma, ids) {
    const scoped = Array.isArray(ids)
    if (scoped && ids.length === 0) return new Map()

    const deals = await prisma.deal.findMany({
        where: {
            status: REVENUE_DEAL_STATUS,
            ...(scoped ? { counterpartyId: { in: ids } } : {}),
        },
        select: { counterpartyId: true, totalAmount: true, discount: true },
    })

    const map = new Map()
    for (const d of deals) {
        map.set(d.counterpartyId, (map.get(d.counterpartyId) || 0) + dealDiscountedTotal(d))
    }
    return map
}

export async function closedRevenueFor(prisma, id) {
    const map = await closedRevenueByCounterparty(prisma, [id])
    return map.get(id) || 0
}

// Дописывает участникам группы поле closedRevenue. Принимает и одну группу, и
// список: у всех роутов групп ответ — это группа с members, а компоненты ждут
// оборот прямо на участнике.
export async function attachClosedRevenue(prisma, groups) {
    const list = (Array.isArray(groups) ? groups : [groups]).filter(Boolean)
    const members = list.flatMap(g => g.members || [])
    const map = await closedRevenueByCounterparty(
        prisma,
        members.map(m => m.id),
    )
    for (const m of members) m.closedRevenue = map.get(m.id) || 0
    return groups
}
