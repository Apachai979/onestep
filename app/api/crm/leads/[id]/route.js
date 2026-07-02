import prisma from "@/lib/client"
import { requireCrmSession } from "@/lib/crm/session"

export async function PATCH(request, { params }) {
    const { session, response } = await requireCrmSession()
    if (!session) return response

    let body
    try {
        body = await request.json()
    } catch {
        return Response.json({ error: "Некорректный JSON" }, { status: 400 })
    }

    if (body.status !== "NEW" && body.status !== "PROCESSED") {
        return Response.json({ error: "Некорректный статус" }, { status: 400 })
    }

    const existing = await prisma.lead.findUnique({ where: { id: params.id } })
    if (!existing) {
        return Response.json({ error: "Заявка не найдена" }, { status: 404 })
    }

    const item = await prisma.lead.update({
        where: { id: params.id },
        data: {
            status: body.status,
            processedAt: body.status === "PROCESSED" ? new Date() : null,
        },
    })

    return Response.json({ item })
}

export async function DELETE(request, { params }) {
    const { session, response } = await requireCrmSession()
    if (!session) return response

    const existing = await prisma.lead.findUnique({ where: { id: params.id } })
    if (!existing) {
        return Response.json({ error: "Заявка не найдена" }, { status: 404 })
    }

    await prisma.lead.delete({ where: { id: params.id } })
    return Response.json({ ok: true })
}
