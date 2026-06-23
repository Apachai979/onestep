import prisma from "@/lib/client"
import { requireCrmSession } from "@/lib/crm/session"
import { parseContactPayload } from "@/lib/crm/contact"

export async function POST(request, { params }) {
    const { session, response } = await requireCrmSession()
    if (!session) return response

    const counterparty = await prisma.counterparty.findUnique({ where: { id: params.id } })
    if (!counterparty) return Response.json({ error: "Контрагент не найден" }, { status: 404 })

    let body
    try {
        body = await request.json()
    } catch {
        return Response.json({ error: "Некорректный JSON" }, { status: 400 })
    }

    const { data, error } = parseContactPayload(body)
    if (error) return Response.json({ error }, { status: 400 })

    const created = await prisma.$transaction(async tx => {
        if (data.isPrimary) {
            await tx.contact.updateMany({
                where: { counterpartyId: params.id, isPrimary: true },
                data: { isPrimary: false },
            })
        }
        return tx.contact.create({
            data: { ...data, counterpartyId: params.id },
        })
    })

    return Response.json({ item: created }, { status: 201 })
}
