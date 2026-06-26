import prisma from "@/lib/client"
import { requireCrmSession } from "@/lib/crm/session"
import { DEAL_TRACKED_FIELDS, parseDealPayload } from "@/lib/crm/deal"
import { diffEntities, logChange, snapshotEntity } from "@/lib/crm/change-log"

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

export async function GET(_request, { params }) {
    const { session, response } = await requireCrmSession()
    if (!session) return response

    const item = await prisma.deal.findUnique({
        where: { id: params.id },
        include: {
            counterparty: { select: COUNTERPARTY_SELECT },
            manager: { select: MANAGER_SELECT },
            createdBy: { select: MANAGER_SELECT },
            updatedBy: { select: MANAGER_SELECT },
            contact: { select: CONTACT_SELECT },
            items: { orderBy: { createdAt: "asc" } },
            sourceProject: {
                select: { id: true, internalName: true, externalAuctionId: true },
            },
        },
    })
    if (!item) return Response.json({ error: "Не найдено" }, { status: 404 })
    return Response.json({ item })
}

export async function PATCH(request, { params }) {
    const { session, response } = await requireCrmSession()
    if (!session) return response

    const existing = await prisma.deal.findUnique({ where: { id: params.id } })
    if (!existing) return Response.json({ error: "Не найдено" }, { status: 404 })

    let body
    try {
        body = await request.json()
    } catch {
        return Response.json({ error: "Некорректный JSON" }, { status: 400 })
    }

    const { data, error } = parseDealPayload(body, { partial: true })
    if (error) return Response.json({ error }, { status: 400 })

    if (data.counterpartyId) {
        const cp = await prisma.counterparty.findUnique({
            where: { id: data.counterpartyId },
            select: { id: true },
        })
        if (!cp) return Response.json({ error: "Клиент не найден" }, { status: 400 })
    }
    if (data.contactId) {
        const targetCp = data.counterpartyId ?? existing.counterpartyId
        const c = await prisma.contact.findUnique({
            where: { id: data.contactId },
            select: { counterpartyId: true },
        })
        if (!c || c.counterpartyId !== targetCp) {
            return Response.json(
                { error: "Контакт не принадлежит выбранному клиенту" },
                { status: 400 },
            )
        }
    }
    if (data.managerId) {
        const m = await prisma.user.findUnique({
            where: { id: data.managerId },
            select: { status: true },
        })
        if (!m || m.status !== "ACTIVE") {
            return Response.json({ error: "Менеджер не найден" }, { status: 400 })
        }
    }

    const updated = await prisma.$transaction(async tx => {
        const deal = await tx.deal.update({
            where: { id: params.id },
            data: {
                ...data,
                updatedById: session.user.id ?? null,
            },
            include: {
                counterparty: { select: COUNTERPARTY_SELECT },
                manager: { select: MANAGER_SELECT },
                createdBy: { select: MANAGER_SELECT },
                updatedBy: { select: MANAGER_SELECT },
                contact: { select: CONTACT_SELECT },
                items: true,
            },
        })
        const changes = diffEntities(existing, deal, DEAL_TRACKED_FIELDS)
        if (Object.keys(changes).length > 0) {
            await logChange(tx, {
                entityType: "Deal",
                entityId: deal.id,
                action: "UPDATE",
                payload: changes,
                authorId: session.user.id,
            })
        }
        return deal
    })
    return Response.json({ item: updated })
}

export async function DELETE(_request, { params }) {
    const { session, response } = await requireCrmSession()
    if (!session) return response

    const existing = await prisma.deal.findUnique({ where: { id: params.id } })
    if (!existing) return Response.json({ error: "Не найдено" }, { status: 404 })

    await prisma.$transaction(async tx => {
        await tx.deal.delete({ where: { id: params.id } })
        await logChange(tx, {
            entityType: "Deal",
            entityId: existing.id,
            action: "DELETE",
            payload: snapshotEntity(existing, DEAL_TRACKED_FIELDS),
            authorId: session.user.id,
        })
    })
    return Response.json({ ok: true })
}
