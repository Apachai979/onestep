import prisma from "@/lib/client"
import { requireCrmSession } from "@/lib/crm/session"
import { canCloseTask, parseCloseTaskPayload } from "@/lib/crm/task"

export async function POST(request, { params }) {
    const { session, response } = await requireCrmSession()
    if (!session) return response

    const existing = await prisma.task.findUnique({ where: { id: params.id } })
    if (!existing) return Response.json({ error: "Не найдено" }, { status: 404 })

    if (!canCloseTask(existing, session)) {
        return Response.json(
            { error: "Закрыть задачу может ответственный, создатель или администратор" },
            { status: 403 },
        )
    }

    if (existing.status !== "OPEN") {
        return Response.json({ error: "Задача уже закрыта" }, { status: 400 })
    }

    let body
    try {
        body = await request.json()
    } catch {
        return Response.json({ error: "Некорректный JSON" }, { status: 400 })
    }

    const { data, error } = parseCloseTaskPayload(body)
    if (error) return Response.json({ error }, { status: 400 })

    const updated = await prisma.task.update({
        where: { id: params.id },
        data: { status: data.status, result: data.result, closedAt: new Date() },
    })
    return Response.json({ item: updated })
}

export async function DELETE(_request, { params }) {
    const { session, response } = await requireCrmSession()
    if (!session) return response

    const existing = await prisma.task.findUnique({ where: { id: params.id } })
    if (!existing) return Response.json({ error: "Не найдено" }, { status: 404 })
    if (!canCloseTask(existing, session)) {
        return Response.json({ error: "Нет прав" }, { status: 403 })
    }
    if (existing.status === "OPEN") {
        return Response.json({ error: "Задача и так открыта" }, { status: 400 })
    }
    const updated = await prisma.task.update({
        where: { id: params.id },
        data: { status: "OPEN", result: null, closedAt: null },
    })
    return Response.json({ item: updated })
}
