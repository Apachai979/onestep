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

export async function POST(request, { params }) {
    const { session, response } = await requireCrmSession()
    if (!session) return response

    const project = await prisma.project.findUnique({ where: { id: params.id } })
    if (!project) return Response.json({ error: "Проект не найден" }, { status: 404 })

    let body
    try {
        body = await request.json()
    } catch {
        return Response.json({ error: "Некорректный JSON" }, { status: 400 })
    }

    const { data, error } = parseProjectItemPayload(body)
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

    const created = await prisma.$transaction(async tx => {
        const item = await tx.projectItem.create({
            data: { ...data, projectId: params.id },
        })
        await recalcTotal(tx, params.id)
        return item
    })

    return Response.json({ item: created }, { status: 201 })
}
