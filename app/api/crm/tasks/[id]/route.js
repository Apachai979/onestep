import prisma from "@/lib/client"
import { requireCrmSession } from "@/lib/crm/session"
import { canCloseTask, parseTaskPayload } from "@/lib/crm/task"

const USER_SELECT = { id: true, firstName: true, lastName: true, email: true }
const CP_SELECT = { id: true, name: true, type: true }

const INCLUDE = {
    assignee: { select: USER_SELECT },
    createdBy: { select: USER_SELECT },
    deal: { select: { id: true, title: true, counterparty: { select: CP_SELECT } } },
    project: { select: { id: true, internalName: true } },
    distributor: { select: CP_SELECT },
    endCustomer: { select: CP_SELECT },
}

export async function GET(_request, { params }) {
    const { session, response } = await requireCrmSession()
    if (!session) return response

    const item = await prisma.task.findUnique({
        where: { id: params.id },
        include: INCLUDE,
    })
    if (!item) return Response.json({ error: "Не найдено" }, { status: 404 })
    return Response.json({ item })
}

export async function PATCH(request, { params }) {
    const { session, response } = await requireCrmSession()
    if (!session) return response

    const existing = await prisma.task.findUnique({ where: { id: params.id } })
    if (!existing) return Response.json({ error: "Не найдено" }, { status: 404 })

    if (existing.status !== "OPEN") {
        return Response.json(
            { error: "Закрытую задачу нельзя редактировать. Создайте новую." },
            { status: 400 },
        )
    }

    let body
    try {
        body = await request.json()
    } catch {
        return Response.json({ error: "Некорректный JSON" }, { status: 400 })
    }

    const { data, error } = parseTaskPayload(body, { partial: true })
    if (error) return Response.json({ error }, { status: 400 })

    const updated = await prisma.task.update({
        where: { id: params.id },
        data,
        include: INCLUDE,
    })
    return Response.json({ item: updated })
}

export async function DELETE(_request, { params }) {
    const { session, response } = await requireCrmSession()
    if (!session) return response

    const existing = await prisma.task.findUnique({ where: { id: params.id } })
    if (!existing) return Response.json({ error: "Не найдено" }, { status: 404 })

    if (!canCloseTask(existing, session)) {
        return Response.json({ error: "Нет прав на удаление этой задачи" }, { status: 403 })
    }

    await prisma.task.delete({ where: { id: params.id } })
    return Response.json({ ok: true })
}
