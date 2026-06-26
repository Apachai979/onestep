import prisma from "@/lib/client"
import { requireCrmSession } from "@/lib/crm/session"
import {
    PROJECT_STATUSES,
    PROJECT_TRACKED_FIELDS,
    buildInternalName,
    parseProjectPayload,
} from "@/lib/crm/project"
import { logChange, snapshotEntity } from "@/lib/crm/change-log"

const COUNTERPARTY_SELECT = { id: true, name: true, type: true, region: true }
const MANAGER_SELECT = { id: true, firstName: true, lastName: true, email: true }

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
    const dateFrom = searchParams.get("dateFrom")
    const dateTo = searchParams.get("dateTo")

    const where = {}
    if (status) {
        if (!PROJECT_STATUSES.includes(status)) {
            return Response.json({ error: "Некорректный статус" }, { status: 400 })
        }
        where.status = status
    }
    if (customerId) where.endCustomerId = customerId
    if (distributorId) where.distributorId = distributorId
    if (managerId) where.managerId = managerId
    if (dateFrom || dateTo) {
        where.auctionDate = {}
        if (dateFrom) where.auctionDate.gte = new Date(`${dateFrom}T00:00:00.000Z`)
        if (dateTo) where.auctionDate.lte = new Date(`${dateTo}T23:59:59.999Z`)
    }

    const items = await prisma.project.findMany({
        where,
        orderBy: { createdAt: "desc" },
        include: {
            distributor: { select: COUNTERPARTY_SELECT },
            endCustomer: { select: COUNTERPARTY_SELECT },
            manager: { select: MANAGER_SELECT },
        },
    })

    const filtered = items.filter(p => {
        if (q) {
            const ql = q.toLowerCase()
            const matchQ =
                (p.externalAuctionId || "").toLowerCase().includes(ql) ||
                (p.internalName || "").toLowerCase().includes(ql)
            if (!matchQ) return false
        }
        if (region) {
            const rl = region.toLowerCase()
            const matchR =
                (p.distributor?.region || "").toLowerCase().includes(rl) ||
                (p.endCustomer?.region || "").toLowerCase().includes(rl)
            if (!matchR) return false
        }
        return true
    })

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

    const { data, error } = parseProjectPayload(body)
    if (error) return Response.json({ error }, { status: 400 })

    const [distributor, endCustomer, manager] = await Promise.all([
        prisma.counterparty.findUnique({
            where: { id: data.distributorId },
            select: { id: true, name: true, type: true },
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

    if (status === "IN_PROGRESS") {
        const duplicate = await prisma.project.findFirst({
            where: {
                status: "IN_PROGRESS",
                externalAuctionId: data.externalAuctionId,
                endCustomerId: data.endCustomerId,
            },
            include: {
                distributor: { select: { id: true, name: true } },
                manager: { select: { firstName: true, lastName: true, email: true } },
            },
        })

        if (duplicate && duplicate.distributorId !== data.distributorId) {
            const force = body.forceCreate === true
            if (!force) {
                return Response.json(
                    {
                        error: "duplicate",
                        duplicate: {
                            id: duplicate.id,
                            internalName: duplicate.internalName,
                            distributor: duplicate.distributor,
                            manager: duplicate.manager,
                        },
                    },
                    { status: 409 },
                )
            }
            if (!data.duplicateComment) {
                return Response.json(
                    { error: "Укажите комментарий о дубликате" },
                    { status: 400 },
                )
            }
        }
    }

    const internalName =
        data.internalName?.trim() || buildInternalName(distributor.name, endCustomer.name)

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
                externalAuctionId: data.externalAuctionId,
                internalName,
                status,
                totalAmount: data.totalAmount ?? "0",
                auctionDate: data.auctionDate ?? null,
                duplicateComment: data.duplicateComment ?? null,
                distributorId: data.distributorId,
                endCustomerId: data.endCustomerId,
                managerId: data.managerId,
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
