import prisma from "@/lib/client"
import { requireCrmSession } from "@/lib/crm/session"
import { AUCTION_ITEM_TRACKED_FIELDS, parseAuctionItemPayload } from "@/lib/crm/auction"
import { diffEntities, logChange, snapshotEntity } from "@/lib/crm/change-log"

export async function PATCH(request, { params }) {
    const { session, response } = await requireCrmSession()
    if (!session) return response

    const existing = await prisma.auctionItem.findUnique({ where: { id: params.itemId } })
    if (!existing || existing.auctionId !== params.id) {
        return Response.json({ error: "Позиция не найдена" }, { status: 404 })
    }

    let body
    try {
        body = await request.json()
    } catch {
        return Response.json({ error: "Некорректный JSON" }, { status: 400 })
    }

    const { data, error } = parseAuctionItemPayload(body, { partial: true })
    if (error) return Response.json({ error }, { status: 400 })

    if (data.productId) {
        const exists = await prisma.product.findUnique({
            where: { id: data.productId },
            select: { id: true },
        })
        if (!exists) return Response.json({ error: "Товар не найден" }, { status: 400 })
    }

    const updated = await prisma.$transaction(async tx => {
        const item = await tx.auctionItem.update({ where: { id: params.itemId }, data })
        const changes = diffEntities(existing, item, AUCTION_ITEM_TRACKED_FIELDS)
        if (Object.keys(changes).length > 0) {
            await logChange(tx, {
                entityType: "AuctionItem",
                entityId: item.id,
                parentEntityType: "Auction",
                parentEntityId: params.id,
                action: "UPDATE",
                payload: changes,
                authorId: session.user.id,
            })
        }
        return item
    })
    return Response.json({ item: updated })
}

export async function DELETE(_request, { params }) {
    const { session, response } = await requireCrmSession()
    if (!session) return response

    const existing = await prisma.auctionItem.findUnique({ where: { id: params.itemId } })
    if (!existing || existing.auctionId !== params.id) {
        return Response.json({ error: "Позиция не найдена" }, { status: 404 })
    }

    await prisma.$transaction(async tx => {
        await tx.auctionItem.delete({ where: { id: params.itemId } })
        await logChange(tx, {
            entityType: "AuctionItem",
            entityId: existing.id,
            parentEntityType: "Auction",
            parentEntityId: params.id,
            action: "DELETE",
            payload: snapshotEntity(existing, AUCTION_ITEM_TRACKED_FIELDS),
            authorId: session.user.id,
        })
    })
    return Response.json({ ok: true })
}
