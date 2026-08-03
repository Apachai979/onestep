import prisma from "@/lib/client"
import { requireCrmSession } from "@/lib/crm/session"
import {
    DEAL_KANBAN_PER_STATUS,
    DEAL_KANBAN_STATUSES,
    DEAL_STATUSES,
    DEAL_STATUS_NEEDS_ITEMS_ERROR,
    DEAL_TRACKED_FIELDS,
    autoArchiveStaleCancelledDeals,
    dealDiscountedTotal,
    dealKanbanOrderField,
    dealStatusRequiresItems,
    matchesDealSearch,
    parseDealPayload,
} from "@/lib/crm/deal"
import { logChange, snapshotEntity } from "@/lib/crm/change-log"
import { dealProjectPartiesError } from "@/lib/crm/access"
import { inheritedDealDiscount } from "@/lib/crm/discount"

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

const DEAL_INCLUDE = {
    counterparty: { select: COUNTERPARTY_SELECT },
    payer: { select: { id: true, name: true, inn: true } },
    // Сделка из проекта берёт название из него же — см. dealDisplayTitle.
    sourceProject: { select: { id: true, internalName: true } },
    manager: { select: MANAGER_SELECT },
    createdBy: { select: MANAGER_SELECT },
    contact: { select: CONTACT_SELECT },
    items: { select: { id: true, quantity: true } },
    // Только открытые задачи — доска подсвечивает сделки, по которым не
    // запланирован следующий шаг (см. isDealAbandoned).
    tasks: { where: { status: "OPEN" }, select: { id: true } },
    shipments: {
        select: {
            id: true,
            status: true,
            plannedDate: true,
            items: { select: { id: true, dealItemId: true, quantity: true } },
        },
    },
}

// Лёгкий срез для подсчёта колонок канбана: только поля, нужные для поиска,
// сортировки и итоговой суммы. Позиции и отгрузки здесь не нужны — они тянутся
// вторым запросом, и только для тех карточек, которые реально попадут на доску.
const DEAL_KANBAN_STATS_SELECT = {
    id: true,
    status: true,
    title: true,
    totalAmount: true,
    discount: true,
    createdAt: true,
    updatedAt: true,
    counterparty: { select: { name: true } },
    payer: { select: { name: true, inn: true } },
    sourceProject: { select: { internalName: true } },
}

// Доска отдаётся колонками: items — первая страница карточек, total и sum —
// по всей колонке. Без этого счётчик над колонкой показывал бы «сколько
// загрузили», а «Итого» считалось бы по обрезанному набору.
async function loadKanbanColumns(where, q, perStatus) {
    const rows = await prisma.deal.findMany({
        where: { ...where, status: { in: DEAL_KANBAN_STATUSES } },
        select: DEAL_KANBAN_STATS_SELECT,
    })

    const columns = Object.fromEntries(
        DEAL_KANBAN_STATUSES.map(s => [s, { items: [], total: 0, sum: 0 }]),
    )
    const grouped = Object.fromEntries(DEAL_KANBAN_STATUSES.map(s => [s, []]))

    for (const row of rows) {
        if (!columns[row.status]) continue
        if (!matchesDealSearch(row, q)) continue
        columns[row.status].total += 1
        columns[row.status].sum += dealDiscountedTotal(row)
        grouped[row.status].push(row)
    }

    const pageIds = []
    const idsByStatus = {}
    for (const status of DEAL_KANBAN_STATUSES) {
        const field = dealKanbanOrderField(status)
        idsByStatus[status] = grouped[status]
            .sort((a, b) => b[field] - a[field])
            .slice(0, perStatus)
            .map(r => r.id)
        pageIds.push(...idsByStatus[status])
    }

    if (pageIds.length) {
        const full = await prisma.deal.findMany({
            where: { id: { in: pageIds } },
            include: DEAL_INCLUDE,
        })
        const byId = new Map(full.map(d => [d.id, d]))
        for (const status of DEAL_KANBAN_STATUSES) {
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
    const counterpartyId = searchParams.get("counterpartyId")
    const managerId = searchParams.get("managerId")
    const isAuction = searchParams.get("isAuction")
    const q = searchParams.get("q")?.trim()
    // view=kanban — доска: колонки со своей страницей карточек вместо плоского
    // списка. Список сделок и селекты в формах ходят сюда же и получают items.
    const kanban = searchParams.get("view") === "kanban"
    const perStatus = Math.min(
        100,
        Math.max(1, Number(searchParams.get("perStatus")) || DEAL_KANBAN_PER_STATUS),
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
        if (statuses.some(s => !DEAL_STATUSES.includes(s))) {
            return Response.json({ error: "Некорректный статус" }, { status: 400 })
        }
        where.status = statuses.length === 1 ? statuses[0] : { in: statuses }
    }
    if (counterpartyId) where.counterpartyId = counterpartyId
    if (managerId) where.managerId = managerId
    if (isAuction === "true") where.isAuction = true
    else if (isAuction === "false") where.isAuction = false

    // Ленивая архивация: старые CANCELLED → ARCHIVED. Одна короткая
    // UPDATE-строка, чтобы Kanban/список не приходилось чистить руками.
    await autoArchiveStaleCancelledDeals(prisma)

    if (kanban) {
        // Фильтр по статусу на доске игнорируется намеренно: статусы здесь —
        // это сами колонки (см. buildQuery в DealsTabs).
        const { status: _status, ...kanbanWhere } = where
        const columns = await loadKanbanColumns(kanbanWhere, q, perStatus)
        return Response.json({ columns, perStatus })
    }

    const items = await prisma.deal.findMany({
        where,
        orderBy: { createdAt: "desc" },
        include: DEAL_INCLUDE,
    })

    const filtered = q ? items.filter(d => matchesDealSearch(d, q)) : items

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
        select: {
            id: true,
            type: true,
            // Нужны для наследования скидки, когда её не задали в проекте.
            discount: true,
            group: { select: { name: true, discount: true } },
        },
    })
    if (!cp) return Response.json({ error: "Клиент не найден" }, { status: 400 })

    // Скидка: форма создания её не присылает — значение наследуется по цепочке
    // проект → клиент/группа (см. lib/crm/discount.js). Это снимок: дальше
    // сделка живёт со своей скидкой и за карточкой клиента не следует.
    if (data.discount === undefined) {
        data.discount = inheritedDealDiscount(sourceProject, cp).value
    }

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

    // Новая сделка получает позиции только из проекта-источника, поэтому создать
    // её сразу в «Согласовано / Позиции» можно лишь по проекту с позициями.
    if (dealStatusRequiresItems(data.status) && sourceItems.length === 0) {
        return Response.json({ error: DEAL_STATUS_NEEDS_ITEMS_ERROR }, { status: 400 })
    }

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
