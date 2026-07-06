import prisma from "@/lib/client"
import { requireCrmSession } from "@/lib/crm/session"
import {
    TASK_STATUSES,
    TASK_TYPE_KEYS,
    TASK_RELATION_KINDS,
    parseTaskPayload,
    taskLogParents,
} from "@/lib/crm/task"
import { logChange } from "@/lib/crm/change-log"

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

export async function GET(request) {
    const { session, response } = await requireCrmSession()
    if (!session) return response

    const { searchParams } = new URL(request.url)
    const status = searchParams.get("status")
    const type = searchParams.get("type")
    const assigneeId = searchParams.get("assigneeId")
    const mine = searchParams.get("mine") === "1"
    const dateFrom = searchParams.get("from")
    const dateTo = searchParams.get("to")
    const dealId = searchParams.get("dealId")
    const projectId = searchParams.get("projectId")
    const counterpartyId = searchParams.get("counterpartyId")

    const where = {}
    if (status) {
        if (!TASK_STATUSES.includes(status)) {
            return Response.json({ error: "Некорректный статус" }, { status: 400 })
        }
        where.status = status
    }
    if (type) {
        if (!TASK_TYPE_KEYS.includes(type)) {
            return Response.json({ error: "Некорректный тип" }, { status: 400 })
        }
        where.type = type
    }
    if (mine) where.assigneeId = session.user.id
    else if (assigneeId) where.assigneeId = assigneeId

    if (dealId) where.dealId = dealId
    if (projectId) where.projectId = projectId
    if (counterpartyId) {
        where.OR = [{ distributorId: counterpartyId }, { endCustomerId: counterpartyId }]
    }

    if (dateFrom || dateTo) {
        where.AND = where.AND || []
        if (dateFrom) {
            where.AND.push({ endAt: { gte: new Date(`${dateFrom}T00:00:00.000Z`) } })
        }
        if (dateTo) {
            where.AND.push({ startAt: { lte: new Date(`${dateTo}T23:59:59.999Z`) } })
        }
    }

    const items = await prisma.task.findMany({
        where,
        orderBy: [{ status: "asc" }, { startAt: "asc" }],
        include: INCLUDE,
    })
    return Response.json({ items })
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

    const { data, error } = parseTaskPayload(body)
    if (error) return Response.json({ error }, { status: 400 })

    const assignee = await prisma.user.findUnique({
        where: { id: data.assigneeId },
        select: { status: true },
    })
    if (!assignee || assignee.status !== "ACTIVE") {
        return Response.json({ error: "Ответственный не найден" }, { status: 400 })
    }

    for (const k of TASK_RELATION_KINDS) {
        const id = data[`${k}Id`]
        if (!id) continue
        if (k === "deal") {
            const e = await prisma.deal.findUnique({ where: { id }, select: { id: true } })
            if (!e) return Response.json({ error: "Сделка не найдена" }, { status: 400 })
        } else if (k === "project") {
            const e = await prisma.project.findUnique({ where: { id }, select: { id: true } })
            if (!e) return Response.json({ error: "Проект не найден" }, { status: 400 })
        } else if (k === "distributor") {
            const e = await prisma.counterparty.findUnique({
                where: { id },
                select: { type: true },
            })
            if (!e || e.type !== "DISTRIBUTOR") {
                return Response.json({ error: "Дистрибьютор не найден" }, { status: 400 })
            }
        } else if (k === "endCustomer") {
            const e = await prisma.counterparty.findUnique({
                where: { id },
                select: { type: true },
            })
            if (!e || e.type !== "END_CUSTOMER") {
                return Response.json(
                    { error: "Конечный потребитель не найден" },
                    { status: 400 },
                )
            }
        }
    }

    const created = await prisma.task.create({
        data: {
            title: data.title,
            description: data.description ?? null,
            type: data.type,
            allDay: data.allDay ?? true,
            startAt: data.startAt,
            endAt: data.endAt,
            assigneeId: data.assigneeId,
            createdById: session.user.id,
            dealId: data.dealId ?? null,
            projectId: data.projectId ?? null,
            distributorId: data.distributorId ?? null,
            endCustomerId: data.endCustomerId ?? null,
        },
        include: INCLUDE,
    })

    for (const parent of taskLogParents(created)) {
        await logChange(prisma, {
            entityType: "Task",
            entityId: created.id,
            ...parent,
            action: "CREATE",
            payload: { title: created.title, type: created.type },
            authorId: session.user.id,
        })
    }

    return Response.json({ item: created }, { status: 201 })
}
