import prisma from "@/lib/client"
import { requireCrmSession } from "@/lib/crm/session"
import { AUCTION_TRACKED_FIELDS, parseAuctionPayload } from "@/lib/crm/auction"
import { logChange, snapshotEntity } from "@/lib/crm/change-log"

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
    customerContact: { select: CONTACT_SELECT },
    supplier: { select: CP_SELECT },
    supplierContact: { select: CONTACT_SELECT },
    manager: { select: USER_SELECT },
}

export async function GET(request) {
    const { session, response } = await requireCrmSession()
    if (!session) return response

    const { searchParams } = new URL(request.url)
    const projectId = searchParams.get("projectId")
    const status = searchParams.get("status")
    const managerId = searchParams.get("managerId")
    const q = searchParams.get("q")?.trim()

    const where = {}
    if (projectId) where.projectId = projectId
    if (status) where.status = status
    if (managerId) where.managerId = managerId

    const items = await prisma.auction.findMany({
        where,
        orderBy: { createdAt: "desc" },
        include: INCLUDE,
    })

    // Кириллический поиск — в JS (SQLite LIKE регистрозависим).
    const filtered = q
        ? items.filter(a => {
              const ql = q.toLowerCase()
              return (
                  (a.purchaseNumber || "").toLowerCase().includes(ql) ||
                  (a.customer?.name || "").toLowerCase().includes(ql) ||
                  (a.supplier?.name || "").toLowerCase().includes(ql) ||
                  (a.winner || "").toLowerCase().includes(ql)
              )
          })
        : items

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

    const { data, error } = parseAuctionPayload(body)
    if (error) return Response.json({ error }, { status: 400 })

    const project = await prisma.project.findUnique({
        where: { id: data.projectId },
        select: { id: true },
    })
    if (!project) return Response.json({ error: "Проект не найден" }, { status: 400 })

    for (const [key, label] of [
        ["customerId", "Заказчик"],
        ["supplierId", "Поставщик"],
    ]) {
        const cp = await prisma.counterparty.findUnique({
            where: { id: data[key] },
            select: { id: true },
        })
        if (!cp) return Response.json({ error: `${label} не найден` }, { status: 400 })
    }

    const manager = await prisma.user.findUnique({
        where: { id: data.managerId },
        select: { status: true },
    })
    if (!manager || manager.status !== "ACTIVE") {
        return Response.json({ error: "Менеджер не найден" }, { status: 400 })
    }

    if (data.supplierContactId) {
        const c = await prisma.contact.findUnique({
            where: { id: data.supplierContactId },
            select: { counterpartyId: true },
        })
        if (!c || c.counterpartyId !== data.supplierId) {
            return Response.json(
                { error: "Контакт не принадлежит поставщику" },
                { status: 400 },
            )
        }
    }

    if (data.customerContactId) {
        const c = await prisma.contact.findUnique({
            where: { id: data.customerContactId },
            select: { counterpartyId: true },
        })
        if (!c || c.counterpartyId !== data.customerId) {
            return Response.json(
                { error: "Контакт не принадлежит заказчику" },
                { status: 400 },
            )
        }
    }

    const created = await prisma.$transaction(async tx => {
        const auction = await tx.auction.create({
            data: { ...data, createdById: session.user.id ?? null },
            include: INCLUDE,
        })
        await logChange(tx, {
            entityType: "Auction",
            entityId: auction.id,
            parentEntityType: "Project",
            parentEntityId: auction.projectId,
            action: "CREATE",
            payload: snapshotEntity(auction, AUCTION_TRACKED_FIELDS),
            authorId: session.user.id,
        })
        return auction
    })

    return Response.json({ item: created }, { status: 201 })
}
