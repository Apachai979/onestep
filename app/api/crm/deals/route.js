import prisma from "@/lib/client"
import { requireCrmSession } from "@/lib/crm/session"
import {
    DEAL_STATUSES,
    DEAL_TRACKED_FIELDS,
    autoArchiveStaleFinalDeals,
    dealDisplayTitle,
    parseDealPayload,
} from "@/lib/crm/deal"
import { logChange, snapshotEntity } from "@/lib/crm/change-log"
import { dealProjectPartiesError } from "@/lib/crm/access"

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
    const isAuction = searchParams.get("isAuction")
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
    if (isAuction === "true") where.isAuction = true
    else if (isAuction === "false") where.isAuction = false

    // Ленивая архивация: старые CLOSED/CANCELLED → ARCHIVED. Одна короткая
    // UPDATE-строка, чтобы Kanban/список не приходилось чистить руками.
    await autoArchiveStaleFinalDeals(prisma)

    const items = await prisma.deal.findMany({
        where,
        orderBy: { createdAt: "desc" },
        include: {
            counterparty: { select: COUNTERPARTY_SELECT },
            payer: { select: { id: true, name: true, inn: true } },
            // Сделка из проекта берёт название из него же — см. dealDisplayTitle.
            sourceProject: { select: { id: true, internalName: true } },
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
              const title = dealDisplayTitle(d, d.counterparty?.name).toLowerCase()
              const cp = (d.counterparty?.name || "").toLowerCase()
              // Клиент присылает реквизиты плательщика — по ним тоже ищем.
              const payer = (d.payer?.name || "").toLowerCase()
              const payerInn = (d.payer?.inn || "").toLowerCase()
              return (
                  title.includes(ql) ||
                  cp.includes(ql) ||
                  payer.includes(ql) ||
                  payerInn.includes(ql)
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

    const { data, error } = parseDealPayload(body)
    if (error) return Response.json({ error }, { status: 400 })

    // Позиции переносятся из проекта-источника, а стороны сделки должны ему
    // соответствовать — проверяем до валидации контактов, чтобы дальше по коду
    // клиент и заказчик были уже окончательными.
    let sourceProject = null
    if (data.sourceProjectId) {
        sourceProject = await prisma.project.findUnique({
            where: { id: data.sourceProjectId },
            include: { items: true },
        })
        if (!sourceProject) {
            return Response.json({ error: "Проект-источник не найден" }, { status: 400 })
        }
        const partiesError = dealProjectPartiesError(sourceProject, data)
        if (partiesError) return Response.json({ error: partiesError }, { status: 400 })
    }

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

    if (data.payerId) {
        // Плательщик, совпадающий с клиентом, — это отсутствие плательщика.
        if (data.payerId === data.counterpartyId) data.payerId = null
        else {
            const p = await prisma.counterparty.findUnique({
                where: { id: data.payerId },
                select: { id: true },
            })
            if (!p) return Response.json({ error: "Плательщик не найден" }, { status: 400 })
        }
    }

    const manager = await prisma.user.findUnique({
        where: { id: data.managerId },
        select: { status: true },
    })
    if (!manager || manager.status !== "ACTIVE") {
        return Response.json({ error: "Менеджер не найден" }, { status: 400 })
    }

    if (data.auctionCustomerId) {
        const cust = await prisma.counterparty.findUnique({
            where: { id: data.auctionCustomerId },
            select: { id: true },
        })
        if (!cust) return Response.json({ error: "Заказчик не найден" }, { status: 400 })

        if (data.auctionCustomerContactId) {
            const c = await prisma.contact.findUnique({
                where: { id: data.auctionCustomerContactId },
                select: { counterpartyId: true },
            })
            if (!c || c.counterpartyId !== data.auctionCustomerId) {
                return Response.json(
                    { error: "Контакт не принадлежит заказчику" },
                    { status: 400 },
                )
            }
        }
    } else if (data.auctionCustomerContactId) {
        // Контакт заказчика без самого заказчика — игнорируем.
        data.auctionCustomerContactId = null
    }

    const sourceItems = sourceProject?.items ?? []

    const created = await prisma.$transaction(async tx => {
        const deal = await tx.deal.create({
            data: {
                ...data,
                status: data.status || "NEGOTIATION",
                totalAmount: data.totalAmount ?? "0",
                createdById: session.user.id,
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
