import prisma from "@/lib/client"
import { requireCrmSession } from "@/lib/crm/session"
import { requireAdmin } from "@/lib/crm/admin"
import { parseProductPayload } from "@/lib/crm/product"

export async function GET(_request, { params }) {
    const { session, response } = await requireCrmSession()
    if (!session) return response

    const item = await prisma.product.findUnique({ where: { id: params.id } })
    if (!item) return Response.json({ error: "Не найдено" }, { status: 404 })
    return Response.json({ item })
}

export async function PATCH(request, { params }) {
    const { session, response } = await requireAdmin()
    if (!session) return response

    const existing = await prisma.product.findUnique({ where: { id: params.id } })
    if (!existing) return Response.json({ error: "Не найдено" }, { status: 404 })

    let body
    try {
        body = await request.json()
    } catch {
        return Response.json({ error: "Некорректный JSON" }, { status: 400 })
    }

    const { data, error } = parseProductPayload(body, { partial: true })
    if (error) return Response.json({ error }, { status: 400 })

    if (data.sku && data.sku !== existing.sku) {
        const dup = await prisma.product.findUnique({ where: { sku: data.sku } })
        if (dup) {
            return Response.json(
                { error: "Товар с таким артикулом уже существует" },
                { status: 409 },
            )
        }
    }

    const updated = await prisma.product.update({ where: { id: params.id }, data })
    return Response.json({ item: updated })
}

export async function DELETE(_request, { params }) {
    const { session, response } = await requireAdmin()
    if (!session) return response

    const existing = await prisma.product.findUnique({ where: { id: params.id } })
    if (!existing) return Response.json({ error: "Не найдено" }, { status: 404 })

    await prisma.product.delete({ where: { id: params.id } })
    return Response.json({ ok: true })
}
