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

    // Смена/отвязка контрагента (необязательная привязка).
    let counterpartyId = existing.counterpartyId
    if (body.counterpartyId !== undefined) {
        if (body.counterpartyId === null || body.counterpartyId === "") {
            counterpartyId = null
        } else {
            const cp = await prisma.counterparty.findUnique({
                where: { id: body.counterpartyId },
                select: { id: true },
            })
            if (!cp) return Response.json({ error: "Контрагент не найден" }, { status: 400 })
            counterpartyId = cp.id
        }
        data.counterpartyId = counterpartyId
    }

    // «Основной» — только при привязке к контрагенту.
    const wantsPrimary =
        data.isPrimary !== undefined ? data.isPrimary : existing.isPrimary
    data.isPrimary = counterpartyId ? wantsPrimary : false

    const updated = await prisma.$transaction(async tx => {
        if (data.isPrimary === true && counterpartyId) {
            await tx.contact.updateMany({
                where: {
                    counterpartyId,
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
