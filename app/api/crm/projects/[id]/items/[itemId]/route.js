import prisma from "@/lib/client"
import { requireCrmSession } from "@/lib/crm/session"
import { PROJECT_ITEM_TRACKED_FIELDS, parseProjectItemPayload } from "@/lib/crm/project"
import { diffEntities, logChange, snapshotEntity } from "@/lib/crm/change-log"
import { projectLockResponse } from "@/lib/crm/access"

// Позиции наследуют блокировку родительского проекта.
async function projectLock(projectId, session) {
    const project = await prisma.project.findUnique({
        where: { id: projectId },
        select: { status: true },
    })
    return projectLockResponse(project?.status, session)
}

async function recalcTotalAndBump(tx, projectId, authorId) {
    const items = await tx.projectItem.findMany({
        where: { projectId },
        select: { amount: true },
    })
    const total = items.reduce((s, it) => s + Number(it.amount), 0)
    await tx.project.update({
        where: { id: projectId },
        data: { totalAmount: total.toString(), updatedById: authorId ?? null },
    })
}

export async function PATCH(request, { params }) {
    const { session, response } = await requireCrmSession()
    if (!session) return response

    const existing = await prisma.projectItem.findUnique({ where: { id: params.itemId } })
    if (!existing || existing.projectId !== params.id) {
        return Response.json({ error: "Позиция не найдена" }, { status: 404 })
    }

    const locked = await projectLock(params.id, session)
    if (locked) return locked

    let body
    try {
        body = await request.json()
    } catch {
        return Response.json({ error: "Некорректный JSON" }, { status: 400 })
    }

    const { data, error } = parseProjectItemPayload(body, { partial: true })
    if (error) return Response.json({ error }, { status: 400 })

    if (data.productId) {
        const exists = await prisma.product.findUnique({
            where: { id: data.productId },
            select: { id: true },
        })
        if (!exists) {
            return Response.json({ error: "Товар из справочника не найден" }, { status: 400 })
        }
    }

    const updated = await prisma.$transaction(async tx => {
        const item = await tx.projectItem.update({ where: { id: params.itemId }, data })
        const changes = diffEntities(existing, item, PROJECT_ITEM_TRACKED_FIELDS)
        if (Object.keys(changes).length > 0) {
            await logChange(tx, {
                entityType: "ProjectItem",
                entityId: item.id,
                parentEntityType: "Project",
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

    const existing = await prisma.projectItem.findUnique({ where: { id: params.itemId } })
    if (!existing || existing.projectId !== params.id) {
        return Response.json({ error: "Позиция не найдена" }, { status: 404 })
    }

    const locked = await projectLock(params.id, session)
    if (locked) return locked

    await prisma.$transaction(async tx => {
        await tx.projectItem.delete({ where: { id: params.itemId } })
        await logChange(tx, {
            entityType: "ProjectItem",
            entityId: existing.id,
            parentEntityType: "Project",
            parentEntityId: params.id,
            action: "DELETE",
            payload: snapshotEntity(existing, PROJECT_ITEM_TRACKED_FIELDS),
            authorId: session.user.id,
        })
        await recalcTotalAndBump(tx, params.id, session.user.id)
    })

    return Response.json({ ok: true })
}
