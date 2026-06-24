import prisma from "@/lib/client"
import { requireCrmSession } from "@/lib/crm/session"
import { DEAL_STATUSES, parseDealPayload } from "@/lib/crm/deal"

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

export async function GET(request) {
    const { session, response } = await requireCrmSession()
    if (!session) return response

    const { searchParams } = new URL(request.url)
    const status = searchParams.get("status")
    const counterpartyId = searchParams.get("counterpartyId")
    const managerId = searchParams.get("managerId")
    const q = searchParams.get("q")?.trim()

    const where = {}
    if (status) {
        if (!DEAL_STATUSES.includes(status)) {
            return Response.json({ error: "Некорректный статус" }, { status: 400 })
        }
        where.status = status
    }
    if (counterpartyId) where.counterpartyId = counterpartyId
    if (managerId) where.managerId = managerId

    const items = await prisma.deal.findMany({
        where,
        orderBy: { createdAt: "desc" },
        include: {
            counterparty: { select: COUNTERPARTY_SELECT },
            manager: { select: MANAGER_SELECT },
            createdBy: { select: MANAGER_SELECT },
            contact: { select: CONTACT_SELECT },
        },
    })

    const filtered = q
        ? items.filter(d => {
              const ql = q.toLowerCase()
              const title = (d.title || "").toLowerCase()
              const cp = (d.counterparty?.name || "").toLowerCase()
              return title.includes(ql) || cp.includes(ql)
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

    const { data, error } = parseDealPayload(body)
    if (error) return Response.json({ error }, { status: 400 })

    const cp = await prisma.counterparty.findUnique({
        where: { id: data.counterpartyId },
        select: { id: true, type: true },
    })
    if (!cp) return Response.json({ error: "Клиент не найден" }, { status: 400 })

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

    const manager = await prisma.user.findUnique({
        where: { id: data.managerId },
        select: { status: true },
    })
    if (!manager || manager.status !== "ACTIVE") {
        return Response.json({ error: "Менеджер не найден" }, { status: 400 })
    }

    const created = await prisma.deal.create({
        data: {
            title: data.title ?? null,
            status: data.status || "NEW",
            totalAmount: data.totalAmount ?? "0",
            note: data.note ?? null,
            counterpartyId: data.counterpartyId,
            contactId: data.contactId ?? null,
            managerId: data.managerId,
            createdById: session.user.id,
        },
        include: {
            counterparty: { select: COUNTERPARTY_SELECT },
            manager: { select: MANAGER_SELECT },
            createdBy: { select: MANAGER_SELECT },
            contact: { select: CONTACT_SELECT },
        },
    })
    return Response.json({ item: created }, { status: 201 })
}
