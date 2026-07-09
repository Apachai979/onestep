import prisma from "@/lib/client"
import { requireCrmSession } from "@/lib/crm/session"
import {
    DEAL_STATUSES,
    DEAL_TRACKED_FIELDS,
    autoArchiveStaleFinalDeals,
    parseDealPayload,
} from "@/lib/crm/deal"
import { logChange, snapshotEntity } from "@/lib/crm/change-log"

const COUNTERPARTY_SELECT = { id: true, name: true, type: true, region: true }
const MANAGER_SELECT = { id: true, firstName: true, lastName: true, email: true }
const CONTACT_SELECT = {
    id: true,
    firstName: true,
    lastName: true,
    phone: true,
    email: true,
    position: true,
}

export async function GET(request) {
    const { session, response } = await requireCrmSession()
    if (!session) return response

    const { searchParams } = new URL(request.url)
    const status = searchParams.get("status")
    const counterpartyId = searchParams.get("counterpartyId")
    const managerId = searchParams.get("managerId")
    const q = searchParams.get("q")?.trim()

    const where = {}
    if (status) {
        if (!DEAL_STATUSES.includes(status)) {
            return Response.json({ error: "Некорректный статус" }, { status: 400 })
        }
        where.status = status
    }
    if (counterpartyId) where.counterpartyId = counterpartyId
    if (managerId) where.managerId = managerId

    // Ленивая архивация: старые CLOSED/CANCELLED → ARCHIVED. Одна короткая
    // UPDATE-строка, чтобы Kanban/список не приходилось чистить руками.
    await autoArchiveStaleFinalDeals(prisma)

    const items = await prisma.deal.findMany({
        where,
        orderBy: { createdAt: "desc" },
        include: {
            counterparty: { select: COUNTERPARTY_SELECT },
            manager: { select: MANAGER_SELECT },
            createdBy: { select: MANAGER_SELECT },
            contact: { select: CONTACT_SELECT },
            items: { select: { id: true, quantity: true } },
            shipments: {
                select: {
                    id: true,
                    status: true,
                    plannedDate: true,
                    items: { select: { id: true, dealItemId: true, quantity: true } },
                },
            },
        },
    })

    const filtered = q
        ? items.filter(d => {
              const ql = q.toLowerCase()
              const title = (d.title || "").toLowerCase()
              const cp = (d.counterparty?.name || "").toLowerCase()
              return title.includes(ql) || cp.includes(ql)
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

    const { data, error } = parseDealPayload(body)
    if (error) return Response.json({ error }, { status: 400 })

    const cp = await prisma.counterparty.findUnique({
        where: { id: data.counterpartyId },
        select: { id: true, type: true },
    })
    if (!cp) return Response.json({ error: "Клиент не найден" }, { status: 400 })

    if (data.contactId) {
        const c = await prisma.contact.findUnique({
            where: { id: data.contactId },
            select: { counterpartyId: true },
        })
        if (!c || c.counterpartyId !== data.counterpartyId) {
            return Response.json(
                { error: "Контакт не принадлежит выбранному клиенту" },
                { status: 400 },
            )
        }
    }

    const manager = await prisma.user.findUnique({
        where: { id: data.managerId },
        select: { status: true },
    })
    if (!manager || manager.status !== "ACTIVE") {
        return Response.json({ error: "Менеджер не найден" }, { status: 400 })
    }

    // Позиции переносятся из источника: аукцион в приоритете (если задан),
    // иначе — проект. Так «сделка из аукциона» получает позиции аукциона,
    // а не проекта, даже когда привязаны оба.
    let sourceItems = []

    if (data.sourceProjectId) {
        const sourceProject = await prisma.project.findUnique({
            where: { id: data.sourceProjectId },
            include: { items: true },
        })
        if (!sourceProject) {
            return Response.json({ error: "Проект-источник не найден" }, { status: 400 })
        }
        if (!data.sourceAuctionId) sourceItems = sourceProject.items
    }

    if (data.sourceAuctionId) {
        const sourceAuction = await prisma.auction.findUnique({
            where: { id: data.sourceAuctionId },
            include: { items: true },
        })
        if (!sourceAuction) {
            return Response.json({ error: "Аукцион-источник не найден" }, { status: 400 })
        }
        sourceItems = sourceAuction.items
    }

    const created = await prisma.$transaction(async tx => {
        const deal = await tx.deal.create({
            data: {
                title: data.title ?? null,
                status: data.status || "NEGOTIATION",
                totalAmount: data.totalAmount ?? "0",
                note: data.note ?? null,
                counterpartyId: data.counterpartyId,
                contactId: data.contactId ?? null,
                managerId: data.managerId,
                createdById: session.user.id,
                sourceProjectId: data.sourceProjectId ?? null,
                sourceAuctionId: data.sourceAuctionId ?? null,
            },
            include: {
                counterparty: { select: COUNTERPARTY_SELECT },
                manager: { select: MANAGER_SELECT },
                createdBy: { select: MANAGER_SELECT },
                contact: { select: CONTACT_SELECT },
            },
        })

        await logChange(tx, {
            entityType: "Deal",
            entityId: deal.id,
            action: "CREATE",
            payload: snapshotEntity(deal, DEAL_TRACKED_FIELDS),
            authorId: session.user.id,
        })

        if (sourceItems.length) {
            for (const src of sourceItems) {
                const created = await tx.dealItem.create({
                    data: {
                        dealId: deal.id,
                        productId: src.productId,
                        sku: src.sku,
                        name: src.name,
                        quantity: src.quantity,
                        amount: src.amount,
                    },
                })
                await logChange(tx, {
                    entityType: "DealItem",
                    entityId: created.id,
                    parentEntityType: "Deal",
                    parentEntityId: deal.id,
                    action: "CREATE",
                    payload: snapshotEntity(created, [
                        "sku",
                        "name",
                        "quantity",
                        "amount",
                        "productId",
                    ]),
                    authorId: session.user.id,
                })
            }

            // Пересчёт суммы сделки по перенесённым из источника позициям —
            // иначе deal.totalAmount остался бы либо тем, что пришло в форме,
            // либо нулём, и не соответствовал бы фактической сумме items.
            const total = sourceItems.reduce((s, it) => s + Number(it.amount), 0)
            const totalStr = total.toString()
            await tx.deal.update({
                where: { id: deal.id },
                data: { totalAmount: totalStr },
            })
            deal.totalAmount = totalStr
        }

        return deal
    })
    return Response.json({ item: created }, { status: 201 })
}
