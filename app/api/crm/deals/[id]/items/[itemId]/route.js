import prisma from "@/lib/client"
import { requireCrmSession } from "@/lib/crm/session"
import { DEAL_ITEM_TRACKED_FIELDS, parseDealItemPayload } from "@/lib/crm/deal"
import { diffEntities, logChange, snapshotEntity } from "@/lib/crm/change-log"
import { dealLockResponse } from "@/lib/crm/access"

// Позиции наследуют блокировку родительской сделки.
async function dealLock(dealId, session) {
    const deal = await prisma.deal.findUnique({
        where: { id: dealId },
        select: { status: true },
    })
    return dealLockResponse(deal?.status, session)
}

async function recalcTotalAndBump(tx, dealId, authorId) {
    const items = await tx.dealItem.findMany({ where: { dealId }, select: { amount: true } })
    const total = items.reduce((s, it) => s + Number(it.amount), 0)
    await tx.deal.update({
        where: { id: dealId },
        data: { totalAmount: total.toString(), updatedById: authorId ?? null },
    })
}

export async function PATCH(request, { params }) {
    const { session, response } = await requireCrmSession()
    if (!session) return response

    const existing = await prisma.dealItem.findUnique({ where: { id: params.itemId } })
    if (!existing || existing.dealId !== params.id) {
        return Response.json({ error: "Позиция не найдена" }, { status: 404 })
    }

    const locked = await dealLock(params.id, session)
    if (locked) return locked

    let body
    try {
        body = await request.json()
    } catch {
        return Response.json({ error: "Некорректный JSON" }, { status: 400 })
    }

    const { data, error } = parseDealItemPayload(body, { partial: true })
    if (error) return Response.json({ error }, { status: 400 })

    if (data.productId) {
        const exists = await prisma.product.findUnique({
            where: { id: data.productId },
            select: { id: true },
        })
        if (!exists) return Response.json({ error: "Товар не найден" }, { status: 400 })
    }

    const updated = await prisma.$transaction(async tx => {
        const item = await tx.dealItem.update({ where: { id: params.itemId }, data })
        const changes = diffEntities(existing, item, DEAL_ITEM_TRACKED_FIELDS)
        if (Object.keys(changes).length > 0) {
            await logChange(tx, {
                entityType: "DealItem",
                entityId: item.id,
                parentEntityType: "Deal",
                parentEntityId: params.id,
                action: "UPDATE",
                payload: changes,
                authorId: session.user.id,
            })
        }
        await recalcTotalAndBump(tx, params.id, session.user.id)
        return item
    })
    return Response.json({ item: updated })
}

export async function DELETE(_request, { params }) {
    const { session, response } = await requireCrmSession()
    if (!session) return response

    const existing = await prisma.dealItem.findUnique({ where: { id: params.itemId } })
    if (!existing || existing.dealId !== params.id) {
        return Response.json({ error: "Позиция не найдена" }, { status: 404 })
    }

    const locked = await dealLock(params.id, session)
    if (locked) return locked

    await prisma.$transaction(async tx => {
        await tx.dealItem.delete({ where: { id: params.itemId } })
        await logChange(tx, {
            entityType: "DealItem",
            entityId: existing.id,
            parentEntityType: "Deal",
            parentEntityId: params.id,
            action: "DELETE",
            payload: snapshotEntity(existing, DEAL_ITEM_TRACKED_FIELDS),
            authorId: session.user.id,
        })
        await recalcTotalAndBump(tx, params.id, session.user.id)
    })
    return Response.json({ ok: true })
}
