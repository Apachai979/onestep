import prisma from "@/lib/client"
import { requireCrmSession } from "@/lib/crm/session"
import {
    COUNTERPARTY_TYPE_LABELS,
    TYPE_ONLY_FIELDS,
    oppositeCounterpartyType,
} from "@/lib/crm/counterparty"
import { diffEntities, logChange } from "@/lib/crm/change-log"

const PREVIEW_LIMIT = 5

// Что уже связано с контрагентом в его текущей роли. Смена типа эти связи не
// рвёт (исторические проекты/задачи остаются), но роль в них перестанет
// совпадать с типом карточки — поэтому показываем это перед подтверждением.
async function collectLinks(item) {
    const isDistributor = item.type === "DISTRIBUTOR"
    const projectWhere = isDistributor
        ? { distributorId: item.id }
        : { endCustomerId: item.id }
    const taskWhere = isDistributor ? { distributorId: item.id } : { endCustomerId: item.id }

    const [projectsCount, projects, tasksCount, auctionDealsCount] = await Promise.all([
        prisma.project.count({ where: projectWhere }),
        prisma.project.findMany({
            where: projectWhere,
            orderBy: { createdAt: "desc" },
            take: PREVIEW_LIMIT,
            select: { id: true, internalName: true, status: true },
        }),
        prisma.task.count({ where: taskWhere }),
        // Заказчик аукциона — по смыслу конечный потребитель.
        isDistributor ? 0 : prisma.deal.count({ where: { auctionCustomerId: item.id } }),
    ])

    return { projectsCount, projects, tasksCount, auctionDealsCount }
}

function buildPreview(item) {
    const targetType = oppositeCounterpartyType(item.type)
    const clearedFields = (TYPE_ONLY_FIELDS[item.type] || []).filter(f => item[f])
    return { targetType, clearedFields }
}

export async function GET(_request, { params }) {
    const { session, response } = await requireCrmSession()
    if (!session) return response

    const item = await prisma.counterparty.findUnique({
        where: { id: params.id },
        select: {
            id: true,
            name: true,
            type: true,
            companyKind: true,
            activityArea: true,
        },
    })
    if (!item) return Response.json({ error: "Не найдено" }, { status: 404 })

    const links = await collectLinks(item)
    const { targetType, clearedFields } = buildPreview(item)

    return Response.json({
        id: item.id,
        name: item.name,
        currentType: item.type,
        currentTypeLabel: COUNTERPARTY_TYPE_LABELS[item.type],
        targetType,
        targetTypeLabel: COUNTERPARTY_TYPE_LABELS[targetType],
        clearedFields,
        links,
    })
}

export async function POST(request, { params }) {
    const { session, response } = await requireCrmSession()
    if (!session) return response

    const existing = await prisma.counterparty.findUnique({ where: { id: params.id } })
    if (!existing) return Response.json({ error: "Не найдено" }, { status: 404 })

    let body = {}
    try {
        body = (await request.json()) || {}
    } catch {
        body = {}
    }

    const targetType = oppositeCounterpartyType(existing.type)
    // Клиент присылает ожидаемый тип — защита от гонки (карточку успели
    // переключить в другой вкладке).
    if (body.targetType && body.targetType !== targetType) {
        return Response.json(
            { error: `Контрагент уже ${COUNTERPARTY_TYPE_LABELS[existing.type]}` },
            { status: 409 },
        )
    }

    const data = { type: targetType, updatedById: session.user.id ?? null }
    for (const field of TYPE_ONLY_FIELDS[existing.type] || []) {
        data[field] = null
    }

    try {
        const updated = await prisma.$transaction(async tx => {
            const cp = await tx.counterparty.update({ where: { id: params.id }, data })
            const changes = diffEntities(existing, cp, [
                "type",
                ...(TYPE_ONLY_FIELDS[existing.type] || []),
            ])
            await logChange(tx, {
                entityType: "Counterparty",
                entityId: cp.id,
                action: "UPDATE",
                payload: changes,
                authorId: session.user.id,
            })
            return cp
        })
        return Response.json({ item: updated })
    } catch (err) {
        console.error("[counterparties.convert] error:", err)
        return Response.json({ error: `Ошибка смены типа: ${err.message}` }, { status: 500 })
    }
}
