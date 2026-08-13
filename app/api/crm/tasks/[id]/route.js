import prisma from "@/lib/client"
import { requireCrmSession } from "@/lib/crm/session"
import {
    canManageTask,
    parseTaskPayload,
    parseTaskResultPayload,
    taskLogParents,
} from "@/lib/crm/task"
import { diffEntities, logChange } from "@/lib/crm/change-log"
import { notifyTaskAssigned } from "@/lib/crm/notify-task"

const TASK_LOG_FIELDS = ["title", "type", "status", "result", "assigneeId", "startAt", "endAt"]

const USER_SELECT = { id: true, firstName: true, lastName: true, email: true }
const CP_SELECT = { id: true, name: true, type: true }

const INCLUDE = {
    assignee: { select: USER_SELECT },
    createdBy: { select: USER_SELECT },
    deal: {
        select: {
            id: true,
            title: true,
            counterparty: { select: CP_SELECT },
            sourceProject: { select: { internalName: true } },
        },
    },
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

    if (!canManageTask(existing, session)) {
        return Response.json(
            { error: "Менять задачу может ответственный, создатель или администратор" },
            { status: 403 },
        )
    }

    let body
    try {
        body = await request.json()
    } catch {
        return Response.json({ error: "Некорректный JSON" }, { status: 400 })
    }

    // У закрытой задачи правится только комментарий о результате — срок,
    // ответственного и тип менять поздно, для этого заводят новую задачу.
    const parsed =
        existing.status === "OPEN"
            ? // existing нужен парсеру: без него PATCH с одним только сроком не знает
              // ни даты начала, ни того, задача «на весь день» или со временем.
              parseTaskPayload(body, { partial: true, current: existing })
            : parseTaskResultPayload(body, existing)
    const { data, error } = parsed
    if (error) return Response.json({ error }, { status: 400 })

    const updated = await prisma.task.update({
        where: { id: params.id },
        data,
        include: INCLUDE,
    })

    const changes = diffEntities(existing, updated, TASK_LOG_FIELDS)
    if (Object.keys(changes).length > 0) {
        for (const parent of taskLogParents(updated)) {
            await logChange(prisma, {
                entityType: "Task",
                entityId: updated.id,
                ...parent,
                action: "UPDATE",
                payload: { title: updated.title, ...changes },
                authorId: session.user.id,
            })
        }
    }

    // Задачу передали другому — новый ответственный узнаёт об этом письмом.
    if (updated.assigneeId !== existing.assigneeId) {
        void notifyTaskAssigned({
            task: updated,
            actorId: session.user.id,
            event: "reassigned",
        })
    }

    return Response.json({ item: updated })
}

export async function DELETE(_request, { params }) {
    const { session, response } = await requireCrmSession()
    if (!session) return response

    const existing = await prisma.task.findUnique({ where: { id: params.id } })
    if (!existing) return Response.json({ error: "Не найдено" }, { status: 404 })

    if (!canManageTask(existing, session)) {
        return Response.json({ error: "Нет прав на удаление этой задачи" }, { status: 403 })
    }

    await prisma.task.delete({ where: { id: params.id } })

    for (const parent of taskLogParents(existing)) {
        await logChange(prisma, {
            entityType: "Task",
            entityId: existing.id,
            ...parent,
            action: "DELETE",
            payload: { title: existing.title, type: existing.type },
            authorId: session.user.id,
        })
    }

    return Response.json({ ok: true })
}
