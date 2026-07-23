import prisma from "@/lib/client"
import { requireCrmSession } from "@/lib/crm/session"
import {
    SHIPMENT_STATUSES,
    parseShipmentPayload,
    parseShipmentItemPayload,
    calculateDealItemRemaining,
    generateShipmentNumber,
} from "@/lib/crm/shipment"
import { dealLockResponse } from "@/lib/crm/access"

const DEAL_SELECT = {
    id: true,
    title: true,
    status: true,
    counterparty: { select: { id: true, name: true, type: true } },
    manager: { select: { id: true, firstName: true, lastName: true, email: true } },
}

export async function GET(request) {
    const { session, response } = await requireCrmSession()
    if (!session) return response

    const { searchParams } = new URL(request.url)
    const status = searchParams.get("status")
    const dealId = searchParams.get("dealId")
    const managerId = searchParams.get("managerId")
    const q = searchParams.get("q")?.trim()

    const where = {}
    if (status) {
        if (!SHIPMENT_STATUSES.includes(status)) {
            return Response.json({ error: "Некорректный статус" }, { status: 400 })
        }
        where.status = status
    }
    if (dealId) where.dealId = dealId
    if (managerId) where.deal = { managerId }

    const items = await prisma.shipment.findMany({
        where,
        orderBy: { createdAt: "desc" },
        include: {
            deal: { select: DEAL_SELECT },
            items: {
                include: {
                    dealItem: {
                        select: {
                            id: true,
                            product: { select: { unitWeightKg: true, unitVolumeM3: true } },
                        },
                    },
                },
            },
            recipientContact: {
                select: { id: true, firstName: true, lastName: true, phone: true, email: true },
            },
            createdBy: { select: { id: true, firstName: true, lastName: true, email: true } },
        },
    })

    const filtered = q
        ? items.filter(sh => {
              const ql = q.toLowerCase()
              const num = (sh.number || "").toLowerCase()
              const deal = (sh.deal?.title || "").toLowerCase()
              const cp = (sh.deal?.counterparty?.name || "").toLowerCase()
              const track = (sh.trackingNumber || "").toLowerCase()
              return (
                  num.includes(ql) ||
                  deal.includes(ql) ||
                  cp.includes(ql) ||
                  track.includes(ql)
              )
          })
        : items

    return Response.json({ items: filtered })
}

export async function POST(request) {
    const { session, response } = await requireCrmSession()
    if (!session) return response

    let body
    try {
        body = await request.json()
    } catch {
        return Response.json({ error: "Некорректный JSON" }, { status: 400 })
    }

    const { data, error } = parseShipmentPayload(body)
    if (error) return Response.json({ error }, { status: 400 })

    const deal = await prisma.deal.findUnique({
        where: { id: data.dealId },
        include: {
            items: true,
            shipments: { include: { items: true } },
        },
    })
    if (!deal) return Response.json({ error: "Сделка не найдена" }, { status: 400 })

    const locked = dealLockResponse(deal.status, session)
    if (locked) return locked

    if (data.recipientContactId) {
        const c = await prisma.contact.findUnique({
            where: { id: data.recipientContactId },
            select: { counterpartyId: true },
        })
        if (!c || c.counterpartyId !== deal.counterpartyId) {
            return Response.json(
                { error: "Контакт-получатель не принадлежит клиенту сделки" },
                { status: 400 },
            )
        }
    }

    const rawItems = Array.isArray(body.items) ? body.items : []
    const parsedItems = []
    const dealItemById = new Map(deal.items.map(i => [i.id, i]))

    for (const raw of rawItems) {
        const { data: itemData, error: itemError } = parseShipmentItemPayload(raw)
        if (itemError) return Response.json({ error: itemError }, { status: 400 })

        const dealItem = dealItemById.get(itemData.dealItemId)
        if (!dealItem) {
            return Response.json(
                { error: "Позиция отгрузки не относится к выбранной сделке" },
                { status: 400 },
            )
        }
        const remaining = calculateDealItemRemaining(dealItem, deal.shipments)
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

    const status = data.status || "DRAFT"
    const shippedAt =
        status === "SHIPPED" ? data.shippedAt || new Date() : data.shippedAt ?? null

    const created = await prisma.$transaction(async tx => {
        const number = await generateShipmentNumber(tx)
        const shipment = await tx.shipment.create({
            data: {
                number,
                dealId: data.dealId,
                status,
                plannedDate: data.plannedDate ?? null,
                shippedAt,
                deliveryAddress: data.deliveryAddress ?? null,
                carrier: data.carrier ?? null,
                trackingNumber: data.trackingNumber ?? null,
                recipientContactId: data.recipientContactId ?? null,
                recipientName: data.recipientName ?? null,
                recipientPhone: data.recipientPhone ?? null,
                recipientEmail: data.recipientEmail ?? null,
                docNumber: data.docNumber ?? null,
                note: data.note ?? null,
                createdById: session.user.id,
                items: {
                    create: parsedItems.map(i => ({
                        dealItemId: i.dealItemId,
                        quantity: i.quantity,
                        note: i.note ?? null,
                    })),
                },
            },
            include: {
                deal: { select: DEAL_SELECT },
                items: true,
                recipientContact: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        phone: true,
                        email: true,
                    },
                },
            },
        })
        return shipment
    })

    return Response.json({ item: created }, { status: 201 })
}
