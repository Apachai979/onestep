import prisma from "@/lib/client"
import { requireCrmSession } from "@/lib/crm/session"
import { AUCTION_ITEM_TRACKED_FIELDS, parseAuctionItemPayload } from "@/lib/crm/auction"
import { logChange, snapshotEntity } from "@/lib/crm/change-log"

export async function POST(request, { params }) {
    const { session, response } = await requireCrmSession()
    if (!session) return response

    const auction = await prisma.auction.findUnique({ where: { id: params.id } })
    if (!auction) return Response.json({ error: "Аукцион не найден" }, { status: 404 })

    let body
    try {
        body = await request.json()
    } catch {
        return Response.json({ error: "Некорректный JSON" }, { status: 400 })
    }

    const { data, error } = parseAuctionItemPayload(body)
    if (error) return Response.json({ error }, { status: 400 })

    if (data.productId) {
        const exists = await prisma.product.findUnique({
            where: { id: data.productId },
            select: { id: true },
        })
        if (!exists) return Response.json({ error: "Товар не найден" }, { status: 400 })
    }

    const created = await prisma.$transaction(async tx => {
        const item = await tx.auctionItem.create({ data: { ...data, auctionId: params.id } })
        await logChange(tx, {
            entityType: "AuctionItem",
            entityId: item.id,
            parentEntityType: "Auction",
            parentEntityId: params.id,
            action: "CREATE",
            payload: snapshotEntity(item, AUCTION_ITEM_TRACKED_FIELDS),
            authorId: session.user.id,
        })
        return item
    })

    return Response.json({ item: created }, { status: 201 })
}
