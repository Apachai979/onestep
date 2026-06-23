import prisma from "@/lib/client"
import { requireCrmSession } from "@/lib/crm/session"
import { parseCounterpartyPayload } from "@/lib/crm/counterparty"

export async function GET(_request, { params }) {
    const { session, response } = await requireCrmSession()
    if (!session) return response

    const item = await prisma.counterparty.findUnique({
        where: { id: params.id },
        include: {
            createdBy: { select: { id: true, firstName: true, lastName: true, email: true } },
            contacts: { orderBy: [{ isPrimary: "desc" }, { lastName: "asc" }, { firstName: "asc" }] },
        },
    })
    if (!item) return Response.json({ error: "Не найдено" }, { status: 404 })
    return Response.json({ item })
}

export async function PATCH(request, { params }) {
    const { session, response } = await requireCrmSession()
    if (!session) return response

    const existing = await prisma.counterparty.findUnique({ where: { id: params.id } })
    if (!existing) return Response.json({ error: "Не найдено" }, { status: 404 })

    let body
    try {
        body = await request.json()
    } catch {
        return Response.json({ error: "Некорректный JSON" }, { status: 400 })
    }

    const { data, error } = parseCounterpartyPayload(body, { partial: true })
    if (error) return Response.json({ error }, { status: 400 })

    const updated = await prisma.counterparty.update({
        where: { id: params.id },
        data,
    })
    return Response.json({ item: updated })
}
