import prisma from "@/lib/client"
import { requireCrmSession } from "@/lib/crm/session"
import { COUNTERPARTY_TYPES, parseCounterpartyPayload } from "@/lib/crm/counterparty"

export async function GET(request) {
    const { session, response } = await requireCrmSession()
    if (!session) return response

    const { searchParams } = new URL(request.url)
    const type = searchParams.get("type")
    const q = searchParams.get("q")?.trim()
    const region = searchParams.get("region")?.trim()

    const where = {}
    if (type) {
        if (!COUNTERPARTY_TYPES.includes(type)) {
            return Response.json({ error: "Некорректный тип" }, { status: 400 })
        }
        where.type = type
    }
    if (region) where.region = { contains: region }
    if (q) {
        where.OR = [
            { name: { contains: q } },
            { inn: { contains: q } },
            { contactPerson: { contains: q } },
        ]
    }

    const items = await prisma.counterparty.findMany({
        where,
        orderBy: { name: "asc" },
        include: {
            contacts: {
                where: { isPrimary: true },
                take: 1,
                select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                    phone: true,
                    email: true,
                    position: true,
                },
            },
        },
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

    const { data, error } = parseCounterpartyPayload(body)
    if (error) return Response.json({ error }, { status: 400 })

    const created = await prisma.counterparty.create({
        data: {
            ...data,
            createdById: session.user.id ?? null,
        },
    })
    return Response.json({ item: created }, { status: 201 })
}
