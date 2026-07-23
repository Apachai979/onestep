import prisma from "@/lib/client"
import { requireCrmSession } from "@/lib/crm/session"
import { DEAL_ITEM_TRACKED_FIELDS, parseDealItemPayload } from "@/lib/crm/deal"
import { logChange, snapshotEntity } from "@/lib/crm/change-log"
import { dealLockResponse } from "@/lib/crm/access"

async function recalcTotalAndBump(tx, dealId, authorId) {
    const items = await tx.dealItem.findMany({ where: { dealId }, select: { amount: true } })
    const total = items.reduce((s, it) => s + Number(it.amount), 0)
    await tx.deal.update({
        where: { id: dealId },
        data: { totalAmount: total.toString(), updatedById: authorId ?? null },
    })
}

export async function POST(request, { params }) {
    const { session, response } = await requireCrmSession()
    if (!session) return response

    const deal = await prisma.deal.findUnique({ where: { id: params.id } })
    if (!deal) return Response.json({ error: "Сделка не найдена" }, { status: 404 })

    const locked = dealLockResponse(deal.status, session)
    if (locked) return locked

    let body
    try {
        body = await request.json()
    } catch {
        return Response.json({ error: "Некорректный JSON" }, { status: 400 })
    }

    const { data, error } = parseDealItemPayload(body)
    if (error) return Response.json({ error }, { status: 400 })

    if (data.productId) {
        const exists = await prisma.product.findUnique({
            where: { id: data.productId },
            select: { id: true },
        })
        if (!exists) return Response.json({ error: "Товар не найден" }, { status: 400 })
    }

    const created = await prisma.$transaction(async tx => {
        const item = await tx.dealItem.create({ data: { ...data, dealId: params.id } })
        await logChange(tx, {
            entityType: "DealItem",
            entityId: item.id,
            parentEntityType: "Deal",
            parentEntityId: params.id,
            action: "CREATE",
            payload: snapshotEntity(item, DEAL_ITEM_TRACKED_FIELDS),
            authorId: session.user.id,
        })
        await recalcTotalAndBump(tx, params.id, session.user.id)
        return item
    })

    return Response.json({ item: created }, { status: 201 })
}
