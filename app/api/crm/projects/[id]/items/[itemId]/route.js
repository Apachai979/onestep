import prisma from "@/lib/client"
import { requireCrmSession } from "@/lib/crm/session"
import { parseProjectItemPayload } from "@/lib/crm/project"

async function recalcTotal(tx, projectId) {
    const items = await tx.projectItem.findMany({
        where: { projectId },
        select: { amount: true },
    })
    const total = items.reduce((s, it) => s + Number(it.amount), 0)
    await tx.project.update({
        where: { id: projectId },
        data: { totalAmount: total.toString() },
    })
}

export async function PATCH(request, { params }) {
    const { session, response } = await requireCrmSession()
    if (!session) return response

    const existing = await prisma.projectItem.findUnique({ where: { id: params.itemId } })
    if (!existing || existing.projectId !== params.id) {
        return Response.json({ error: "Позиция не найдена" }, { status: 404 })
    }

    let body
    try {
        body = await request.json()
    } catch {
        return Response.json({ error: "Некорректный JSON" }, { status: 400 })
    }

    const { data, error } = parseProjectItemPayload(body, { partial: true })
    if (error) return Response.json({ error }, { status: 400 })

    if (data.productId) {
        const exists = await prisma.product.findUnique({
            where: { id: data.productId },
            select: { id: true },
        })
        if (!exists) {
            return Response.json({ error: "Товар из справочника не найден" }, { status: 400 })
        }
    }

    const updated = await prisma.$transaction(async tx => {
        const item = await tx.projectItem.update({ where: { id: params.itemId }, data })
        await recalcTotal(tx, params.id)
        return item
    })

    return Response.json({ item: updated })
}

export async function DELETE(_request, { params }) {
    const { session, response } = await requireCrmSession()
    if (!session) return response

    const existing = await prisma.projectItem.findUnique({ where: { id: params.itemId } })
    if (!existing || existing.projectId !== params.id) {
        return Response.json({ error: "Позиция не найдена" }, { status: 404 })
    }

    await prisma.$transaction(async tx => {
        await tx.projectItem.delete({ where: { id: params.itemId } })
        await recalcTotal(tx, params.id)
    })

    return Response.json({ ok: true })
}
