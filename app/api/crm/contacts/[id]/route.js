import prisma from "@/lib/client"
import { requireCrmSession } from "@/lib/crm/session"
import { parseContactPayload } from "@/lib/crm/contact"

export async function PATCH(request, { params }) {
    const { session, response } = await requireCrmSession()
    if (!session) return response

    const existing = await prisma.contact.findUnique({ where: { id: params.id } })
    if (!existing) return Response.json({ error: "Контакт не найден" }, { status: 404 })

    let body
    try {
        body = await request.json()
    } catch {
        return Response.json({ error: "Некорректный JSON" }, { status: 400 })
    }

    const { data, error } = parseContactPayload(body, { partial: true })
    if (error) return Response.json({ error }, { status: 400 })

    const updated = await prisma.$transaction(async tx => {
        if (data.isPrimary === true) {
            await tx.contact.updateMany({
                where: {
                    counterpartyId: existing.counterpartyId,
                    isPrimary: true,
                    NOT: { id: existing.id },
                },
                data: { isPrimary: false },
            })
        }
        return tx.contact.update({ where: { id: params.id }, data })
    })

    return Response.json({ item: updated })
}

export async function DELETE(_request, { params }) {
    const { session, response } = await requireCrmSession()
    if (!session) return response

    const existing = await prisma.contact.findUnique({ where: { id: params.id } })
    if (!existing) return Response.json({ error: "Контакт не найден" }, { status: 404 })

    await prisma.contact.delete({ where: { id: params.id } })
    return Response.json({ ok: true })
}
