import prisma from "@/lib/client"
import { requireCrmSession } from "@/lib/crm/session"
import { parseProductPayload } from "@/lib/crm/product"

export async function GET(request) {
    const { session, response } = await requireCrmSession()
    if (!session) return response

    const { searchParams } = new URL(request.url)
    const q = searchParams.get("q")?.trim()
    const category = searchParams.get("category")?.trim()

    const where = {}
    if (category) where.category = category
    if (q) {
        where.OR = [{ sku: { contains: q } }, { category: { contains: q } }, { name: { contains: q } }]
    }

    const [items, categories] = await Promise.all([
        prisma.product.findMany({ where, orderBy: { sku: "asc" } }),
        prisma.product.findMany({
            distinct: ["category"],
            select: { category: true },
            orderBy: { category: "asc" },
        }),
    ])
    return Response.json({
        items,
        categories: categories.map(c => c.category).filter(Boolean),
    })
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

    const { data, error } = parseProductPayload(body)
    if (error) return Response.json({ error }, { status: 400 })

    const dup = await prisma.product.findUnique({ where: { sku: data.sku } })
    if (dup) {
        return Response.json(
            { error: "Товар с таким артикулом уже существует" },
            { status: 409 },
        )
    }

    const created = await prisma.product.create({ data })
    return Response.json({ item: created }, { status: 201 })
}
