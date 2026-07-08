import prisma from "@/lib/client"
import { requireCrmSession } from "@/lib/crm/session"
import { AUCTION_TRACKED_FIELDS, parseAuctionPayload } from "@/lib/crm/auction"
import { diffEntities, logChange, snapshotEntity } from "@/lib/crm/change-log"

const CP_SELECT = { id: true, name: true, type: true, region: true }
const USER_SELECT = { id: true, firstName: true, lastName: true, email: true }
const CONTACT_SELECT = {
    id: true,
    firstName: true,
    lastName: true,
    phone: true,
    email: true,
    position: true,
}

const INCLUDE = {
    project: { select: { id: true, internalName: true } },
    customer: { select: CP_SELECT },
    supplier: { select: CP_SELECT },
    supplierContact: { select: CONTACT_SELECT },
    manager: { select: USER_SELECT },
    createdBy: { select: USER_SELECT },
    updatedBy: { select: USER_SELECT },
    items: { orderBy: { createdAt: "asc" } },
}

export async function GET(_request, { params }) {
    const { session, response } = await requireCrmSession()
    if (!session) return response

    const item = await prisma.auction.findUnique({
        where: { id: params.id },
        include: INCLUDE,
    })
    if (!item) return Response.json({ error: "Не найдено" }, { status: 404 })
    return Response.json({ item })
}

export async function PATCH(request, { params }) {
    const { session, response } = await requireCrmSession()
    if (!session) return response

    const existing = await prisma.auction.findUnique({ where: { id: params.id } })
    if (!existing) return Response.json({ error: "Не найдено" }, { status: 404 })

    let body
    try {
        body = await request.json()
    } catch {
        return Response.json({ error: "Некорректный JSON" }, { status: 400 })
    }

    const { data, error } = parseAuctionPayload(body, { partial: true })
    if (error) return Response.json({ error }, { status: 400 })

    // Причина обязательна при переводе в «Проиграли» (свободный текст,
    // как у проектов); при уходе из LOST — очищается.
    if (data.status === "LOST" && !data.lossComment && !existing.lossComment) {
        return Response.json(
            { error: "Укажите причину проигрыша" },
            { status: 400 },
        )
    }
    if (data.status && data.status !== "LOST") {
        if (existing.lossComment && data.lossComment === undefined) data.lossComment = null
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

    if (data.supplierContactId) {
        const supplierId = data.supplierId ?? existing.supplierId
        const c = await prisma.contact.findUnique({
            where: { id: data.supplierContactId },
            select: { counterpartyId: true },
        })
        if (!c || c.counterpartyId !== supplierId) {
            return Response.json(
                { error: "Контакт не принадлежит поставщику" },
                { status: 400 },
            )
        }
    }

    const updated = await prisma.$transaction(async tx => {
        const auction = await tx.auction.update({
            where: { id: params.id },
            data: { ...data, updatedById: session.user.id ?? null },
            include: INCLUDE,
        })
        const changes = diffEntities(existing, auction, AUCTION_TRACKED_FIELDS)
        if (Object.keys(changes).length > 0) {
            await logChange(tx, {
                entityType: "Auction",
                entityId: auction.id,
                parentEntityType: "Project",
                parentEntityId: auction.projectId,
                action: "UPDATE",
                payload: changes,
                authorId: session.user.id,
            })
        }
        return auction
    })
    return Response.json({ item: updated })
}

export async function DELETE(_request, { params }) {
    const { session, response } = await requireCrmSession()
    if (!session) return response

    const existing = await prisma.auction.findUnique({ where: { id: params.id } })
    if (!existing) return Response.json({ error: "Не найдено" }, { status: 404 })

    await prisma.$transaction(async tx => {
        await tx.auction.delete({ where: { id: params.id } })
        await logChange(tx, {
            entityType: "Auction",
            entityId: existing.id,
            parentEntityType: "Project",
            parentEntityId: existing.projectId,
            action: "DELETE",
            payload: snapshotEntity(existing, AUCTION_TRACKED_FIELDS),
            authorId: session.user.id,
        })
    })
    return Response.json({ ok: true })
}
