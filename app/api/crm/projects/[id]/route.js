import prisma from "@/lib/client"
import { requireCrmSession } from "@/lib/crm/session"
import { parseProjectPayload, buildInternalName } from "@/lib/crm/project"

const COUNTERPARTY_SELECT = { id: true, name: true, type: true, region: true }
const MANAGER_SELECT = { id: true, firstName: true, lastName: true, email: true }

export async function GET(_request, { params }) {
    const { session, response } = await requireCrmSession()
    if (!session) return response

    const item = await prisma.project.findUnique({
        where: { id: params.id },
        include: {
            distributor: { select: COUNTERPARTY_SELECT },
            endCustomer: { select: COUNTERPARTY_SELECT },
            manager: { select: MANAGER_SELECT },
            items: { orderBy: { createdAt: "asc" } },
            contacts: { orderBy: [{ lastName: "asc" }, { firstName: "asc" }] },
        },
    })
    if (!item) return Response.json({ error: "Не найдено" }, { status: 404 })
    return Response.json({ item })
}

export async function PATCH(request, { params }) {
    const { session, response } = await requireCrmSession()
    if (!session) return response

    const existing = await prisma.project.findUnique({ where: { id: params.id } })
    if (!existing) return Response.json({ error: "Не найдено" }, { status: 404 })

    let body
    try {
        body = await request.json()
    } catch {
        return Response.json({ error: "Некорректный JSON" }, { status: 400 })
    }

    const { data, error } = parseProjectPayload(body, { partial: true })
    if (error) return Response.json({ error }, { status: 400 })

    if (data.distributorId) {
        const d = await prisma.counterparty.findUnique({
            where: { id: data.distributorId },
            select: { type: true },
        })
        if (!d || d.type !== "DISTRIBUTOR") {
            return Response.json({ error: "Дистрибьютор не найден" }, { status: 400 })
        }
    }
    if (data.endCustomerId) {
        const c = await prisma.counterparty.findUnique({
            where: { id: data.endCustomerId },
            select: { type: true },
        })
        if (!c || c.type !== "END_CUSTOMER") {
            return Response.json({ error: "Конечный потребитель не найден" }, { status: 400 })
        }
    }
    if (data.managerId) {
        const m = await prisma.user.findUnique({
            where: { id: data.managerId },
            select: { status: true },
        })
        if (!m || m.status !== "ACTIVE") {
            return Response.json({ error: "Менеджер не найден" }, { status: 400 })
        }
    }

    if (data.internalName === null || data.internalName === "") {
        const distributorId = data.distributorId ?? existing.distributorId
        const endCustomerId = data.endCustomerId ?? existing.endCustomerId
        const [d, c] = await Promise.all([
            prisma.counterparty.findUnique({
                where: { id: distributorId },
                select: { name: true },
            }),
            prisma.counterparty.findUnique({
                where: { id: endCustomerId },
                select: { name: true },
            }),
        ])
        data.internalName = buildInternalName(d?.name, c?.name)
    }

    const { contactIds, ...scalar } = data

    let contactsSet
    if (contactIds !== undefined) {
        const distributorId = scalar.distributorId ?? existing.distributorId
        const endCustomerId = scalar.endCustomerId ?? existing.endCustomerId
        const valid = await prisma.contact.findMany({
            where: {
                id: { in: contactIds },
                counterpartyId: { in: [distributorId, endCustomerId] },
            },
            select: { id: true },
        })
        contactsSet = valid.map(c => ({ id: c.id }))
    }

    const updated = await prisma.project.update({
        where: { id: params.id },
        data: {
            ...scalar,
            contacts: contactsSet !== undefined ? { set: contactsSet } : undefined,
        },
        include: {
            distributor: { select: COUNTERPARTY_SELECT },
            endCustomer: { select: COUNTERPARTY_SELECT },
            manager: { select: MANAGER_SELECT },
            items: true,
            contacts: { orderBy: [{ lastName: "asc" }, { firstName: "asc" }] },
        },
    })
    return Response.json({ item: updated })
}
