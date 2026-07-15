import prisma from "@/lib/client"
import { requireCrmSession } from "@/lib/crm/session"
import {
    parseShipmentPayload,
    parseShipmentItemPayload,
    calculateDealItemRemaining,
} from "@/lib/crm/shipment"

const DEAL_SELECT = {
    id: true,
    title: true,
    status: true,
    counterpartyId: true,
    counterparty: { select: { id: true, name: true, type: true } },
    manager: { select: { id: true, firstName: true, lastName: true, email: true } },
}

const FULL_INCLUDE = {
    deal: { select: DEAL_SELECT },
    items: {
        include: {
            dealItem: {
                select: {
                    id: true,
                    name: true,
                    sku: true,
                    quantity: true,
                    product: { select: { unitWeightKg: true, unitVolumeM3: true } },
                },
            },
        },
    },
    recipientContact: {
        select: { id: true, firstName: true, lastName: true, phone: true, email: true },
    },
    createdBy: { select: { id: true, firstName: true, lastName: true, email: true } },
    updatedBy: { select: { id: true, firstName: true, lastName: true, email: true } },
}

export async function GET(_request, { params }) {
    const { session, response } = await requireCrmSession()
    if (!session) return response

    const item = await prisma.shipment.findUnique({
        where: { id: params.id },
        include: FULL_INCLUDE,
    })
    if (!item) return Response.json({ error: "Не найдено" }, { status: 404 })
    return Response.json({ item })
}

export async function PATCH(request, { params }) {
    const { session, response } = await requireCrmSession()
    if (!session) return response

    const existing = await prisma.shipment.findUnique({
        where: { id: params.id },
        include: { items: true, deal: { select: { counterpartyId: true } } },
    })
    if (!existing) return Response.json({ error: "Не найдено" }, { status: 404 })

    let body
    try {
        body = await request.json()
    } catch {
        return Response.json({ error: "Некорректный JSON" }, { status: 400 })
    }

    const { data, error } = parseShipmentPayload(
        { ...body, dealId: existing.dealId },
        { partial: true },
    )
    if (error) return Response.json({ error }, { status: 400 })

    delete data.dealId

    if (data.recipientContactId) {
        const c = await prisma.contact.findUnique({
            where: { id: data.recipientContactId },
            select: { counterpartyId: true },
        })
        if (!c || c.counterpartyId !== existing.deal.counterpartyId) {
            return Response.json(
                { error: "Контакт-получатель не принадлежит клиенту сделки" },
                { status: 400 },
            )
        }
    }

    if (data.status === "SHIPPED" && existing.status !== "SHIPPED") {
        if (!data.shippedAt && !existing.shippedAt) {
            data.shippedAt = new Date()
        }
    }
    // Возврат в черновик — фактическая дата отгрузки очищается,
    // если её не передали явно в запросе.
    if (
        data.status &&
        data.status !== "SHIPPED" &&
        existing.status === "SHIPPED" &&
        body.shippedAt === undefined
    ) {
        data.shippedAt = null
    }

    let itemsUpdate = null
    if (Array.isArray(body.items)) {
        const deal = await prisma.deal.findUnique({
            where: { id: existing.dealId },
            include: {
                items: true,
                shipments: { include: { items: true } },
            },
        })
        const dealItemById = new Map(deal.items.map(i => [i.id, i]))
        const parsedItems = []
        for (const raw of body.items) {
            const { data: itemData, error: itemError } = parseShipmentItemPayload(raw)
            if (itemError) return Response.json({ error: itemError }, { status: 400 })
            const dealItem = dealItemById.get(itemData.dealItemId)
            if (!dealItem) {
                return Response.json(
                    { error: "Позиция отгрузки не относится к выбранной сделке" },
                    { status: 400 },
                )
            }
            const remaining = calculateDealItemRemaining(dealItem, deal.shipments, {
                excludeShipmentId: existing.id,
            })
            if (Number(itemData.quantity) > remaining + 1e-9) {
                return Response.json(
                    {
                        error: `Превышен остаток к отгрузке по позиции «${dealItem.name}»: доступно ${remaining}`,
                    },
                    { status: 400 },
                )
            }
            parsedItems.push(itemData)
        }
        if (parsedItems.length === 0) {
            return Response.json({ error: "Добавьте хотя бы одну позицию" }, { status: 400 })
        }
        itemsUpdate = parsedItems
    }

    const updated = await prisma.$transaction(async tx => {
        const shipment = await tx.shipment.update({
            where: { id: params.id },
            data: {
                ...data,
                updatedById: session.user.id,
            },
        })
        if (itemsUpdate) {
            await tx.shipmentItem.deleteMany({ where: { shipmentId: shipment.id } })
            await tx.shipmentItem.createMany({
                data: itemsUpdate.map(i => ({
                    shipmentId: shipment.id,
                    dealItemId: i.dealItemId,
                    quantity: i.quantity,
                    note: i.note ?? null,
                })),
            })
        }
        return tx.shipment.findUnique({ where: { id: shipment.id }, include: FULL_INCLUDE })
    })

    return Response.json({ item: updated })
}

export async function DELETE(_request, { params }) {
    const { session, response } = await requireCrmSession()
    if (!session) return response

    const existing = await prisma.shipment.findUnique({ where: { id: params.id } })
    if (!existing) return Response.json({ error: "Не найдено" }, { status: 404 })

    await prisma.shipment.delete({ where: { id: params.id } })
    return Response.json({ ok: true })
}
