import prisma from "@/lib/client"
import { requireCrmSession } from "@/lib/crm/session"
import { TENDER_DECISIONS } from "@/lib/crm/tender-map"

const TENDER_SELECT = {
    id: true,
    tenderlandId: true,
    regNumber: true,
    name: true,
    beginPrice: true,
    publishDate: true,
    endDate: true,
    biddingDate: true,
    region: true,
    typeName: true,
    tenderStatus: true,
    sourceLink: true,
    etpName: true,
    ktru: true,
    customerName: true,
    customerInn: true,
    decision: true,
    decisionAt: true,
    skipReason: true,
    importedAt: true,
    dealId: true,
    decisionBy: { select: { id: true, firstName: true, lastName: true } },
    deal: { select: { id: true, title: true, status: true } },
}

export async function GET(request) {
    const { session, response } = await requireCrmSession()
    if (!session) return response

    const { searchParams } = new URL(request.url)
    const decision = searchParams.get("decision") || "NEW"
    const search = (searchParams.get("search") || "").trim()
    const take = Math.min(Number(searchParams.get("take")) || 100, 300)

    const where = {}
    if (decision !== "ALL") {
        if (!TENDER_DECISIONS.includes(decision)) {
            return Response.json({ error: "Некорректный фильтр" }, { status: 400 })
        }
        where.decision = decision
    }
    if (search) {
        // SQLite в Prisma не поддерживает mode: "insensitive", поэтому ищем как есть:
        // номер закупки и ИНН — цифры, а название чаще копируют из карточки.
        where.OR = [
            { name: { contains: search } },
            { regNumber: { contains: search } },
            { customerName: { contains: search } },
            { customerInn: { contains: search } },
        ]
    }

    const [items, counts] = await Promise.all([
        prisma.tender.findMany({
            where,
            select: TENDER_SELECT,
            // Первым делом то, что горит: ближайший срок подачи заявок сверху,
            // закупки без срока — в конец.
            orderBy: [{ endDate: "asc" }, { importedAt: "desc" }],
            take,
        }),
        prisma.tender.groupBy({ by: ["decision"], _count: { _all: true } }),
    ])

    return Response.json({
        items,
        counts: Object.fromEntries(counts.map(c => [c.decision, c._count._all])),
    })
}
