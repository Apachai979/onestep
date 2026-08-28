import prisma from "@/lib/client"
import { requireCrmSession } from "@/lib/crm/session"
import {
    PROJECT_KANBAN_PER_STATUS,
    PROJECT_STATUSES,
    PROJECT_TRACKED_FIELDS,
    buildInternalName,
    findProjectDuplicates,
    isBlockingDuplicate,
    matchesProjectRegion,
    matchesProjectSearch,
    parseProjectPayload,
    projectDealSums,
    projectKanbanOrderField,
} from "@/lib/crm/project"
import { logChange, snapshotEntity } from "@/lib/crm/change-log"
import { counterpartyDiscountInfo } from "@/lib/crm/discount"

const COUNTERPARTY_SELECT = { id: true, name: true, type: true, region: true, inn: true }
const MANAGER_SELECT = { id: true, firstName: true, lastName: true, email: true }

const PROJECT_INCLUDE = {
    distributor: { select: COUNTERPARTY_SELECT },
    endCustomer: { select: COUNTERPARTY_SELECT },
    manager: { select: MANAGER_SELECT },
}

// Лёгкий срез для подсчёта колонок канбана: только поля, нужные для поиска,
// фильтра по региону, сортировки и суммы.
const PROJECT_KANBAN_STATS_SELECT = {
    id: true,
    status: true,
    internalName: true,
    createdAt: true,
    updatedAt: true,
    distributor: { select: { name: true, region: true, inn: true } },
    endCustomer: { select: { name: true, region: true, inn: true } },
}

// Доска отдаётся колонками: items — первая страница карточек, total и sum —
// по всей колонке. Иначе счётчик показывал бы «сколько загрузили», а «Итого»
// считалось бы по обрезанному набору.
async function loadKanbanColumns(where, { q, region, perStatus }) {
    const rows = await prisma.project.findMany({
        where,
        select: PROJECT_KANBAN_STATS_SELECT,
    })
    const matched = rows.filter(
        p => matchesProjectSearch(p, q) && matchesProjectRegion(p, region),
    )
    // Суммы считаем по всем подходящим проектам, а не только по странице.
    const sums = await projectDealSums(prisma, matched.map(p => p.id))

    const columns = Object.fromEntries(
        PROJECT_STATUSES.map(s => [s, { items: [], total: 0, sum: 0 }]),
    )
    const grouped = Object.fromEntries(PROJECT_STATUSES.map(s => [s, []]))

    for (const row of matched) {
        if (!columns[row.status]) continue
        columns[row.status].total += 1
        columns[row.status].sum += sums.get(row.id) || 0
        grouped[row.status].push(row)
    }

    const pageIds = []
    const idsByStatus = {}
    for (const status of PROJECT_STATUSES) {
        const field = projectKanbanOrderField(status)
        idsByStatus[status] = grouped[status]
            .sort((a, b) => b[field] - a[field])
            .slice(0, perStatus)
            .map(p => p.id)
        pageIds.push(...idsByStatus[status])
    }

    if (pageIds.length) {
        const full = await prisma.project.findMany({
            where: { id: { in: pageIds } },
            include: PROJECT_INCLUDE,
        })
        const byId = new Map(full.map(p => [p.id, { ...p, totalAmount: sums.get(p.id) || 0 }]))
        for (const status of PROJECT_STATUSES) {
            columns[status].items = idsByStatus[status].map(id => byId.get(id)).filter(Boolean)
        }
    }

    return columns
}

export async function GET(request) {
    const { session, response } = await requireCrmSession()
    if (!session) return response

    const { searchParams } = new URL(request.url)
    const status = searchParams.get("status")
    const q = searchParams.get("q")?.trim()
    const customerId = searchParams.get("customerId")
    const distributorId = searchParams.get("distributorId")
    const managerId = searchParams.get("managerId")
    const region = searchParams.get("region")?.trim()
    // view=kanban — доска: колонки со своей страницей карточек вместо плоского
    // списка. Список проектов и селекты в формах ходят сюда же и получают items.
    const kanban = searchParams.get("view") === "kanban"
    const perStatus = Math.min(
        100,
        Math.max(1, Number(searchParams.get("perStatus")) || PROJECT_KANBAN_PER_STATUS),
    )

    const where = {}
    // Статус может прийти списком через запятую — фильтр в UI с множественным выбором.
    const statuses = status
        ? status
              .split(",")
              .map(s => s.trim())
              .filter(Boolean)
        : []
    if (statuses.length) {
        if (statuses.some(s => !PROJECT_STATUSES.includes(s))) {
            return Response.json({ error: "Некорректный статус" }, { status: 400 })
        }
        where.status = statuses.length === 1 ? statuses[0] : { in: statuses }
    }
    if (customerId) where.endCustomerId = customerId
    if (distributorId) where.distributorId = distributorId
    if (managerId) where.managerId = managerId

    if (kanban) {
        // Фильтр по статусу на доске игнорируется намеренно: статусы здесь —
        // это сами колонки (см. buildQuery в ProjectsTabs).
        const { status: _status, ...kanbanWhere } = where
        const columns = await loadKanbanColumns(kanbanWhere, { q, region, perStatus })
        return Response.json({ columns, perStatus })
    }

    const items = await prisma.project.findMany({
        where,
        orderBy: { createdAt: "desc" },
        include: PROJECT_INCLUDE,
    })

    const filtered = items.filter(
        p => matchesProjectSearch(p, q) && matchesProjectRegion(p, region),
    )

    const sums = await projectDealSums(prisma, filtered.map(p => p.id))

    return Response.json({
        items: filtered.map(p => ({
            ...p,
            totalAmount: sums.get(p.id) || 0,
            dealsCount: undefined,
        })),
    })
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

    const { data, error } = parseProjectPayload(body)
    if (error) return Response.json({ error }, { status: 400 })

    const [distributor, endCustomer, manager] = await Promise.all([
        prisma.counterparty.findUnique({
            where: { id: data.distributorId },
            select: {
                id: true,
                name: true,
                type: true,
                // Скидка дистрибьютора (или его группы) достаётся проекту, если
                // менеджер не задал свою.
                discount: true,
                group: { select: { name: true, discount: true } },
            },
        }),
        prisma.counterparty.findUnique({
            where: { id: data.endCustomerId },
            select: { id: true, name: true, type: true },
        }),
        prisma.user.findUnique({
            where: { id: data.managerId },
            select: { id: true, role: true, status: true },
        }),
    ])

    if (!distributor || distributor.type !== "DISTRIBUTOR") {
        return Response.json({ error: "Выбранный дистрибьютор не найден" }, { status: 400 })
    }
    if (!endCustomer || endCustomer.type !== "END_CUSTOMER") {
        return Response.json(
            { error: "Выбранный конечный потребитель не найден" },
            { status: 400 },
        )
    }
    if (!manager || manager.status !== "ACTIVE") {
        return Response.json({ error: "Выбранный менеджер не найден" }, { status: 400 })
    }

    const status = data.status || "IN_PROGRESS"

    // Проект, дублем которого создаётся этот: запоминаем, чтобы в карточке
    // можно было перейти к исходному.
    let duplicateOfId = null

    if (status === "IN_PROGRESS") {
        // Предупреждаем о любом проекте на того же потребителя — включая
        // закрытые «Проработано, нет потребности». Комментарий обязателен,
        // только если потребителя прямо сейчас ведёт другой дистрибьютор.
        const { items: duplicates, hasOtherDistributor } = await findProjectDuplicates(prisma, {
            endCustomerId: data.endCustomerId,
            distributorId: data.distributorId,
        })

        if (duplicates.length > 0) {
            if (body.forceCreate !== true) {
                return Response.json(
                    {
                        error: "duplicate",
                        requiresComment: hasOtherDistributor,
                        duplicates,
                    },
                    { status: 409 },
                )
            }
            if (hasOtherDistributor) {
                if (!data.duplicateComment) {
                    return Response.json(
                        { error: "Укажите комментарий о дубликате" },
                        { status: 400 },
                    )
                }
                duplicateOfId = duplicates.find(isBlockingDuplicate).id
            }
        }
    }

    const internalName =
        data.internalName?.trim() || buildInternalName(distributor.name, endCustomer.name)

    // Скидка: если форма её не прислала, наследуем от дистрибьютора (или его
    // группы) — снимок на момент создания, дальше проект живёт со своей.
    const discount =
        data.discount !== undefined
            ? data.discount
            : counterpartyDiscountInfo(distributor).value

    let contactsToConnect = []
    if (data.contactIds?.length) {
        const valid = await prisma.contact.findMany({
            where: {
                id: { in: data.contactIds },
                counterpartyId: { in: [data.distributorId, data.endCustomerId] },
            },
            select: { id: true },
        })
        contactsToConnect = valid.map(c => ({ id: c.id }))
    }

    const created = await prisma.$transaction(async tx => {
        const project = await tx.project.create({
            data: {
                internalName,
                status,
                discount,
                // Комментарий имеет смысл только вместе с исходным проектом.
                duplicateComment: duplicateOfId ? (data.duplicateComment ?? null) : null,
                duplicateOfId,
                distributorId: data.distributorId,
                endCustomerId: data.endCustomerId,
                managerId: data.managerId,
                createdById: session.user.id,
                contacts: contactsToConnect.length
                    ? { connect: contactsToConnect }
                    : undefined,
            },
            include: {
                distributor: { select: COUNTERPARTY_SELECT },
                endCustomer: { select: COUNTERPARTY_SELECT },
                manager: { select: MANAGER_SELECT },
                contacts: true,
            },
        })
        await logChange(tx, {
            entityType: "Project",
            entityId: project.id,
            action: "CREATE",
            payload: snapshotEntity(project, PROJECT_TRACKED_FIELDS),
            authorId: session.user.id,
        })
        return project
    })

    return Response.json({ item: created }, { status: 201 })
}
